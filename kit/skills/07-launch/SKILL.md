---
name: 07-launch
description: Stage 7 of the gtm-brain process. Pushes QA-passed leads and the approved sequence to exactly one sender via the SenderAdapter as a PAUSED campaign, then activates only after an explicit human go/no-go. Use when qa.md says ready.
---

# 07 · Launch

## Purpose
Get the approved leads and copy into the sender safely, and start sending only on a human's go.

## Inputs
- `qa.md` (ready: yes), `config.yaml` → `sending`, `gates.copy` (approved), `copy.md`

## Steps
1. Verify: `gates.copy.status == approved`, `qa.md` ready, `pnpm gtm validate` passes. Otherwise stop.
2. `pnpm gtm job push <campaign>`: creates the sender campaign **paused**, uploads the
   sequence from `copy.md`, pushes leads in send tiers, sets the schedule from `sending`. Write the
   returned reference into `config.yaml` → `sending.sender_campaign_ref`.
3. Read the push counts: accepted vs. rejected (with reasons). Rejections > 2% → investigate first.
4. **HARD STOP: go/no-go.** Present: leads pushed by tier, daily volume and ramp, first send
   date/time, spend so far vs. cap, QA summary, sender campaign ref (paused). Ask the campaign owner
   or GTM engineer for an explicit go. Record in `config.yaml` → `gates.launch` per AGENTS.md section 4.
5. Only after approval: `pnpm gtm job activate <campaign>`. Set `stage: results`.
6. Run log: push counts, who approved, exact time activated.

## Outputs
Active sender campaign; `config.yaml` with `sender_campaign_ref`, `gates.launch` approved, `stage: results`. Run log.

## Checklist
- [ ] Exactly one sender for this campaign
- [ ] Campaign created paused; activation only after gate
- [ ] Push rejections explained
- [ ] Launch approval recorded with name, date, quote

## Gate
**Human go/no-go (hard stop).** No activation without `gates.launch.status: approved`. Adding leads
to a live campaign later requires QA on the new leads and a new launch approval note in the run log.

## Next
`.gtm/skills/08-results/SKILL.md`
