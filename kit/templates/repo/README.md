# gtm-client-__CLIENT_ID__ · __CLIENT_NAME__

Private client repo. Runs the standard gtm-brain process from the public core package
[`@veleads/gtm`](https://www.npmjs.com/package/@veleads/gtm), pinned in
`package.json`. **Start with AGENTS.md** (generated from core; do not edit) and then CLIENT.md.

## Setup
```bash
pnpm install
cp .env.example .env
pnpm gtm status
pnpm gtm validate
```

## What lives where
| Path | Owner | Edit? |
|---|---|---|
| `AGENTS.md`, `.gtm/` | core (`gtm sync`) | never: changes go to Veleads/gtm-core |
| `CLIENT.md` | this client | yes: client-specific additions only |
| `client.yaml`, `context/`, `tam/`, `campaigns/` | this client | yes: through the stage playbooks |

## Core upgrades
A weekly workflow opens a PR when a new core is released (`.github/workflows/gtm-upgrade.yml`).
Manually: `pnpm gtm upgrade` (refuses while a campaign is between QA and launch).
