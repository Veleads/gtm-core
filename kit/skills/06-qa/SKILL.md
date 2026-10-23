---
name: 06-qa
description: Stage 6 of the gtm-brain process. Runs pre-launch QA. Schema validation of the lead export, a sample review, sending readiness (domains, inboxes, warmup, volume caps) and compliance (lawful basis, data source per field, opt-out). Writes campaigns/<campaign>/qa.md.
---

# 06 · QA

## Purpose
Catch every avoidable problem before a single email is sent. QA is a checklist, not a judgment call.

## Inputs
- Everything from stages 1–5; `config.yaml` (sending, compliance, gates)
- `.gtm/templates/outputs/qa-report.md`

## Steps
1. `pnpm gtm validate <campaign>` must pass.
2. `pnpm gtm job qa <campaign>`: validates every lead in send tiers against the `Lead` schema
   (`.gtm/schemas/lead.schema.json`: verified email, allowed tier, suppression checked, `field_sources.email`
   present), checks every copy variable is filled, prints counts and rejection reasons.
3. Re-run suppression if the last check is older than 24h at planned launch time.
4. Render 5 random emails from the job output in the terminal; check for broken variables or
   placeholder text. Do not save them to files.
5. Sending readiness with the human (they may need to check the sender/DNS tools):
   SPF/DKIM/DMARC pass on every domain in `sending.domains`; `sending.inboxes` connected; warmup ≥
   `warmup_min_days`; daily volume = inboxes × `daily_cap_per_inbox`; send window + timezone.
6. Compliance: lawful basis set and LIA referenced for legitimate interest; field sources present
   for 100% of leads; opt-out in every step 1; unsubscribes and bounces flow back into suppression
   (stage 8 job); privacy notice URL available.
7. Write `qa.md` from the template. Every box checked or explained. Any unexplained box = not ready.

## Outputs
`campaigns/<campaign>/qa.md`. Run log.

## Checklist
See `.gtm/templates/outputs/qa-report.md`; all four sections (data, copy, sending readiness, compliance).

## Gate
`qa.md` → "Ready for launch gate: yes" with no open blockers. Then set `stage: launch`.

## Next
`.gtm/skills/07-launch/SKILL.md`
