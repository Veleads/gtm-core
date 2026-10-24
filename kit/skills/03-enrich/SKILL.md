---
name: 03-enrich
description: Stage 3 of the gtm-brain process. Finds target personas at active accounts and runs the email waterfall (provider order from config.yaml) plus verification. Cached by input key, idempotent and capped by budget.max_total. Use when a campaign has a TAM and needs contacts with verified emails.
---

# 03 · Enrich

## Purpose
Turn active accounts into contacts with verified emails at the lowest cost, without ever paying twice.

## Inputs
- `config.yaml` → `enrichment` (waterfall order, verification provider, accepted statuses,
  `max_contacts_per_account`, `cache_ttl_days`) and `budget`
- `icp.yaml` personas for the campaign's `personas`
- `.gtm/providers/<slug>.md` for every provider in the waterfall (cost per unit, quirks)

## Steps
1. Check every provider in `email_waterfall` and `verification.provider` has a providers doc with
   verified costs. Estimate cost: contacts expected × (avg finders tried × cost) + verification.
   If the estimate exceeds `budget.max_total`, stop and present options (smaller segment, fewer
   contacts per account, cheaper order).
2. Order the waterfall cheapest-acceptable first unless the providers docs say a pricier provider
   has much better hit rates for this region/segment. Changing the order is a config change: note
   why in the run log.
3. Run a **pilot** first on a small slice (about 50 accounts) and read the counts: find rate,
   verified rate per provider, cost per verified email.
4. If the pilot looks sane, run the full job: `npx gtm job enrich <campaign>`. The job
   handles iteration, caching (`enrichments` table), and stops at the budget cap (`budget_stopped`).
5. Record per-provider counts: attempts, found, verified, cost. Record overall coverage:
   contacts found / accounts, verified emails / contacts.
6. `catch_all` is rejected unless `verification.accept` includes it. Adding it is a decision for
   the human, recorded in the run log with the reason.

## Outputs
- Rows in `contacts`, `enrichments` (raw responses), `costs`. Run log with counts and spend.

## Checklist
- [ ] Pilot run before full run, results recorded
- [ ] Spend so far vs. cap recorded
- [ ] Per-provider hit rate and cost per verified email recorded (feeds `providers/` docs via a PR to Veleads/gtm-core)
- [ ] Re-run of the same job showed ~zero new cost (cache works)
- [ ] No lead data written to git

## Gate
Coverage and cost are within plan: verified contacts are enough for the brief's volume plan, and
spend ≤ cap. If coverage < 50% of plan, stop and escalate.

## Next
`.gtm/skills/04-qualify/SKILL.md`
