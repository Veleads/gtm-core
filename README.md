# gtm-core

**An agent-agnostic, git-versioned operating system for running outbound across many projects with
one standard process.** Built and used by [Veleads](https://github.com/Veleads). Works with Claude Code,
Codex, or any coding agent that can read files and run shell commands.

> Status: early. The process kit, schemas, validator and upgrade tooling work today. Execution jobs
> (TAM build, enrichment, sender push) are in progress; see [workers/README.md](workers/README.md).

## The idea

- **One core, many projects.** The process (stage playbooks, rules, schemas, templates, CLI) lives here
  and is published as [`@veleads/gtm`](https://www.npmjs.com/package/@veleads/gtm). Each project gets its
  own **private** repo that pins a core version and holds only that project\x27s context and campaigns.
- **Improvements reach every project without breaking them.** New core versions arrive in project repos
  as a reviewable PR: kit re-synced, project YAML migrated automatically, validation run, changelog shown.
  Live campaigns are never upgraded mid-launch.
- **Agents orchestrate, code does bulk work.** The agent follows a stage playbook, edits config,
  triggers deterministic jobs and QAs the output. It never loops over thousands of rows itself.
- **Hard human gates.** ICP sign-off, copy sign-off and launch go/no-go are enforced by the validator.
- **No lead data in git.** Repos hold context, configs and aggregate run logs; leads live in Postgres.

```
gtm-core (this repo, public) ──release──► @veleads/gtm on npm
   kit/ + CLI + schemas                         │ pinned + synced into .gtm/
   workers/ + db/ ──deploy──► Hatchet + Postgres (shared execution)
                                                ▼
                         <org>/gtm-project-<slug> (one PRIVATE repo per project)
                         AGENTS.md (generated) · PROJECT.md · project.yaml · context/ · campaigns/
```

The 9 stages: intake → ICP (gate) → TAM → enrich → qualify → copy (gate) → QA → launch (gate) → results.
Read the operator manual agents follow in project repos: [kit/AGENTS.md](kit/AGENTS.md).

## Start a project repo

```bash
npx @veleads/gtm init acme --name "Acme Corp"
cd gtm-project-acme && npm install     # or pnpm / yarn: any package manager works
npx gtm status
npx gtm validate
```

Push it to a **private** repo, open it in Claude Code or Codex, and start with stage `00-intake`.
Try `examples/northwind/` for a fictional project stopped at the copy gate.

## Develop the core

```bash
corepack enable   # or: npx pnpm@10 <command>
pnpm install
pnpm check        # typecheck + tests + validate examples + public-repo guard
pnpm test:e2e     # pack the CLI, scaffold a project repo, install, sync, validate
docker compose up -d && pnpm db:migrate   # local Postgres + hatchet-lite
```

Contributor guide: [AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md).
DB layer uses **Prisma 7** (`db/prisma/schema.prisma`, SQL migrations in `db/prisma/migrations/`, client via
the `pg` driver adapter). Bulk idempotent writes use `$executeRaw` with `INSERT … ON CONFLICT`.

## License

[MIT](LICENSE)
