# TAM summary: example-tam-2026q4

> Stage 2 output. Aggregates only; rows live in Postgres (`accounts.tam_id = 'example-tam-2026q4'`).

- **Built:** 2026-09-15 by jdoe, run `7f3c2a10-0000-4000-8000-000000000001`
- **ICP version:** icp.yaml approved 2026-09-12
- **Account source(s):** mock-accounts (example)

## Funnel
| Segment | TAM (matches filters) | Reachable (≥1 persona found) | Active segment (after exclusions + suppression) |
|---|---:|---:|---:|
| uk-manufacturing-mm | 2,140 | 1,610 | 1,455 |
| dach-wholesale-mm | 1,320 | 880 | 842 |
| **Total** | **3,460** | **2,490** | **2,297** |

## Sanity check (gate)
- Expected range from intake: 2k–5k accounts. **Within range.**
- Spot check: 20 random accounts reviewed; 18 clearly ICP, 2 holding companies, so `keywords_none: [holding company]` was added.
- Suppressed: 141 customers/open deals, 3 competitors, 14 do-not-contact domains.
- Decision: proceed with uk-manufacturing-mm first (client request).
