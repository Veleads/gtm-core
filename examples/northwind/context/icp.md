# ICP: Northwind Ledger (fictional example)

> Written in stage `01-icp` from `research.md`, intake and won/lost deals. This file holds the *why*;
> `icp.yaml` holds the filters jobs use. Review the final filters with `npx gtm icp`.
> Approved by Maria Chen (VP Marketing) on 2026-09-12 (recorded in icp.yaml).

## Summary
Mid-market companies with physical supply chains whose finance team processes 1,000+ supplier invoices
a month and still keys them in manually or in a legacy ERP add-on. They buy when invoice volume grows
faster than the AP team, or when an ERP change forces a rethink.

## 1. Core profile (every segment)
| Criterion | Value | Evidence |
|---|---|---|
| Size band | 200–1,500 employees | 9 of 10 best customers fall in this band; under 150 churned |
| Not a holding company | `keywords_none: holding company` | TAM spot check: holding companies matched but never buy |
| Physical supply chain | manufacturing, wholesale, distribution | (context only: expressed per segment as industries) |
| 1,000+ supplier invoices / month | | (context only: not filterable; used in qualification calls) |

## 2. Segments

### uk-manufacturing-mm
- **Who (beyond core):** UK HQ; manufacturing industries; on Sage 200, Dynamics NAV or SAP Business One.
- **Hypothesis:** UK manufacturers on mid-market ERPs book calls because month-end close slips while
  invoices wait on approvers, and hiring more AP staff is frozen.
- **Evidence:** best win rate in closed-won history (38%); "Hartwell Components" case study.
- **Pain → value → proof:** close slips to day 9 → AP automation on top of the existing ERP, live in
  30 days → Midlands manufacturer moved close from day 9 to day 4.
- **Buyer / personas:** all (finance leader decides; AP owner champions).
- **Treatment:** English, UK legitimate interest, London send window.
- **Expected TAM range:** 1,500–3,000 companies.
- **Success criteria:** ≥ 1.5 meetings per 100 contacts after 300 contacts.

### dach-wholesale-mm
- **Who (beyond core):** HQ in DE/AT/CH; wholesale/distribution; smaller band (200–1,000).
- **Hypothesis:** DACH distributors buy faster because late-payment penalties hit margins directly.
- **Evidence:** fastest sales cycles among current customers; penalty proof pending client legal.
- **Pain → value → proof:** late-payment penalties → on-time payment runs → (proof not yet approved).
- **Buyer / personas:** all.
- **Treatment:** German copy and DACH compliance review needed → separate, later campaign.
- **Expected TAM range:** 800–1,500 companies.
- **Success criteria:** ≥ 1.0 meetings per 100 contacts after 300 contacts.

## 3. Personas
- **finance-leader (decision_maker):** CFO, Finance Director, VP Finance. Cares about close speed,
  headcount, audit risk.
- **ap-owner (champion):** Head of AP, Financial Controller, Finance Operations Manager. Cares about
  invoice backlog and approval bottlenecks. Details in `personas.md`.

## 4. Signals (why now)
Hiring AP staff (automation instead of another hire), new finance leader (stack review in first 6
months), ERP migration (fix AP instead of porting it), rapid growth. Weights in `signals.yaml`.

## 5. Exclusions
- Competitors: competitor-one/two/three.example (from `research.md`).
- Excluded industries: government, financial services, banking (different buying process).
- Existing customers and open deals: loaded as suppression lists (never written here).

## Candidates considered and dropped
| Candidate | Why dropped |
|---|---|
| UK food retail chains | Invoices handled centrally by large ERPs; no buyer in our size band |

## Decision log
- 2026-09-12: ICP approved with two segments; UK first, DACH waits for German copy.
- 2026-10-24: moved shared size band and holding-company exclusion into `core`.
