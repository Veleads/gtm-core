// gtm github setup [--apply]: prepares the project's GitHub repo for gtm.
//   1. Labels used by `gtm track` (gtm, campaign, gate, gate:*, stage:*).
//   2. A ruleset on the default branch: changes via PR, review from CODEOWNERS (the approver, for ICP
//      and copy files), and the project's `check` CI job must pass.
// Without --apply it only prints the plan. Needs a token with admin rights on the repo.
import { Stage } from "@gtm/schemas";
import { GitHubApi, GitHubError } from "../github.ts";

const LABELS: { name: string; color: string; description: string }[] = [
  { name: "gtm", color: "5319e7", description: "Managed by gtm track" },
  { name: "campaign", color: "1d76db", description: "gtm campaign tracker" },
  { name: "gate", color: "d93f0b", description: "gtm approval gate (hard stop)" },
  ...["icp", "copy", "launch"].map((g) => ({ name: `gate:${g}`, color: "d93f0b", description: `gtm ${g} gate` })),
  ...Stage.options.map((s) => ({ name: `stage:${s}`, color: "c5def5", description: `gtm stage ${s}` })),
];

export const RULESET_NAME = "gtm: approvals";

export function rulesetBody() {
  return {
    name: RULESET_NAME,
    target: "branch",
    enforcement: "active",
    conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
    rules: [
      { type: "deletion" },
      { type: "non_fast_forward" },
      {
        type: "pull_request",
        parameters: {
          required_approving_review_count: 0,
          require_code_owner_review: true,
          // Off on purpose: `gtm approve --pr` commits the approval record to the PR after the review.
          // Content after approval is guarded by the pinned hash, re-checked by `gtm validate
          // --verify-github` against the exact reviewed commit (a required CI check).
          dismiss_stale_reviews_on_push: false,
          require_last_push_approval: false,
          required_review_thread_resolution: false,
        },
      },
      { type: "required_status_checks", parameters: { strict_required_status_checks_policy: false, required_status_checks: [{ context: "check" }] } },
    ],
  };
}

export async function runGithub(root: string, args: string[], opts: { apply?: boolean; fetchImpl?: typeof fetch }): Promise<boolean> {
  if (args[0] !== "setup") { console.error("Usage: gtm github setup [--apply]"); return false; }
  const api = GitHubApi.fromRepo(root, opts.fetchImpl);
  if (typeof api === "string") { console.error(api); return false; }
  const repo = `${api.repo.owner}/${api.repo.repo}`;

  console.log(`GitHub setup for ${repo}${opts.apply ? "" : " (plan only: re-run with --apply)"}:`);
  console.log(`  • labels: ${LABELS.map((l) => l.name).join(", ")}`);
  console.log(`  • ruleset "${RULESET_NAME}" on the default branch: PR required, review from CODEOWNERS required, CI job "check" must pass, no force-push or deletion`);
  console.log("  • CODEOWNERS is maintained by `npx gtm sync` from project.yaml → owners.approver");
  if (!opts.apply) return true;

  const existing = new Set((await api.request<{ name: string }[]>("GET", "repo:/labels?per_page=100")).map((l) => l.name));
  for (const label of LABELS) {
    if (existing.has(label.name)) continue;
    await api.request("POST", "repo:/labels", label);
    console.log(`  + label ${label.name}`);
  }

  try {
    const rulesets = await api.request<{ id: number; name: string }[]>("GET", "repo:/rulesets");
    const found = rulesets.find((r) => r.name === RULESET_NAME);
    if (found) await api.request("PUT", `repo:/rulesets/${found.id}`, rulesetBody());
    else await api.request("POST", "repo:/rulesets", rulesetBody());
    console.log(`  ${found ? "~ updated" : "+ created"} ruleset "${RULESET_NAME}"`);
  } catch (e) {
    if (e instanceof GitHubError && (e.status === 403 || e.status === 404)) {
      console.error(`  ✗ could not create the ruleset (${e.status}). Rulesets on private repos need a paid GitHub plan (Team/Pro), and the token needs admin rights.`);
      console.error("    Without it GitHub still requests the approver's review via CODEOWNERS, and `gtm validate --verify-github` in CI still verifies every approval.");
      return false;
    }
    throw e;
  }
  console.log("Done. In CI, `npx gtm validate --verify-github` checks each recorded approval against GitHub.");
  return true;
}
