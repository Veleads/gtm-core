# Intake: __PROJECT_NAME__

> Stage 0 output. Drafted from `context/research.md` first; stakeholders only answer what research
> couldn't. Mark each field `(researched: <source>; confirm)`, `(confirmed by <who>)` or `(needs you)`.
> Write "unknown" rather than leaving blanks.

## Company
- **What they sell (one sentence):**
  _e.g. "Outbound lead generation for B2B SaaS, delivered as a managed service."_
- **Website:**
- **Deal size, sales cycle and motion:** average first-year value, days from first call to signature,
  and how deals close.
  _e.g. "~$15k/year, 30–45 days, founder-led demo then proposal."_
- **Current customers (count, typical size, industries, regions):**
- **Why outbound now:**

## Goals
- **Target and timeframe:** a number you can check later.
  _e.g. "20 qualified meetings in 60 days."_
- **What counts as a meeting:** who must attend and what makes it qualified.
  _e.g. "Head of Sales or founder at a 20–200 person SaaS company books a 30-min call."_

## Owners and regions
(Recorded in `project.yaml`, explained here.)
- **GTM engineer:** runs the agent and the jobs. _e.g. "@abdullah"_
- **SDRs:** handle replies and booked meetings. _e.g. "@sara", or "none yet"_
- **Approver:** says yes to the ICP and the copy before anything is sent. Must not be the person who
  opens the PRs (GitHub doesn't allow approving your own PR). _e.g. "@maria (co-founder)"_
- **Regions:** where prospects are; drives privacy rules (GDPR for UK/EU) and TAM filters.
  _e.g. "UK and US"_

## Questionnaire (research pre-fills what it can)
1. Best customers (up to 10, company names only). Why did each buy?
2. Last 5 lost deals. Why did each lose?
3. Who signs, who champions, who blocks? (roles, not names)
4. Top 3 competitors and how you win against each.
5. Triggers that make a prospect buy now (hiring, funding, new leader, migration...).
6. Proof you can use in outbound (case studies, numbers, logos) and what is off-limits.
7. Tone: words you love, words you hate.
8. Previous outbound: what was sent, results, which lists.
9. Anyone or anything we must never contact.

## Constraints
-

## Access checklist
| Item | Owner | Status |
|---|---|---|
| CRM export: customers + open deals (domains only) for suppression | stakeholder | |
| Do-not-contact list | stakeholder | |
| Previously contacted list (last 90 days) | stakeholder | |
| Sending domains purchased | GTM team | |
| Inboxes created + warmup started (date) | GTM team | |
| Sender workspace created | GTM team | |
| Calendar / booking link | stakeholder | |
| Lawful basis documented (LIA for EU/UK legitimate interest) | stakeholder + GTM team | |
| Privacy notice URL | stakeholder | |
| GitHub: owners added to the repo; `npx gtm github setup --apply` run | GTM team | |
