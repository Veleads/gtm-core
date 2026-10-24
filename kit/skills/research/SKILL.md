---
name: research
description: Researches the business this project runs outbound for (product, pricing, positioning, public customers, competitors, buying triggers) from public sources before anyone is asked questions. Writes context/research.md with a source URL for every claim. Used first in stage 00-intake and re-run before new campaigns or when the market changes.
---

# Research: the business, its customers and competitors

## Purpose
Do the homework so stakeholders are only asked what research can't answer. Every fact is sourced,
so nothing invented reaches the ICP or the copy.

## Inputs
- The business name and website (from `project.yaml` → `name`, or ask for the URL; that is the only
  question allowed before researching).
- Existing `context/research.md` when re-running (update it; keep the history section).

## Rules
1. **Source every claim** with a URL in the same line. No source → it doesn't go in.
2. **Public information only.** No paywalled content, no logging in, no scraping behind forms.
3. **Companies, not people.** Record company names and domains. Do not collect names, emails or
   profiles of individuals (prospect data belongs in Postgres via jobs, never in git).
4. **Don't guess.** Unknown is a valid answer; mark it `unknown` and list it under open questions.
5. **Mark confidence:** `confirmed` (the business's own site says it), `likely` (credible third
   party: reviews, press), `inferred` (your reading of several sources; say why).
6. **No web access?** Ask the human for the website URL and to paste the text of the home, product,
   pricing and customers pages, then work from that and say so in the file.

## Steps
1. **The business:** home, product/solutions, pricing, customers/case studies, about, careers,
   blog/news. Capture: what they sell (one sentence), who it is for, pricing model and visible price
   points, proof points with numbers, positioning words they repeat.
2. **Public customers:** logos and case studies on their site, plus credible mentions (press,
   reviews). For each: company name, domain, industry/size if visible, source. These seed the ICP
   (what do the best customers share?) and are **suppression candidates** (don't cold-email customers).
3. **Competitors (3–5):** from "alternatives to <business>" searches, review-site categories and
   comparison pages. For each: domain, one-line positioning, pricing if public, how the business
   differs. These are **exclusion candidates** for `icp.yaml`.
4. **Market and triggers:** what makes a company buy now (hiring for X, new leader, funding,
   migration, regulation), with sources. These seed `signals.yaml`.
5. **Write `context/research.md`** from `.gtm/templates/project/research.md`.
6. **Summarise for the human** in 5 lines: what you found, the strongest ICP hint, top competitors,
   and the open questions only they can answer.

## Outputs
`context/research.md`: sourced facts, customers (suppression candidates), competitors (exclusion
candidates), triggers (signal candidates), open questions. Candidates are suggestions until a
stakeholder confirms them in intake or ICP.

## Checklist
- [ ] Every claim has a URL and a confidence mark
- [ ] No individuals' personal data
- [ ] Customers and competitors listed with domains
- [ ] Open questions listed (only what research can't answer)

## Next
Back to `.gtm/skills/00-intake/SKILL.md` (draft intake from research), or the stage that asked for a refresh.
