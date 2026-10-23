# Provider: Smartlead

> Candidate for the first sender adapter (stage 7–8). **Status: UNVERIFIED.** Fill from the vendor's
> current API docs before the Phase 2 adapter is written. Do not trust numbers until "Verified on" is set.

- **Slug:** `smartlead`
- **Category:** sender
- **Adapter:** `packages/core/src/adapters/sender.ts` → `SenderAdapter` (not implemented yet)
- **Env var:** `SMARTLEAD_API_KEY`
- **Docs:** UNVERIFIED
- **Verified on:** not yet

## Endpoints used
| Operation (adapter method) | Method + path | Notes |
|---|---|---|
| createCampaign | UNVERIFIED | Must create paused / draft |
| pushLeads | UNVERIFIED | Batch size? Custom variables mapping? |
| activate | UNVERIFIED | Only after launch gate |
| pause | UNVERIFIED | |
| pullEvents | UNVERIFIED | Webhooks vs. polling; reply classification available? |

## Cost
| Operation | Unit | Cost per unit (USD) | Charged on miss? | Source |
|---|---|---:|---|---|
| Platform | seat / workspace | UNVERIFIED | n/a | |

## Limits
- Rate limit: UNVERIFIED
- Batch size: UNVERIFIED

## Quirks
- (fill during Phase 2 pilot)

## Data & compliance
- DPA signed: UNVERIFIED
