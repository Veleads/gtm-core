# Changelog

All notable changes to `@veleads/gtm`. Each entry is tagged: **no action**, **opt-in**, **action**, or
**migration** (handled by `gtm migrate`). See AGENTS.md section 3.

## [Unreleased]
- **action** ICP approvals are now pinned to the approved content. New `gtm approve icp --by "<name>"`
  records the sign-off with a `content_hash`; `gtm validate` fails if `context/icp.yaml` changes after
  approval (comments/formatting excepted) and blocks campaigns past `icp` until it is re-approved.
  Existing approvals without a hash keep working with a warning; pin them once with
  `pnpm gtm approve icp --by "<approver>" --date <original approval date>`.
- **action** Copy approvals are pinned the same way: `gtm approve copy <campaign> --by "<name>"` stores
  a hash of `copy.md` in `gates.copy`; `gtm validate` fails if the copy changes after approval and
  blocks the campaign past `copy`. Lines starting with `>` (status, notes) and whitespace-only edits
  don't count. Pin existing copy approvals once with `gtm approve copy <campaign> --by … --date …`.

## [0.1.1] - 2026-10-23
- **no action** Client repo CI templates (`gtm.yml`, `gtm-upgrade.yml`) use actions/checkout@v7,
  actions/setup-node@v7, pnpm/action-setup@v6 and peter-evans/create-pull-request@v8 (Node 24 runtimes).
  Applies to repos created with `gtm init` from this version on; existing client repos can copy the
  files from `.gtm/templates/repo/github/workflows/` after upgrading.

## [0.1.0] - 2026-10-23
- **no action** First release: operator manual, 9 stage skills, templates, schemas (all file kinds at
  version 1), `gtm` CLI (`init`, `new-campaign`, `validate`, `status`, `sync`, `migrate`, `upgrade`; `job` is a Phase 2 stub).
