// Minimal GitHub REST access for the CLI: repo detection, token lookup, JSON requests.
// Uses Node's fetch (no SDK). `fetchImpl` is injectable so tests never hit the network.
import { spawnSync } from "node:child_process";

export interface RepoRef {
  owner: string;
  repo: string;
}

/** owner/repo from `git remote get-url origin` (https or ssh GitHub URLs). */
export function repoFromGit(root: string): RepoRef | null {
  const res = spawnSync("git", ["remote", "get-url", "origin"], { cwd: root, encoding: "utf8" });
  return res.status === 0 ? parseRepoUrl(res.stdout.trim()) : null;
}

export function parseRepoUrl(url: string): RepoRef | null {
  const m = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  return m ? { owner: m[1]!, repo: m[2]! } : null;
}

/** GH_TOKEN / GITHUB_TOKEN (CI), else the logged-in GitHub CLI. Never printed. */
export function githubToken(): string | null {
  const env = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (env) return env;
  const gh = spawnSync("gh", ["auth", "token"], { encoding: "utf8" });
  return gh.status === 0 && gh.stdout.trim() ? gh.stdout.trim() : null;
}

/** Strips "@" and lowercases, for comparing a project.yaml handle with a GitHub login. */
export const login = (handle: string) => handle.replace(/^@/, "").toLowerCase();

export class GitHubError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "GitHubError";
  }
}

export class GitHubApi {
  constructor(
    readonly repo: RepoRef,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  /** Resolves repo + token from the working copy and environment; null with a reason if unavailable. */
  static fromRepo(root: string, fetchImpl: typeof fetch = fetch): GitHubApi | string {
    const repo = repoFromGit(root);
    if (!repo) return "no GitHub remote: `git remote get-url origin` must point to github.com";
    const token = githubToken();
    if (!token) return "no GitHub token: run `gh auth login`, or set GH_TOKEN / GITHUB_TOKEN";
    return new GitHubApi(repo, token, fetchImpl);
  }

  /** Path relative to /repos/{owner}/{repo} when it starts with "repo:", else absolute (e.g. /user). */
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = path.startsWith("repo:")
      ? `https://api.github.com/repos/${this.repo.owner}/${this.repo.repo}${path.slice(5)}`
      : `https://api.github.com${path}`;
    const res = await this.fetchImpl(url, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new GitHubError(res.status, `GitHub ${method} ${path.replace(/^repo:/, "")}: ${res.status} ${await res.text()}`);
    return (res.status === 204 ? undefined : await res.json()) as T;
  }

  /** Blob URL for a repo file on the default branch, for links in issue bodies. */
  fileUrl(path: string): string {
    return `https://github.com/${this.repo.owner}/${this.repo.repo}/blob/HEAD/${path}`;
  }
}
