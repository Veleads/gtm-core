---
name: 00-intake
description: Stage 0 of the gtm-brain process. Sets up a new project. Captures what they sell, goals, constraints and the access checklist into context/intake.md and project.yaml. Use when a project repo is new or intake.md is incomplete.
---

# 00 · Project intake

## Purpose
Collect everything later stages need, once, in files, so no one has to re-ask the stakeholders.

## Inputs
- Kickoff call notes, sales deck, website, CRM access (provided by the human).
- `context/intake.md` (scaffolded from the core template by `gtm init`).

## Steps
1. If the project repo does not exist yet, a GTM engineer creates it: an empty **private** repo, cloned,
   then `npx @veleads/gtm init . --name "<Name>"` inside it (keeps `.git` and README).
2. Fill `project.yaml`: owners (GTM engineer, SDRs, **project approver**), regions, status `onboarding`.
3. Walk the questionnaire in `context/intake.md` with the human. For each answer, write what the
   stakeholders said, not your interpretation. Unknown → write `unknown` and add it to open questions.
4. Fill the access checklist. Each row gets an owner and a status. Never write credentials or
   API keys into the file; only "received / stored in secret manager".
5. Suppression inputs (customers, open deals, do-not-contact, recently contacted) are collected as
   **files outside git**. Note in the checklist that they were received and when; loading them is a
   job (`suppression:import`, see AGENTS.md section 7).
6. Write a first draft of `voice.md` and `proof.md` from what the stakeholders gave you (proof items
   default to "approved for outbound: no" until the approver confirms).
7. Run `npx gtm validate`. Template TODOs in icp/signals yaml are expected at this point.

## Outputs
- `project.yaml`, `context/intake.md` complete; draft `voice.md`, `proof.md`.
- Run log in the first campaign's `runs/` if one exists, otherwise the commit message documents it.

## Checklist
- [ ] Goal and meeting definition are numbers, not adjectives
- [ ] Project approver named in `project.yaml`
- [ ] Every access checklist row has owner + status
- [ ] Regions set (drives compliance at QA)
- [ ] No secrets, no contact lists in the repo
- [ ] Project-specific standing rules written into PROJECT.md

## Gate
Access checklist complete enough to start ICP work: suppression inputs received, sending domains
in progress, approver named. Missing items are listed as blockers with owners.

## Next
`.gtm/skills/01-icp/SKILL.md`
