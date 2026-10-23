# QA report: <campaign_id> · <date> · <user>

> Stage 6 output, saved as campaigns/<campaign>/qa.md. Every box must be checked or explained.

## 1. Data
- [ ] `pnpm gtm validate <campaign>` passes
- [ ] Lead export validated against schemas `Lead`: <n> valid / <n> rejected (reasons)
- [ ] Only send_tiers present; tier counts: A <n> · B <n>
- [ ] Suppression re-checked within 24h of launch: <n> removed
- [ ] Duplicates (email, domain cap per max_contacts_per_account): <n>
- [ ] Sample of 20 leads reviewed (persona, company, signal_line makes sense): <n>/20 pass

## 2. Copy
- [ ] gates.copy approved by <name> on <date>
- [ ] Every variable used in copy.md is filled for 100% of leads
- [ ] Rendered 5 random emails; no broken variables, no placeholder text

## 3. Sending readiness
- [ ] Domains: SPF / DKIM / DMARC pass
- [ ] Inboxes: <n> connected, warmed ≥ warmup_min_days
- [ ] Volume: inboxes × daily_cap_per_inbox = <n>/day; ramp plan
- [ ] Send window and timezone set

## 4. Compliance
- [ ] Lawful basis: <basis>; LIA ref present when legitimate_interest
- [ ] Data source recorded per field (field_sources) for 100% of leads
- [ ] Opt-out line in every step 1; unsubscribes sync to suppression
- [ ] Privacy notice URL available on request

## Result
- Ready for launch gate: yes / no. Blockers:
