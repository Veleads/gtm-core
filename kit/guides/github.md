# GitHub for gtm projects

How a project repo uses GitHub for **who approves** (enforced) and **what's happening** (tracked).
Git files stay the source of truth; GitHub enforces and mirrors them.

## 1. Owners and approvals
- In `project.yaml`, set owners as GitHub handles:
  ```yaml
  owners:
    gtm_engineer: "@abdullah"
    sdrs: ["@sara"]
    approver: "@maria"
  ```
- `npx gtm sync` writes a managed block in `.github/CODEOWNERS` that makes the approver the code
  owner of `context/icp.yaml`, `context/signals.yaml` and `campaigns/*/copy.md`.
- `npx gtm github setup --apply` (repo admin) creates the labels and a ruleset on the default
  branch: PR required, **review from code owners required**, CI job `check` must pass.
- Sign-off flow (ICP or copy):
  1. The agent commits the work on a branch and opens a PR (`gh pr create`), then
     `npx gtm track gate-open icp --pr <n>` (issue assigned to the approver) and stops.
  2. The approver reviews and **approves the PR on GitHub**.
  3. `npx gtm approve icp --pr <n>` checks on GitHub that the approver approved the PR's latest
     commit and that the local file equals the approved one, then records `approved_by`,
     `approved_via` (the PR) and the content hash. Commit and push that to the same PR.
  4. CI runs `npx gtm validate --verify-github`: the approver's review must still be APPROVED and the
     file at the reviewed commit must match the pinned hash. Then merge, and
     `npx gtm track gate-done icp`.
- **GitHub never lets you approve your own PR.** The approver must not be the PR author: the agent
  should push and open PRs as the GTM engineer (or a bot account), not as the approver.
- **Solo projects** (one person does everything): set `approver` to your name instead of a handle and
  record approvals with `--by`. The content hash still guards the approved content.
- **Approvers outside GitHub** (e.g. a client): same as solo, a name and `--by`.

## 2. Plans and limits
- Rulesets (enforced code-owner review) on **private** repos need GitHub Team or Pro. On GitHub Free,
  CODEOWNERS still requests the approver's review automatically, and `validate --verify-github` in CI
  still fails any approval that didn't happen on GitHub; only the merge button isn't blocked.
- CI needs `pull-requests: read` (already in `.github/workflows/gtm.yml`).

## 3. Tracking with issues
`project.yaml` → `tracker: { kind: github }` (default for new repos). Agents run:
| Command | Effect |
|---|---|
| `npx gtm track stage <campaign>` | One issue per campaign, label `stage:<stage>`, stage checklist |
| `npx gtm track gate-open icp\|copy\|launch [campaign] [--pr n]` | Sign-off issue assigned to the approver |
| `npx gtm track gate-done icp\|copy\|launch [campaign]` | Closes it, only if the files say approved |

Issues carry the `gtm` label and a hidden key, so re-running updates the same issue. **Never put lead
data in issues or comments**: counts and decisions only. `tracker: { kind: none }` switches it off.

## 4. One board for all projects (org-level GitHub Project)
1. In the organization: **Projects → New project → Board**.
2. **Settings → Workflows → Auto-add to project**: add each project repo with the filter
   `is:issue label:gtm` (repeat per repo, or add issues via `gh project item-add`).
3. Group by **Labels** (or add a single-select field "Stage" and set it from the `stage:*` label) and
   filter `label:gate is:open` for "what's waiting on whom".
4. Save views: *All campaigns by stage*, *Open gates by assignee*.

Linear or Jira: not supported as trackers yet (`tracker.kind` is `github` or `none`). Both can sync
with GitHub issues through their own GitHub integrations in the meantime.
