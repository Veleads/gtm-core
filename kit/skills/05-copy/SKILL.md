---
name: 05-copy
description: Stage 5 of the gtm-brain process. Writes the email sequence and personalization per segment × persona and signal angle in copy.md, grounded in personas, offer, approved proof and voice. Ends at a hard stop for copy sign-off by the project approver.
---

# 05 · Copy

## Purpose
Write messages the target persona would actually reply to, using only facts
the approver signed off.

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
6. **HARD STOP.** Present all variants for sign-off. Edits requested → change, re-present,
   still pending. Record the approval:
   - **GitHub approver** (`owners.approver` is `@handle`): commit the files on a branch, open a PR
     (`gh pr create`), run `npx gtm track gate-open copy <campaign> --pr <number>` and **stop**. After the
     approver approves the PR on GitHub, run `npx gtm approve copy <campaign> --pr <number>` (it verifies
     the review on GitHub), commit the recorded approval and push it to the same PR branch, merge
     once CI passes, then `npx gtm track gate-done copy <campaign>`.
   - **Named approver** (not on GitHub): present in the session; only after their explicit approval,
     `npx gtm approve copy <campaign> --by "<Name (role)>" --notes "<what was approved>"`.
   Either way, quote the approval in the run log.

## Outputs
`copy.md` (status line at top reflects the gate). Run log.

## Checklist
- [ ] Word counts within voice.md limits
- [ ] Every claim maps to an approved proof row
- [ ] Every variable exists in the qualify job output
- [ ] Opt-out line in step 1 of every variant
- [ ] No banned words from voice.md; no spam-trigger formatting (all caps, many links, images)
- [ ] Status and notes in `>` lines only, so updating them never resets the approval
- [ ] Plain-text friendly; at most one link, none in step 1 preferred

## Gate
**Copy sign-off (hard stop).** Recorded with `npx gtm approve copy <campaign>`, which pins a
hash of `copy.md`. Any later change to the copy makes `npx gtm validate` fail and blocks the campaign
past `copy` until it is re-approved (or the change is reverted). Note lines starting with `>` (status,
available variables) and whitespace-only changes do not count.

## Next
`.gtm/skills/06-qa/SKILL.md`
