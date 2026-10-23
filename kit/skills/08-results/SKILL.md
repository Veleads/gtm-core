---
name: 08-results
description: Stage 8 of the gtm-brain process. Pulls sends, replies, positives, meetings, bounces and unsubscribes from the sender per segment and variant, writes them to the run log and weekly report, feeds bounces/unsubscribes back into suppression, and turns learnings into playbook PRs. Recurring.
---

# 08 · Results

## Purpose
Know what is working by segment × variant, protect deliverability, and feed learnings back into the playbooks.

## Inputs
- `config.yaml` → `sending.sender_campaign_ref`; `brief.md` success metrics

## Steps
1. `pnpm gtm job results <campaign>`: pulls events since the last pull into `outreach_events`,
   updates lead statuses, adds bounces/unsubscribes to suppression, prints aggregates by
   segment × variant × step.
2. Health check first: bounce rate > 3% or any spam complaints → mandatory stop; recommend pausing
   and wait for the human.
3. Positive replies: confirm the job's classification by reading reply counts only; humans handle
   the actual conversations in the sender's inbox.
4. Write the run log (counts only). Weekly: `reports/<YYYY-Www>.md` from `.gtm/templates/outputs/weekly-report.md`.
5. Compare against brief metrics. Recommend changes (variant to pause, segment to expand), but
   copy changes go back through `05-copy` and its gate, and targeting changes through `01-icp`/`04-qualify`.
6. Learnings that apply beyond this client → "Learnings → PRs" in the run log, then a
   PR to Veleads/gtm-core editing the relevant skill (never edit `.gtm/` here).

## Outputs
Run log per pull; weekly report; suppression updated (DB).

## Checklist
- [ ] Bounce and complaint rates checked first
- [ ] Results by segment × variant, not just totals
- [ ] Recommendations tied to numbers
- [ ] Learnings captured as PR proposals

## Gate
None (recurring). The campaign ends when the brief's timeframe ends or the human stops it. Write a
final report and set `client.yaml` status if the engagement ends.

## Next
Next campaign: `pnpm gtm new-campaign <slug>` → routing table.
