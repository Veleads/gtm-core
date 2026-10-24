---
name: 01-icp
description: Stage 1 of the gtm-brain process. Turns intake and deal evidence into icp.md (rationale), icp.yaml (machine filters consumed by scripts) and signals.yaml (signals with weight, freshness and messaging angle), plus personas, offer, proof and voice. Ends at a hard stop for ICP sign-off by the project approver.
---

# 01 · ICP research

## Purpose
Define who we target and why, in a form both humans (icp.md) and code (icp.yaml, signals.yaml) use.

## Inputs
- `context/intake.md` (especially best customers, lost deals, triggers, exclusions)
- Won/lost deal list from the stakeholders (company names, outcome, reason). No contacts.
- Schemas: `.gtm/schemas/icp.schema.json`, `.gtm/schemas/signals.schema.json`

## Steps
1. From the best-customer list, find what the winners share: industry, size band, region, tech,
   business model. Write evidence, not guesses (e.g. "7 of 10 best customers use Sage 200").
2. Define 1–3 **segments**. Each segment must be expressible as filters in `icp.yaml`
   (`industries`, `employee_count`, `hq_countries`, `technologies_any/none`, `keywords_any/none`).
   If a criterion cannot be filtered, it belongs in `icp.md` as context, not in the YAML.
3. Define **personas** with `role` (decision_maker / champion / influencer / user), `titles_any`,
   `titles_none`, seniorities, departments. Write pains and language in `personas.md`.
4. Define **signals** in `signals.yaml`: for each, `level`, `source_hint` (kind of source, never a
   vendor), `weight` (0–100), `freshness_days`, and a `messaging_angle` copy can actually use.
   Only include signals that change *who* or *how* we message; fewer and stronger is better.
5. Write `offer.md` (low-friction outbound CTA) and finish `proof.md` / `voice.md` with the stakeholders.
6. Add `exclusions`: competitor domains, excluded industries/countries.
7. Estimate expected TAM range per segment (rough, from intake or a quick count if a TAM command is
   available). This sets up the stage-2 sanity check.
8. `pnpm gtm validate` must pass.
9. **HARD STOP.** Present to the human for sign-off: segments + filters, personas, exclusions,
   signals with weights, expected TAM range. Only after explicit approval from the named approver,
   record it: `pnpm gtm approve icp --by "<Name (role)>" --notes "<what was approved>"`. Quote the
   approval in the run log and commit both together.

## Outputs
`context/icp.md`, `icp.yaml`, `signals.yaml`, `personas.md`, `offer.md`, `proof.md`, `voice.md`.

## Checklist
- [ ] Every segment criterion in icp.md is either in icp.yaml or explicitly marked "context only"
- [ ] Each persona has titles_none to block obvious junk (assistant, intern, interim...)
- [ ] Each signal has a messaging angle a copywriter could use in one sentence
- [ ] Signal weights sum to something sensible relative to campaign tier thresholds
- [ ] Competitors and excluded industries listed
- [ ] icp.md and icp.yaml agree
- [ ] Approval recorded with `gtm approve icp`, not by hand

## Gate
**ICP sign-off (hard stop).** Recorded with `pnpm gtm approve icp`, which pins a hash of the
approved content. Any later change to segments, personas, exclusions or other ICP content makes
`pnpm gtm validate` fail until the ICP is re-presented and approved again (or the change is reverted).
Comments and formatting do not count as changes.

## Next
Create a campaign (`pnpm gtm new-campaign <slug>`) and go to `.gtm/skills/02-tam/SKILL.md`.
