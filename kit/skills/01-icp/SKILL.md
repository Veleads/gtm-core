---
name: 01-icp
description: Stage 1 of the gtm-brain process. Turns research, intake and deal evidence into a layered ICP: a core profile every segment shares, 1–3 segments with what differs, personas, signals and exclusions. Writes icp.md (reasoning and hypotheses), icp.yaml (filters jobs use), signals.yaml, plus personas, offer, proof and voice. Ends at a hard stop for ICP sign-off by the project approver.
---

# 01 · ICP

## Purpose
Decide who we target and why, in a form people (`icp.md`) and jobs (`icp.yaml`, `signals.yaml`) both
use. **Stage 1 ends with a decision, not certainty.** From stage 2 on, gtm-brain assumes an approved
ICP. If you're unsure between candidates, approve the best one to three as segments and let results
decide; revising the ICP later is normal (change it, re-approve, continue).

## Inputs
- `context/research.md` (public customers, competitors, triggers) and the confirmed `context/intake.md`
- Won/lost deals from the stakeholders (company names, outcome, reason). No contacts.
- Schemas: `.gtm/schemas/icp.schema.json`, `.gtm/schemas/signals.schema.json`

## The five layers

| Layer | Question | Lives in |
|---|---|---|
| 1. **Core profile** | What kind of company fits *at all*? | `icp.yaml` → `core.firmographics` |
| 2. **Segments** | Which distinct groups do we treat differently? | `icp.yaml` → `segments` (only what differs from core) |
| 3. **Personas** | Who inside them do we contact? | `icp.yaml` → `personas`; pains and language in `personas.md` |
| 4. **Signals** | Who is likely to buy *now*? | `signals.yaml` |
| 5. **Exclusions** | Who must we never target? | `icp.yaml` → `exclusions` |

The *why* (pains, value proposition, proof, hypotheses) is human text in `icp.md`; the YAML holds only
what jobs filter on.

## How core and segments combine
- A segment's final filters = **core, with every field the segment sets replacing the same core
  field.** Lists are not combined: if core says `technologies_any: [A]` and a segment says `[B]`, the
  segment uses only `[B]`.
- A segment can restrict `personas: [<ids>]`; otherwise it uses all personas.
- Exclusions apply to every segment.
- Check the result with **`npx gtm icp`**: it prints each segment's final filters and marks which fields
  the segment set. Review that output, not the raw YAML.

## Deciding core vs. segment
- **Core** = what every good-fit company has in common: usually industry family, size band, business
  model, required tech. If removing it from one segment would feel wrong, it belongs in core.
- **A new segment** is justified only when something real differs:
  - **filters** (region, sub-industry, size band, tech), and
  - usually **treatment**: a different pain/angle, buyer, proof, language, compliance or send timezone.
  A difference that changes neither filters nor treatment is not a segment.
- **Regions:** make a region its own segment when language, compliance, timezone or proof differ; it
  will usually also be its own campaign (see `02-tam`).
- **One to three segments.** More dilutes volume per segment and makes results unreadable.
- **Ids** are short and say who: `uk-recruitment-agencies`, `de-recruitment-agencies`.

## Steps
1. From `research.md` and intake, list what the **best customers share** (evidence, not guesses:
   "7 of 10 best customers use Bullhorn"). These are core candidates.
2. Group the remaining differences into **segment candidates**. For each, write in `icp.md`:
   - **Hypothesis:** who, why they'd buy now, what proves it. _"UK agencies with 10+ open roles book
     calls because hiring capacity is their bottleneck."_
   - **Evidence:** wins, research, interviews.
   - **Pain → value proposition → proof** for this segment.
   - **Success criteria:** the number that would confirm it (e.g. "≥ 1.5 meetings per 100 contacts").
3. Score candidates on paper (pain and urgency, ability to pay, reachability, market size, proof,
   right to win). Drop clear losers; keep **one to three**.
4. Write `icp.yaml`: `core.firmographics`, then `segments` with only their differences, then
   `personas` (role, `titles_any`, **`titles_none`** to block junk, seniorities, departments) and
   `exclusions` (competitor domains from research, excluded industries/countries). Any criterion that
   can't be expressed as a filter stays in `icp.md` marked "context only".
5. Write `signals.yaml`: for each signal `level`, `source_hint` (kind of source, never a vendor),
   `weight` (0–100), `freshness_days`, and a `messaging_angle` a copywriter can use in one sentence.
   Fewer and stronger is better.
6. Run **`npx gtm icp`** and check every segment's final filters read as intended.
7. Estimate the **expected TAM range per segment** (rough, from intake or research). It sets up the
   stage-2 sanity check.
8. Write `offer.md` (low-friction CTA) and finish `proof.md` / `voice.md` with the stakeholders.
9. `npx gtm validate` must pass.
10. **HARD STOP.** Present for sign-off: the `npx gtm icp` output (core + every segment's final
    filters + personas), each segment's hypothesis and success criteria, exclusions, signals with
    weights, expected TAM range. Record the approval:
    - **GitHub approver** (`owners.approver` is `@handle`): commit the files on a branch, open a PR
      (`gh pr create`), run `npx gtm track gate-open icp --pr <number>` and **stop**. After the
      approver approves the PR on GitHub, run `npx gtm approve icp --pr <number>` (it verifies
      the review on GitHub), commit the recorded approval and push it to the same PR branch, merge
      once CI passes, then `npx gtm track gate-done icp`.
    - **Named approver** (not on GitHub): present in the session; only after their explicit approval,
      `npx gtm approve icp --by "<Name (role)>" --notes "<what was approved>"`.
    Either way, quote the approval in the run log.

## Outputs
`context/icp.md` (layers, hypotheses, evidence), `icp.yaml` (core + segments + personas +
exclusions), `signals.yaml`, `personas.md`, `offer.md`, `proof.md`, `voice.md`.

## Checklist
- [ ] Core holds what every segment shares; segments hold only real differences
- [ ] Every segment has a hypothesis, evidence and success criteria in `icp.md`
- [ ] One to three segments; each differs in filters and (usually) treatment
- [ ] `npx gtm icp` output reviewed: every segment's final filters read as intended
- [ ] Each persona has `titles_none` to block obvious junk (assistant, intern, interim...)
- [ ] Each signal has a messaging angle a copywriter could use in one sentence
- [ ] Competitors (from research) and excluded industries listed
- [ ] `icp.md` and `icp.yaml` agree; non-filterable criteria marked "context only"
- [ ] Approval recorded with `gtm approve icp`, not by hand

## Gate
**ICP sign-off (hard stop).** Recorded with `npx gtm approve icp`, which pins a hash of the
approved content (core, segments, personas, exclusions). Any later change makes `npx gtm validate`
fail until the ICP is re-presented and approved again (or the change is reverted). Comments and
formatting do not count as changes. Changing how volume is split between approved segments is a
campaign decision and needs no re-approval; adding or removing a segment does.

## Next
Create a campaign (`npx gtm new-campaign <slug>`) and go to `.gtm/skills/02-tam/SKILL.md`.
