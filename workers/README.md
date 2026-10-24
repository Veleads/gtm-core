# workers/

Hatchet workers that execute gtm jobs. They wrap `packages/core` (adapters, cost tracker) and write to
Postgres through `@gtm/db`. **Available: `tam`.** Planned below.

**One database per project.** Each project runs its own stack (Postgres + Hatchet + workers), and rows
carry no `project_id`. Every job first binds the database to the payload's `project_id` (single-row
`project` table) and is refused if the database already belongs to another project.

## Run locally (local stack v0)
```bash
pnpm stack:up     # Postgres + hatchet-lite, gtm migrations, Hatchet token → ~/.gtm/stack.env
pnpm worker       # this worker, on your machine (connects using ~/.gtm/stack.env)
# in a project repo:
npx gtm job tam <campaign>
pnpm test:stack   # automated proof: two runs, idempotency, suppression, refusals
```
Hatchet UI: http://localhost:8888 (local login admin@example.com / Admin123!!).

## How a job flows
`gtm job` (in the project repo) validates, resolves config + context into the payload defined in
`packages/schemas/src/jobs.ts`, and triggers the Hatchet task. The worker validates the payload
again, records a `runs` row, does the work through adapters (cost-capped), and returns counts. Workers
never read project repos.

Jobs (one Hatchet task each):

| Workflow | Wraps | Notes |
|---|---|---|
| `tam` ✅ | `AccountSourceAdapter` (`mock-accounts` for local proofs) | paginate segments → bulk upsert `accounts`, funnel counts |
| `enrich` | `findPeople` + `runEmailWaterfall` | fan out per account, concurrency per provider rate limit, `CostTracker` cap |
| `suppression-import` | n/a | file path outside git → `suppression` rows |
| `signals` | `SignalsAdapter` | |
| `qualify` | pure code | no provider calls |
| `qa` | `Lead` schema | |
| `push` / `activate` | `SenderAdapter` | push creates PAUSED only |
| `results` | `SenderAdapter.pullEvents` | scheduled, plus on-demand |

Workers never read project repos: `gtm job` (run inside a project repo) validates the campaign and sends
the resolved config + context as the job payload, with the project repo commit and core version.
Workers accept the current and previous schema version of every file kind (see AGENTS.md section 2).

Rules: every workflow run creates a `runs` row first, passes `RunContext` everywhere, and prints
`run_id`, counts and cost on completion. `gtm job <name> <campaign>` triggers workflows and waits.

Database access goes through `@gtm/db` (Prisma). Per-row reads and writes use the typed client;
bulk idempotent writes (TAM upserts, enrichment cache, lead statuses) use `db.$executeRaw` with
`INSERT … ON CONFLICT`, one statement per batch, never a loop of single-row upserts.
