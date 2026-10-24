# Changelog

All notable changes to `@veleads/gtm`. Each entry is tagged: **no action**, **opt-in**, **action**, or
**migration** (handled by `gtm migrate`). See AGENTS.md section 3.

## [Unreleased]
- **opt-in** `gtm stack up | down [--wipe] | status`: each project repo runs its own stack (Postgres +
  hatchet-lite + gtm worker) on Docker, as compose project `gtm-<project_id>` with its own volumes. The
  worker is the image `ghcr.io/veleads/gtm-worker:<version>` matching the pinned core; it applies
  database migrations when it starts. Connection settings go to `~/.gtm/stacks/<project_id>.env`
  (used by `gtm job`), provider keys to `~/.gtm/stacks/<project_id>.secrets.env`; nothing is written
  into the repo. Ports are configurable (`GTM_PG_PORT`, `GTM_HATCHET_UI_PORT`, `GTM_HATCHET_GRPC_PORT`)
  and bound to localhost only. Releases now also publish the worker image. The gtm-core development
  stack (`pnpm stack:up` + `pnpm worker`) still works as a fallback for `gtm job`.
- **action** One database per project: each project repo runs its own stack (Postgres + Hatchet +
  workers) and core holds no project state. Rows no longer carry `project_id`; unique keys are now
  per database (`accounts` on `tam_id` + `domain`, `contacts` on `linkedin_url`, …). A new
  single-row `project` table binds the database to one `project_id` on the first job, and workers
  refuse jobs for any other project. The `account`, `contact`, `lead` and `signal` schemas drop
  `project_id`; `project.yaml` and job payloads keep it. DB migration
  `20261025000000_database_per_project` binds an existing single-project database automatically and
  **refuses to run on a database that holds more than one project**: give each project its own
  database (copy its rows, filtered by `project_id`) before upgrading. Point each project's
  `DATABASE_URL` at its own database.

## [0.6.0] - 2026-10-24
- **no action** Layered ICP: `context/icp.yaml` can have an optional `core.firmographics` that every
  segment shares; segments then hold only what differs, and a segment field **replaces** the same core
  field (lists are not combined). Segments may restrict `personas`. Existing ICPs are unchanged and
  stay valid. A segment that resolves to no filters at all is rejected.
- **no action** `gtm icp` shows the ICP as jobs see it: core, each segment's final filters (marking
  which fields the segment sets), personas and exclusions. `gtm job tam` uses the resolved filters.
- **no action** `01-icp` skill and `icp.md` / `icp.yaml` templates rewritten around the five layers
  (core, segments, personas, signals, exclusions) with a hypothesis, evidence and success criteria per
  segment; `research` now outputs core and segment candidates. AGENTS.md states the assumption: from
  stage 2 on the ICP is approved (stage 1 ends with a decision, revising later is normal).
- **opt-in** `gtm job tam <campaign>` is available: builds the TAM through the workers (Hatchet) into
  Postgres and prints the funnel (TAM → reachable → active), cost, run_id and a run-log row. Needs an
  approved ICP and `config.yaml` → `tam: { source, max_accounts_per_segment }`; `mock-accounts`
  generates fictional accounts to prove the pipeline locally. Re-runs update instead of duplicating;
  suppression lowers "active". Local stack: `pnpm stack:up` + `pnpm worker` in gtm-core.

## [0.5.0] - 2026-10-24
- **action** Research-first intake: new `research` skill writes `context/research.md` (sourced facts,
  public customers as suppression candidates, competitors as exclusion candidates, triggers) before any
  questions; `00-intake` drafts intake from it and asks only what research can't answer, with an
  example per question. `validate` warns while `context/research.md` is missing.
- **action** GitHub-enforced approvals: when `owners.approver` is an `@handle`, ICP and copy sign-off is
  the approver's APPROVED review on a PR. `gtm approve icp|copy … --pr <n>` verifies it on GitHub and
  records `approved_via`; `gtm validate` requires it, and `--verify-github` (in the CI template)
  re-checks the review and that the reviewed commit matches the pinned hash. `gtm sync` maintains a
  CODEOWNERS block for the approver. Named approvers keep `--by`. Existing repos: copy
  `.gtm/templates/repo/github/workflows/gtm.yml` to enable verification in CI.
- **opt-in** `gtm track` mirrors stages and gates into a tracker (`project.yaml` → `tracker.kind`:
  `github` issues, or `none`, the default for existing repos). New `gtm github setup [--apply]` creates
  labels and the approval ruleset. Guide: `.gtm/guides/github.md` (incl. an org-wide board).

## [0.4.0] - 2026-10-24
- **no action** `gtm init . --name "<Name>"` sets up the current folder instead of creating a
  subfolder (slug from the folder name, e.g. `gtm-project-acme` → `acme`, or `--slug`). Built for a
  freshly cloned repo: `.git` is kept (no `git init` inside an existing repository), `README.md` is
  kept, `.gitignore` gets gtm rules appended, `CLAUDE.md` gets `@AGENTS.md`. Any other existing gtm
  file stops init before anything is written; init never overwrites files.

## [0.3.0] - 2026-10-24
- **migration** "Clients" are now **projects**: one private repo = one project.
  `client.yaml` → `project.yaml`, `CLIENT.md` → `PROJECT.md`, `client_id` → `project_id` in every YAML
  file (all kinds now version 2), `owners.client_approver` → `owners.approver`, project status
  `churned` → `closed`. `gtm migrate` (run by `gtm upgrade`) renames the files and keys in place,
  keeping comments; existing ICP/copy approvals stay valid. New repos are named `gtm-project-<slug>`.
- **action** Approvals are recorded as name and role, e.g. `--by "Maria Chen (VP Marketing)"`.
- **action** Project repos no longer require pnpm. New repos default to npm (no `packageManager` pin),
  and every command is `npx gtm <command>`. CI and `gtm upgrade` use whichever package manager the
  repo's committed lockfile belongs to (npm, pnpm or yarn). Existing repos: copy the CI workflows from
  `.gtm/templates/repo/github/workflows/` after upgrading.

## [0.2.1] - 2026-10-24
- **no action** The npm package now has a README (what it is, quick start, commands, guidance for
  coding agents).
- **no action** `gtm <command> --help` and `gtm help <command>` print that command's usage, what it
  writes, and examples, without running it. Previously `--help` after a command ran the command.

## [0.2.0] - 2026-10-24
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
