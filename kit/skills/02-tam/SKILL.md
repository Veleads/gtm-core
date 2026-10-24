---
name: 02-tam
description: Stage 2 of the gtm-brain process. Builds the total addressable market from the approved icp.yaml into Postgres under a tam_id and writes a funnel summary (TAM → Reachable → Active segment) to tam/<tam_id>.md. Ends with a size sanity check.
---

# 02 · TAM map

## Purpose
Know how big the market is, and whether the ICP filters are right, before spending on enrichment.

## Inputs
- Approved `context/icp.yaml` (`npx gtm validate` fails otherwise)
- `config.yaml` → `tam_id`, `segments`
- Expected TAM range from stage 1

## Steps
1. Confirm the ICP gate is approved. If not, stop and go back to `01-icp`.
2. Set `tam_id` in `config.yaml` (`<project>-tam-<YYYYqN>` or similar). Reuse an existing `tam_id`
   if the same project already has a TAM built from the same approved ICP.
3. Set `config.yaml` → `tam.source` (the account source adapter; `mock-accounts` generates fictional
   accounts to prove the pipeline, never for a real campaign) and `tam.max_accounts_per_segment`.
4. Trigger the job: `npx gtm job tam <campaign>`. It validates, sends segment filters and exclusions
   from `icp.yaml` to the workers, which page accounts through the adapter, upsert them into
   `accounts` (re-runs update, never duplicate) and print counts per segment plus a run-log row.
   **You do not page through accounts yourself.** If it says there is no Hatchet connection, run
   `npx gtm stack up` once (needs Docker). If that fails, or the job keeps waiting for a worker
   (`npx gtm stack status`), stop and tell the human (AGENTS.md section 4).
5. Funnel counts per segment (printed by the job):
   - **TAM**: accounts matching filters.
   - **Reachable**: accounts where at least one target persona can be found (from the job's
     persona count, or a sample-based estimate marked as an estimate).
   - **Active segment**: reachable minus exclusions and suppression.
6. Sanity check: compare against the expected range. Spot-check 20 random accounts in the DB console
   (name, industry, size); count how many are clearly ICP. Do not paste the rows anywhere.
7. If the spot check finds a pattern of bad matches, propose an `icp.yaml` filter change. That
   change resets the ICP gate, so present it to the human first.
8. Write `tam/<tam_id>.md` from `.gtm/templates/outputs/tam-summary.md` and the run log.

## Outputs
- Rows in `accounts` (this project's Postgres), tagged `tam_id`, `segment_id`, `run_id`.
- `tam/<tam_id>.md` with funnel table and sanity check. Run log.

## Checklist
- [ ] Counts per segment, not just a total
- [ ] Spot check done (n/20 clearly ICP) and recorded
- [ ] Suppressed counts by list recorded
- [ ] Out-of-range result explained or escalated

## Gate
Size sanity check recorded in the TAM summary, with a decision (proceed / adjust filters / pick
segment order). If the TAM is outside 0.5×–2× the expected range, the human decides.

## Next
`.gtm/skills/03-enrich/SKILL.md`
