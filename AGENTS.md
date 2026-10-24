# AGENTS.md: gtm-core (developing the core)

This is **gtm-core**: the reusable core of gtm-brain. It contains no project work. Each project has its
own private repo (`Veleads/gtm-project-<slug>`) that installs this core as the package `@veleads/gtm`,
pinned to an exact version. The operator manual those repos follow is `kit/AGENTS.md`. **This file is
for people and agents changing the core.**

## 1. What ships, what doesn't

| Path | Ships to project repos? | What |
|---|---|---|
| `kit/AGENTS.md` | yes → project repo `AGENTS.md` | operator manual (stages, hard stops, data rules) |
| `kit/skills/` | yes → `.gtm/skills/` | 9 stage playbooks (Agent Skills format) |
| `kit/templates/` | yes → `.gtm/templates/` (+ used by `gtm init` / `new-campaign`) | `repo/`, `project/`, `campaign/`, `outputs/` |
| `kit/providers/` | yes → `.gtm/providers/` | one doc per vendor |
| `kit/schemas/` | yes → `.gtm/schemas/` | JSON Schema, generated from `packages/schemas` |
| `packages/cli` | yes, as the `gtm` binary in `@veleads/gtm` | init, sync, validate, migrate, upgrade, status, job |
| `packages/schemas` | bundled into the CLI | Zod schemas, file versions, features, migrations |
| `packages/core` | no (used by workers) | adapter interfaces, waterfall, cost tracker |
| `workers/`, `db/` | no (deployed centrally) | Hatchet workflows, Postgres schema |
| `examples/northwind/` | no | fictional project repo used as a test fixture |

Project repos receive core only through releases.

**This repo is public (MIT).** Never commit: real project or prospect names, people, emails, project
context, run logs, negotiated vendor prices, or provider benchmarks from project work. Examples use
fictional companies and `.example` domains. `pnpm guard:public` (part of `pnpm check`) catches the
obvious cases; reviewers catch the rest. Project repos are always private.

## 2. Compatibility contract (read before changing anything)

Project repos upgrade on their own schedule, but **all of them run on the same deployed workers**. So:

1. **Project-owned YAML** (`project.yaml`, `context/icp.yaml`, `context/signals.yaml`,
   `campaigns/*/config.yaml`) has a `version:` per file kind (`packages/schemas/src/versions.ts`).
2. **Breaking change to a YAML shape** = bump that kind's version **and** add a migration in
   `packages/schemas/src/migrations.ts` with a test. `gtm migrate` applies it in project repos,
   preserving comments. Never edit a released migration.
3. **Workers accept the current and the previous version** of every file kind until the next major
   release. Job payloads carry the project repo's core version so workers can tell.
4. **New behaviour that changes outcomes** (scoring, copy rules, new channels) ships behind a feature
   flag in `packages/schemas/src/features.ts`, default off; it may become default only in a major.
5. **Playbook changes** (`kit/skills`, `kit/AGENTS.md`) reach projects on upgrade. Additive changes are
   minor; removing or reordering steps, or changing a gate, is major.
6. Project repos never edit `.gtm/` or `AGENTS.md` (CI enforces `gtm sync --check`). Project-specific
   rules belong in their `PROJECT.md`, which may only add constraints.

## 3. Versioning and releases

- Semver on `packages/cli/package.json` (`@veleads/gtm`).
  - **patch**: fixes, doc/playbook clarifications. No action in project repos.
  - **minor**: new optional features, new skills steps that add checks, new commands. No action in project repos.
  - **major**: YAML schema bumps (with migrations), gate/stage changes, dropping N-1 support.
- Every change gets an entry under `## [Unreleased]` in `CHANGELOG.md`, tagged **no action**,
  **opt-in** (feature flag), **action** (human must do something) or **migration** (`gtm migrate` handles it).
  Project upgrade PRs show these entries.
- Release: move Unreleased to `## [x.y.z] - YYYY-MM-DD`, bump the version, merge, tag `vx.y.z`.
  `.github/workflows/release.yml` checks, builds and publishes to npmjs.com via **Trusted Publishing** (OIDC, no stored
  token; provenance is automatic) after approval in the `npm` environment. Token publishing is disabled on npm.
- Project repos pick it up via their weekly `gtm-upgrade` workflow (opens a PR) or `pnpm gtm upgrade`.

## 4. Working in this repo

```bash
pnpm install
pnpm check            # typecheck + unit tests + kit schema freshness + validate examples/
pnpm gtm <command>    # run the CLI from source, e.g. pnpm gtm validate --root examples/northwind
pnpm build            # bundle @veleads/gtm (dist/ + kit/ + CHANGELOG.md)
pnpm test:e2e         # pack the CLI, init a throwaway project repo, install, sync, validate
```

- Branches `feat/…`, `fix/…`, `playbook/…`; PR to `main`; CODEOWNERS review. External PRs welcome (CONTRIBUTING.md).
- After changing `packages/schemas`, run `pnpm schemas:export` (kit/schemas is checked in CI).
- Keep `examples/northwind` valid and realistic: it is the fixture every release is tested against.
  When you add a migration, add a test that runs it on a copy of the fixture.
- Keep files small and boring. TypeScript strict, pnpm, Node ≥ 22.

## 5. Where improvements come from

Project run logs have a "Learnings → PRs" section. GTM engineers turn those into PRs here
(`playbook/<topic>` branches). A learning that only fits one project goes into that project's `PROJECT.md`.

## 6. Agent compatibility

Everything in `kit/` must work for any agent that reads files and runs shell commands (Claude Code,
Codex, others). No instructions that depend on one agent's plugins, hooks, slash commands or MCP servers.
