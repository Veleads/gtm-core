#!/usr/bin/env bash
# End-to-end: pack @velead/gtm, scaffold a client repo with it, install the tarball, then check that
# sync/validate/status behave like they will in a real client repo. Uses examples/northwind as content.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
PNPM=${PNPM:-pnpm}

$PNPM --filter @velead/gtm build >/dev/null
(cd "$ROOT/packages/cli" && $PNPM pack --pack-destination "$WORK" >/dev/null)
TGZ=$(ls "$WORK"/velead-gtm-*.tgz)
VERSION=$(node -p "require('$ROOT/packages/cli/package.json').version")

node "$ROOT/packages/cli/dist/cli.js" init northwind --name "Northwind Ledger" --dir "$WORK/client" >/dev/null
cd "$WORK/client"

# Resolve the pinned version from the local tarball instead of the npm registry.
node -e "
  const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));
  if (p.devDependencies['@velead/gtm']!=='$VERSION') throw new Error('init did not pin exact version');
  p.pnpm={overrides:{'@velead/gtm':'file:$TGZ'}};fs.writeFileSync('package.json',JSON.stringify(p,null,2));"
$PNPM install >/dev/null

echo "• fresh repo is in sync"
$PNPM exec gtm sync --check

echo "• fresh repo validates (TODO warnings only)"
$PNPM exec gtm validate | tail -1

echo "• fixture content validates in a real client repo"
cp -R "$ROOT/examples/northwind/." .
$PNPM exec gtm validate

echo "• hand-edited core file is caught"
echo "tampered" >> .gtm/skills/05-copy/SKILL.md
if $PNPM exec gtm sync --check >/dev/null; then echo "expected sync --check to fail"; exit 1; fi
$PNPM exec gtm sync >/dev/null && $PNPM exec gtm sync --check

echo "• status"
$PNPM exec gtm status

echo "e2e ok"
