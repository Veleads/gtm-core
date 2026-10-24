#!/usr/bin/env bash
# Local stack proof: Postgres + hatchet-lite + a worker on this machine, then `gtm job tam` against a
# copy of examples/northwind. Checks: job succeeds, re-run is idempotent, suppression lowers "active",
# runs/costs are recorded, and an unapproved ICP is refused. Needs Docker. Leaves the stack running.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d)
WORKER_PID=""
cleanup() { [ -n "$WORKER_PID" ] && kill "$WORKER_PID" 2>/dev/null || true; rm -rf "$WORK"; }
trap cleanup EXIT
cd "$ROOT"
Q() { docker compose exec -T postgres psql -U gtm -d gtm -tAc "$1"; }
GTM="npx tsx $ROOT/packages/cli/src/cli.ts"

echo "• stack up"
npx tsx scripts/stack.ts up >/dev/null

echo "• worker"
(cd workers && npx tsx src/main.ts > "$WORK/worker.log" 2>&1) & WORKER_PID=$!
for _ in $(seq 1 60); do grep -q "Connection established" "$WORK/worker.log" && break; sleep 1; done
grep -q "Connection established" "$WORK/worker.log" || { cat "$WORK/worker.log"; echo "worker did not connect"; exit 1; }

PROJECT="e2e-$(date +%s)"
cp -R examples/northwind "$WORK/project"
perl -pi -e "s/^project_id: northwind/project_id: $PROJECT/" "$WORK/project/project.yaml" "$WORK/project/context/icp.yaml" "$WORK/project/context/signals.yaml" "$WORK/project/campaigns/uk-mfg-hiring/config.yaml"
(cd "$WORK/project" && $GTM approve icp --by "E2E Approver (QA)" --date 2026-09-12 >/dev/null)

echo "• job tam (run 1)"
$GTM job tam uk-mfg-hiring --root "$WORK/project" > "$WORK/run1.txt"
TAM=$(grep -oE "TAM [0-9]+" "$WORK/run1.txt" | head -1 | grep -oE "[0-9]+")
[ "$TAM" -gt 0 ] || { cat "$WORK/run1.txt"; echo "expected accounts"; exit 1; }
ACTIVE1=$(grep -oE "active [0-9]+" "$WORK/run1.txt" | tail -1 | grep -oE "[0-9]+")

echo "• suppress 5 reachable domains, job tam (run 2)"
RUN1=$(Q "select id from runs where project_id='$PROJECT' order by created_at limit 1")
Q "insert into suppression (project_id, run_id, kind, domain, source) select '$PROJECT', '$RUN1', 'customers', domain, 'e2e' from accounts where project_id='$PROJECT' and reachable is true order by domain limit 5" >/dev/null
$GTM job tam uk-mfg-hiring --root "$WORK/project" > "$WORK/run2.txt"
grep -qE "^uk-manufacturing-mm +[0-9]+ +[0-9]+ +0 +$TAM " "$WORK/run2.txt" || { cat "$WORK/run2.txt"; echo "run 2 must update, not insert"; exit 1; }
ACTIVE2=$(grep -oE "active [0-9]+" "$WORK/run2.txt" | tail -1 | grep -oE "[0-9]+")
[ "$ACTIVE2" -eq $((ACTIVE1 - 5)) ] || { echo "active should drop by 5 ($ACTIVE1 → $ACTIVE2)"; exit 1; }
[ "$(Q "select count(*) from accounts where project_id='$PROJECT'")" = "$TAM" ] || { echo "duplicate accounts"; exit 1; }
[ "$(Q "select count(*) from runs where project_id='$PROJECT' and status='succeeded'")" = "2" ] || { echo "expected 2 succeeded runs"; exit 1; }
[ "$(Q "select count(*) from costs where project_id='$PROJECT'")" -gt 0 ] || { echo "expected cost rows"; exit 1; }

echo "• unapproved ICP is refused before anything runs"
perl -pi -e 's/^(\s+)status: approved/$1status: pending/' "$WORK/project/context/icp.yaml"
if $GTM job tam uk-mfg-hiring --root "$WORK/project" > "$WORK/run3.txt" 2>&1; then echo "expected refusal"; exit 1; fi
[ "$(Q "select count(*) from runs where project_id='$PROJECT'")" = "2" ] || { echo "a refused job must not create a run"; exit 1; }

echo "stack e2e ok (TAM $TAM, active $ACTIVE1 → $ACTIVE2; stack left running, \`pnpm stack:down\` to stop)"
