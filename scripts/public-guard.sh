#!/usr/bin/env bash
# This repo is public. Fail if tracked/untracked files look like they contain project or prospect data.
set -euo pipefail
cd "$(dirname "$0")/.."

files() { git ls-files -co --exclude-standard -z -- . ':!pnpm-lock.yaml' ':!kit/schemas' ':!db/migrations/meta'; }
fail=0

# 1. Data files never belong here.
if files | tr '\0' '\n' | grep -iE '\.(csv|tsv|xlsx?|parquet|jsonl|ndjson)$'; then
  echo "✗ data files above must not be committed"; fail=1
fi

# 2. Email addresses other than fictional/test ones.
emails=$(files | xargs -0 grep -hoIE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' 2>/dev/null \
  | grep -viE '@([a-z0-9-]+\.)*example(\.(com|org|net))?$|noreply@anthropic\.com$' | sort -u || true)
if [ -n "$emails" ]; then echo "✗ email addresses found:"; echo "$emails"; fail=1; fi

# 3. Example and template content uses .example domains only.
domains=$(git ls-files -co --exclude-standard -z -- examples kit/templates | xargs -0 grep -hoIE '\b[a-z0-9-]+\.(com|io|co|de|net|org|ai|uk)\b' 2>/dev/null \
  | grep -vE '^(github\.com|npmjs\.com|example\.(com|org|net))$' | sort -u || true)
if [ -n "$domains" ]; then echo "✗ real-looking domains in examples/templates (use *.example):"; echo "$domains"; fail=1; fi

[ "$fail" = 0 ] && echo "public guard ok"
exit "$fail"
