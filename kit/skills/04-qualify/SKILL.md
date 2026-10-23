---
name: 04-qualify
description: Stage 4 of the gtm-brain process. Scores contacts using config.yaml scoring and fresh signals from signals.yaml, assigns tiers A/B/C, applies suppression (customers, open deals, competitors, do-not-contact, bounces, unsubscribes, recently contacted) and builds personalization variables. Use after enrichment.
---

# 04 · Qualify

## Purpose
Decide who gets contacted, in which tier, with which angle, and make sure nobody who must not be
contacted ever reaches the sender.

## Inputs
- `config.yaml` → `scoring`, `suppression`, `segments`, `personas`
- `context/signals.yaml` (weights, freshness, messaging angles)
- Suppression lists in Postgres (loaded via `suppression:import`)

## Steps
1. Check suppression freshness: every list in `config.yaml` → `suppression.lists` must exist for
   this client and be ≤ 30 days old. If not, stop (AGENTS.md mandatory stop).
2. Fetch signals if configured: `pnpm gtm job signals <campaign>`. Only signals listed in
   `scoring.signals` count; events older than `freshness_days` are ignored by the job.
3. Run `pnpm gtm job qualify <campaign>`. Scoring (done by code, not by you):
   `score = segment_match (if account matches a campaign segment) + persona_role[role] + Σ weight of fresh signals`.
   Tier: `score ≥ tiers.A` → A; `≥ tiers.B` → B; else C.
   Suppression: contact or domain in any configured list, or contacted for this client in the last
   `recently_contacted_days` → status `suppressed` with reason.
4. The job builds personalization variables per lead (`signal_line` from the strongest fresh signal's
   messaging angle, plus basic fields). Leads without a signal get the pain-led variant.
5. Read the job's counts: by tier, by segment × persona, suppressed by reason, signal coverage.
6. Sample 20 tier-A leads in the DB console: correct persona? correct company? sensible signal?
   Record "n/20 pass" only.
7. If tiers look wrong (e.g. 70% A), adjust thresholds in `config.yaml`, re-run (cheap, no provider
   calls), and record why.

## Outputs
- `campaign_leads` rows with score, tier, segment, persona, signal keys, variables, status.
- Run log with tier counts, suppression counts by reason, sample result.

## Checklist
- [ ] Suppression lists present and fresh; counts by reason recorded
- [ ] Tier distribution recorded and explained
- [ ] Sample of 20 tier-A reviewed
- [ ] Leads in `send_tiers` are enough for the brief's volume plan

## Gate
Tier counts are sane and suppression was applied with fresh lists. Leads in send tiers ≥ planned volume.

## Next
`.gtm/skills/05-copy/SKILL.md`
