# Changelog

All notable changes to `@veleads/gtm`. Each entry is tagged: **no action**, **opt-in**, **action**, or
**migration** (handled by `gtm migrate`). See AGENTS.md section 3.

## [Unreleased]

## [0.1.1] - 2026-10-23
- **no action** Client repo CI templates (`gtm.yml`, `gtm-upgrade.yml`) use actions/checkout@v7,
  actions/setup-node@v7, pnpm/action-setup@v6 and peter-evans/create-pull-request@v8 (Node 24 runtimes).
  Applies to repos created with `gtm init` from this version on; existing client repos can copy the
  files from `.gtm/templates/repo/github/workflows/` after upgrading.

## [0.1.0] - 2026-10-23
- **no action** First release: operator manual, 9 stage skills, templates, schemas (all file kinds at
  version 1), `gtm` CLI (`init`, `new-campaign`, `validate`, `status`, `sync`, `migrate`, `upgrade`; `job` is a Phase 2 stub).
