import { GitHubApi } from "../github.ts";
import { GitHubTracker } from "./github.ts";
import { noneTracker } from "./none.ts";
import type { TrackerAdapter } from "./types.ts";

export type { TrackerAdapter, TrackItem, TrackItemInput } from "./types.ts";

/** Builds the adapter for project.yaml → tracker.kind. Returns an error string if it can't. */
export function createTracker(kind: string, root: string, fetchImpl: typeof fetch = fetch): TrackerAdapter | string {
  if (kind === "none") return noneTracker;
  if (kind === "github") {
    const api = GitHubApi.fromRepo(root, fetchImpl);
    return typeof api === "string" ? `tracker github: ${api}` : new GitHubTracker(api);
  }
  return `unknown tracker kind "${kind}" (supported: github, none)`;
}
