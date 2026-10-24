---
name: 00-intake
description: Stage 0 of the gtm-brain process. Sets up a new project. Captures what they sell, goals, constraints and the access checklist into context/intake.md and project.yaml. Use when a project repo is new or intake.md is incomplete.
---

# 00 · Project intake

## Purpose
Collect everything later stages need, once, in files, so no one has to re-ask the stakeholders.

## Inputs
- The business website (from `project.yaml` → `name`, or ask for the URL).
- `context/intake.md` (scaffolded by `gtm init`), the `research` skill, stakeholder answers.

## Steps
1. If the project repo does not exist yet, a GTM engineer creates it: an empty **private** repo, cloned,
   then `npx @veleads/gtm init . --name "<Name>"` inside it (keeps `.git` and README).
2. **Research first.** Run `.gtm/skills/research/SKILL.md` → `context/research.md`. Do not ask the
   human anything research can answer.
3. **Draft `context/intake.md` from research.** Fill every field you can; mark each one
   `(researched: <source>; confirm)`. Fields only stakeholders know stay `(needs you)`.
4. **Ask only the `(needs you)` fields**, as one short numbered list. For each: one plain sentence on
   what it means and why it matters, plus an example answer (use the examples in `intake.md`). Ask
   people to confirm or correct the researched fields in the same message.
5. **Owners in `project.yaml`:** GitHub handles (`@user`) for the GTM engineer, SDRs and approver.
   An approver handle makes ICP/copy sign-off a PR review that GitHub enforces; use a plain name only
   if the approver isn't on GitHub. If there is no separate SDR or approver, the same person can hold
   several roles, but **GitHub never lets someone approve a PR they opened**: with one person, either
   the agent opens PRs from another account, or record approvals by name (approver = their name).
6. Write answers as the stakeholders gave them, not your interpretation. Unknown → `unknown` and an
   open question.
7. Fill the access checklist (owner + status per row). Never write credentials into files; only
   "received / stored in secret manager".
8. Suppression inputs (customers, open deals, do-not-contact, recently contacted) are **files outside
   git**. Use research's customer list as a starting point and ask for the real lists; loading them is
   a job (`suppression:import`, AGENTS.md section 7).
9. Draft `voice.md` and `proof.md` from research and answers (proof items default to "approved for
   outbound: no" until the approver confirms).
10. If `tracker.kind` is `github`, run `npx gtm github setup` (plan) and ask the GTM engineer to run
    it with `--apply`; then `npx gtm sync` to write CODEOWNERS.
11. Run `npx gtm validate`. Template TODOs in icp/signals yaml are expected at this point.

## Outputs
- `context/research.md`; `project.yaml` (owners as GitHub handles), `context/intake.md` complete
  with every field marked researched/confirmed; draft `voice.md`, `proof.md`.
- Run log in the first campaign's `runs/` if one exists, otherwise the commit message documents it.

## Checklist
- [ ] Research done first; every researched field confirmed by a stakeholder
- [ ] Only questions research couldn't answer were asked, each with an example
- [ ] Goal and meeting definition are numbers, not adjectives
- [ ] Owners in `project.yaml` (GitHub handles where possible); approver is not the PR author
- [ ] Every access checklist row has owner + status
- [ ] Regions set (drives compliance at QA)
- [ ] No secrets, no contact lists in the repo
- [ ] Project-specific standing rules written into PROJECT.md

## Gate
Access checklist complete enough to start ICP work: suppression inputs received, sending domains
in progress, approver named. Missing items are listed as blockers with owners.

## Next
`.gtm/skills/01-icp/SKILL.md`
