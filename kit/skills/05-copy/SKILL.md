---
name: 05-copy
description: Stage 5 of the gtm-brain process. Writes the email sequence and personalization per segment × persona and signal angle in copy.md, grounded in personas, offer, approved proof and voice. Ends at a hard stop for client copy sign-off.
---

# 05 · Copy

## Purpose
Write messages the target persona would actually reply to, using only facts
the client approved.

## Inputs
- `context/personas.md`, `offer.md`, `proof.md` (only "approved for outbound: yes"), `voice.md`
- `context/signals.yaml` → `messaging_angle`
- Qualify counts by segment × persona and signal coverage (latest run log)
- `.gtm/templates/outputs/sequence.md`

## Steps
1. Decide the matrix: one section per segment × persona that has meaningful volume (from qualify
   counts). Skip combinations with too few leads; note it.
2. Per section write at least two variants: a **signal-led** variant (uses `{{signal_line}}`) and a
   **pain-led** variant (no signal). 3 steps by default: day 0, ~day 3, ~day 8.
3. Rules: follow `voice.md` limits; one CTA (from `offer.md`); proof only from approved rows; no
   fake "Re:"/"Fwd:" subjects; opt-out line from `config.yaml` → `compliance.opt_out_text` in step 1.
4. Only use variables the qualify job fills: `{{first_name}}`, `{{company_name}}`, `{{signal_line}}`,
   `{{sender_first_name}}`, plus any listed in the run log as produced by the job. Never invent
   a variable.
5. Self-review against the checklist below, then render each step once with a fictional example
   lead (fictional name and company) for the human.
6. **HARD STOP.** Present all variants for client sign-off. Record per AGENTS.md section 4 in
   `config.yaml` → `gates.copy`. Edits requested → change, re-present, still pending.

## Outputs
`copy.md` (status line at top reflects the gate). Run log.

## Checklist
- [ ] Word counts within voice.md limits
- [ ] Every claim maps to an approved proof row
- [ ] Every variable exists in the qualify job output
- [ ] Opt-out line in step 1 of every variant
- [ ] No banned words from voice.md; no spam-trigger formatting (all caps, many links, images)
- [ ] Plain-text friendly; at most one link, none in step 1 preferred

## Gate
**Client copy sign-off (hard stop).** `gates.copy.status: approved` with name and date. Any copy
change afterwards resets it to `pending`.

## Next
`.gtm/skills/06-qa/SKILL.md`
