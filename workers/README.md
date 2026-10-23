# workers/

Hatchet workflows that wrap `packages/core`. **Empty in Phase 1.**

Planned (Phase 2+), one workflow per job in AGENTS.md section 7:

| Workflow | Wraps | Notes |
|---|---|---|
| `tam` | `AccountSourceAdapter` | paginate segments → upsert `accounts` |
| `enrich` | `findPeople` + `runEmailWaterfall` | fan out per account, concurrency per provider rate limit, `CostTracker` cap |
| `suppression-import` | n/a | file path outside git → `suppression` rows |
| `signals` | `SignalsAdapter` | |
| `qualify` | pure code | no provider calls |
| `qa` | `Lead` schema | |
| `push` / `activate` | `SenderAdapter` | push creates PAUSED only |
| `results` | `SenderAdapter.pullEvents` | scheduled, plus on-demand |

Workers never read client repos: `gtm job` (run inside a client repo) validates the campaign and sends
the resolved config + context as the job payload, with the client repo commit and core version.
Workers accept the current and previous schema version of every file kind (see AGENTS.md section 2).

Rules: every workflow run creates a `runs` row first, passes `RunContext` everywhere, and prints
`run_id`, counts and cost on completion. `gtm job <name> <campaign>` triggers workflows and waits.
