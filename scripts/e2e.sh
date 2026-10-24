#!/usr/bin/env bash
# End-to-end: pack @veleads/gtm, scaffold a project repo with it, install the tarball with npm (the
# default) and pnpm, then check that
# sync/validate/status behave like they will in a real project repo. Uses examples/northwind as content.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
PNPM=${PNPM:-pnpm}

$PNPM --filter @veleads/gtm build >/dev/null
(cd "$ROOT/packages/cli" && $PNPM pack --pack-destination "$WORK" >/dev/null)
TGZ=$(ls "$WORK"/veleads-gtm-*.tgz)
VERSION=$(node -p "require('$ROOT/packages/cli/package.json').version")

node "$ROOT/packages/cli/dist/cli.js" init northwind --name "Northwind Ledger" --dir "$WORK/project" >/dev/null
cd "$WORK/project"

# Project repos default to npm. Install the local tarball, then restore the exact-version pin that
# `gtm init` wrote (npm records a file: spec for tarballs; validate requires an exact version).
node -e "
  const p=require('./package.json');
  if (p.devDependencies['@veleads/gtm']!=='$VERSION') throw new Error('init did not pin exact version');
  if (p.packageManager) throw new Error('project repos must not pin a package manager');"
npm install --no-audit --no-fund --save-dev --save-exact "$TGZ" >/dev/null
node -e "
  const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));
  p.devDependencies['@veleads/gtm']='$VERSION';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\\n');"

echo "• fresh repo is in sync"
npx gtm sync --check

echo "• fresh repo validates (TODO warnings only)"
npx gtm validate | tail -1

echo "• fixture content validates in a real project repo"
cp -R "$ROOT/examples/northwind/." .
npx gtm validate

echo "• editing an approved ICP is caught, and re-approval clears it"
perl -pi -e 's/max: 1500/max: 2000/' context/icp.yaml
if npx gtm validate >/dev/null; then echo "expected validate to fail after ICP change"; exit 1; fi
npx gtm approve icp --by "E2E Approver (QA)" >/dev/null
npx gtm validate | tail -1

echo "• copy approval is pinned; status-line edits are fine, copy edits are caught"
npx gtm approve copy uk-mfg-hiring --by "E2E Approver (QA)" >/dev/null
perl -pi -e 's/awaiting sign-off/approved/' campaigns/uk-mfg-hiring/copy.md
npx gtm validate | tail -1
perl -pi -e 's/day 9 to day 4/day 9 to day 3/' campaigns/uk-mfg-hiring/copy.md
if npx gtm validate >/dev/null; then echo "expected validate to fail after copy change"; exit 1; fi
npx gtm approve copy uk-mfg-hiring --by "E2E Approver (QA)" >/dev/null
npx gtm validate | tail -1

echo "• hand-edited core file is caught"
echo "tampered" >> .gtm/skills/05-copy/SKILL.md
if npx gtm sync --check >/dev/null; then echo "expected sync --check to fail"; exit 1; fi
npx gtm sync >/dev/null && npx gtm sync --check

echo "• a 0.2.x repo (client.yaml, client_id, CLIENT.md) is upgraded by gtm migrate"
mv project.yaml client.yaml && mv PROJECT.md CLIENT.md
perl -pi -e 's/^version: 2$/version: 1/; s/^project_id:/client_id:/; s/^  approver:/  client_approver:/' client.yaml context/icp.yaml context/signals.yaml campaigns/*/config.yaml
if npx gtm validate >/dev/null; then echo "expected validate to fail on the 0.2.x layout"; exit 1; fi
npx gtm migrate | tail -1
test -f project.yaml && test -f PROJECT.md && test ! -f client.yaml || { echo "files were not renamed"; exit 1; }
if grep -rq "client_id\|client_approver" project.yaml context campaigns; then echo "old keys left after migrate"; exit 1; fi
npx gtm validate | tail -1

echo "• per-command help prints help and never runs the command"
out=$(npx gtm validate --help)
echo "$out" | grep -q "^Writes: Nothing" || { echo "expected validate --help to show help"; exit 1; }
if echo "$out" | grep -q "validating"; then echo "validate --help must not run validate"; exit 1; fi
test -f node_modules/@veleads/gtm/README.md || { echo "README missing from package"; exit 1; }

echo "• status"
npx gtm status

echo "• 'init .' sets up a freshly cloned repo in place without overwriting anything"
mkdir -p "$WORK/gtm-project-delta" && cd "$WORK/gtm-project-delta"
git init -q -b main && printf '# delta\n' > README.md && printf 'node_modules/\n' > .gitignore && git add -A && git -c user.email=e2e@example.com -c user.name=e2e commit -qm init
node "$ROOT/packages/cli/dist/cli.js" init . --name "Delta" >/dev/null
grep -q "^project_id: delta" project.yaml || { echo "expected slug from folder name"; exit 1; }
[ "$(head -1 README.md)" = "# delta" ] || { echo "README.md was overwritten"; exit 1; }
grep -q '^\*.csv' .gitignore || { echo "gtm rules not appended to .gitignore"; exit 1; }
[ "$(git rev-list --count HEAD)" = "1" ] || { echo "git history changed"; exit 1; }
mkdir -p "$WORK/clash" && cd "$WORK/clash" && echo keep > AGENTS.md
if node "$ROOT/packages/cli/dist/cli.js" init . --name "Clash" >/dev/null 2>&1; then echo "expected init to refuse an existing AGENTS.md"; exit 1; fi
[ "$(ls -A)" = "AGENTS.md" ] || { echo "a refused init must not write anything"; exit 1; }

echo "• pnpm-installed project repos work the same (lockfile-detected, no pin needed)"
node "$ROOT/packages/cli/dist/cli.js" init pnpmcheck --name "Pnpm Check" --dir "$WORK/pnpm-project" >/dev/null
cd "$WORK/pnpm-project"
node -e "
  const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));
  p.pnpm={overrides:{'@veleads/gtm':'file:$TGZ'}};fs.writeFileSync('package.json',JSON.stringify(p,null,2));"
$PNPM install >/dev/null 2>&1
test -f pnpm-lock.yaml || { echo "expected a pnpm lockfile"; exit 1; }
npx gtm sync --check
npx gtm validate | tail -1

echo "e2e ok"
