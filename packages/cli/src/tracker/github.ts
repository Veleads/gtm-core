import type { GitHubApi } from "../github.ts";
import type { TrackItem, TrackItemInput, TrackerAdapter } from "./types.ts";

interface Issue {
  number: number;
  html_url: string;
  body: string | null;
  state: "open" | "closed";
  labels: { name: string }[];
  pull_request?: unknown;
}

const marker = (key: string) => `<!-- gtm-key: ${key} -->`;
const BASE_LABEL = "gtm";

/** GitHub Issues tracker. Items carry the "gtm" label and a hidden key marker in the body. */
export class GitHubTracker implements TrackerAdapter {
  readonly kind = "github";
  constructor(private readonly api: GitHubApi) {}

  private async find(key: string): Promise<Issue | null> {
    for (let page = 1; page <= 10; page++) {
      const issues = await this.api.request<Issue[]>("GET", `repo:/issues?labels=${BASE_LABEL}&state=all&per_page=100&page=${page}`);
      const hit = issues.find((i) => !i.pull_request && i.body?.includes(marker(key)));
      if (hit) return hit;
      if (issues.length < 100) return null;
    }
    return null;
  }

  async upsert(item: TrackItemInput): Promise<TrackItem> {
    const body = `${item.body}\n\n${marker(item.key)}`;
    const wanted = [...new Set([BASE_LABEL, ...item.labels])];
    const existing = await this.find(item.key);
    if (!existing) {
      const created = await this.api.request<Issue>("POST", "repo:/issues", { title: item.title, body, labels: wanted, assignees: item.assignees ?? [] });
      return { key: item.key, url: created.html_url, created: true };
    }
    const exclusive = item.exclusiveLabelPrefixes ?? [];
    const kept = existing.labels.map((l) => l.name).filter((n) => !exclusive.some((p) => n.startsWith(p)) || wanted.includes(n));
    await this.api.request("PATCH", `repo:/issues/${existing.number}`, {
      title: item.title,
      body,
      state: "open",
      labels: [...new Set([...kept, ...wanted])],
      ...(item.assignees ? { assignees: item.assignees } : {}),
    });
    return { key: item.key, url: existing.html_url, created: false };
  }

  async comment(key: string, text: string): Promise<void> {
    const issue = await this.find(key);
    if (!issue) throw new Error(`no tracked issue for "${key}"`);
    await this.api.request("POST", `repo:/issues/${issue.number}/comments`, { body: text });
  }

  async close(key: string, text?: string): Promise<void> {
    const issue = await this.find(key);
    if (!issue) throw new Error(`no tracked issue for "${key}"`);
    if (text) await this.api.request("POST", `repo:/issues/${issue.number}/comments`, { body: text });
    await this.api.request("PATCH", `repo:/issues/${issue.number}`, { state: "closed", state_reason: "completed" });
  }
}
