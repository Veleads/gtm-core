// Verifies that an approval really happened on GitHub: an APPROVED review by the approver's account.
import type { GitHubApi } from "./github.ts";
import { login } from "./github.ts";

interface Pull { number: number; html_url: string; head: { sha: string }; user: { login: string } }
interface Review { user: { login: string } | null; state: string; commit_id: string; submitted_at: string }
interface PullFile { filename: string }

export interface VerifiedApproval {
  prUrl: string;
  reviewer: string;
  /** YYYY-MM-DD of the approving review. */
  approvedAt: string;
  /** File content at the approved commit. */
  approvedContent: string;
}

/** Accepts "12", "#12" or a PR URL. */
export function prNumber(ref: string): number | null {
  const m = ref.match(/(?:^#?|\/pull\/)(\d+)\/?$/);
  return m ? Number(m[1]) : null;
}

/** The approver's latest review state on the PR (a later "changes requested" cancels an approval). */
function latestStateBy(reviews: Review[], approver: string): Review | undefined {
  return reviews.filter((r) => r.user && login(r.user.login) === login(approver) && r.state !== "COMMENTED").at(-1);
}

/**
 * For `gtm approve --pr`: the PR must change `path`, and the approver's latest review must be
 * APPROVED on the PR's head commit. Returns the approved content so the caller can pin it.
 */
export async function verifyPrApproval(api: GitHubApi, ref: string, approver: string, path: string): Promise<VerifiedApproval | string> {
  const n = prNumber(ref);
  if (!n) return `--pr must be a pull request number or URL (got "${ref}")`;
  const pr = await api.request<Pull>("GET", `repo:/pulls/${n}`);
  const files = await api.request<PullFile[]>("GET", `repo:/pulls/${n}/files?per_page=100`);
  if (!files.some((f) => f.filename === path)) return `PR #${n} does not change ${path}`;
  if (login(pr.user.login) === login(approver)) {
    return `PR #${n} was opened by ${approver}, and GitHub doesn't let authors approve their own PRs. The PR must be opened by someone else (e.g. the GTM engineer or the agent's account) and approved by ${approver}.`;
  }
  const reviews = await api.request<Review[]>("GET", `repo:/pulls/${n}/reviews?per_page=100`);
  const review = latestStateBy(reviews, approver);
  if (!review || review.state !== "APPROVED") return `${approver} has not approved PR #${n} (latest review: ${review?.state ?? "none"})`;
  if (review.commit_id !== pr.head.sha) return `${approver} approved an older commit of PR #${n}; the PR changed since. Ask for a fresh approval.`;
  const file = await api.request<{ content: string; encoding: string }>("GET", `repo:/contents/${path}?ref=${pr.head.sha}`);
  return {
    prUrl: pr.html_url,
    reviewer: `@${review.user!.login}`,
    approvedAt: review.submitted_at.slice(0, 10),
    approvedContent: Buffer.from(file.content, file.encoding as BufferEncoding).toString("utf8"),
  };
}

/**
 * For `gtm validate --verify-github`: the recorded PR still carries the approver's APPROVED review,
 * and the file at the exact reviewed commit has the pinned content hash (so nothing that changes
 * content can slip in after the review).
 */
export async function verifyRecordedApproval(
  api: GitHubApi,
  prUrl: string,
  approver: string,
  path: string,
  pinnedHash: string | undefined,
  hashOf: (content: string) => string,
): Promise<true | string> {
  const n = prNumber(prUrl);
  if (!n) return `approved_via is not a pull request URL: ${prUrl}`;
  if (!prUrl.includes(`/${api.repo.owner}/${api.repo.repo}/pull/`)) return `approved_via points to another repository: ${prUrl}`;
  const reviews = await api.request<Review[]>("GET", `repo:/pulls/${n}/reviews?per_page=100`);
  const review = latestStateBy(reviews, approver);
  if (review?.state !== "APPROVED") return `${approver}'s latest review on PR #${n} is ${review?.state ?? "missing"}, not APPROVED`;
  const file = await api.request<{ content: string; encoding: string }>("GET", `repo:/contents/${path}?ref=${review.commit_id}`);
  const reviewed = hashOf(Buffer.from(file.content, file.encoding as BufferEncoding).toString("utf8"));
  return reviewed === pinnedHash ? true : `${path} at the commit ${approver} approved (${review.commit_id.slice(0, 7)}) has content ${reviewed}, but ${pinnedHash ?? "no hash"} is pinned`;
}
