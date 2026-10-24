# gtm-project-__PROJECT_ID__ · __PROJECT_NAME__

Private project repo. Runs the standard gtm-brain process from the public core package
[`@veleads/gtm`](https://www.npmjs.com/package/@veleads/gtm), pinned in
`package.json`. **Start with AGENTS.md** (generated from core; do not edit) and then PROJECT.md.

## Setup
```bash
npm install          # or: pnpm install / yarn install
cp .env.example .env
npx gtm status
npx gtm validate
```

## What lives where
| Path | Owner | Edit? |
|---|---|---|
| `AGENTS.md`, `.gtm/` | core (`gtm sync`) | never: changes go to Veleads/gtm-core |
| `PROJECT.md` | this project | yes: project-specific additions only |
| `project.yaml`, `context/`, `tam/`, `campaigns/` | this project | yes: through the stage playbooks |

## Core upgrades
A weekly workflow opens a PR when a new core is released (`.github/workflows/gtm-upgrade.yml`).
Manually: `npx gtm upgrade` (refuses while a campaign is between QA and launch).

## GitHub
Approvals and tracking run through GitHub: see `.gtm/guides/github.md` (owners as `@handles`,
`npx gtm github setup --apply`, PR-based sign-off, the org-wide board).
