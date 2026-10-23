# Provider: <name>

> One file per vendor, named `providers/<slug>.md`. The slug is what config.yaml uses.
> Every number here must have a source and a "verified on" date. Unverified = write UNVERIFIED.
> This file is public (it ships in the open-source core): **list prices and public docs only**.
> Negotiated prices and hit rates measured on client work stay in the private ops notes / Postgres.

- **Slug:** `<slug>`
- **Category:** account_source | enrich | verify | signals | sender
- **Adapter:** `packages/core/src/adapters/<category>.ts` → implementation path (Phase 2+)
- **Env var:** `<SLUG>_API_KEY`
- **Docs:** <url>
- **Verified on:** <YYYY-MM-DD> by <user>

## Endpoints used
| Operation (adapter method) | Method + path | Notes |
|---|---|---|

## Cost
| Operation | Unit | Public list price (USD) | Charged on miss? | Source |
|---|---|---:|---|---|

## Limits
- Rate limit:
- Batch size:
- Async / webhook behaviour:

## Quirks
- (e.g. returns catch-all as valid; needs domain not URL; charges for duplicates within 30 days)

## Data & compliance
- Data source / how they collect it:
- DPA signed: yes/no, link
- Region of processing:
