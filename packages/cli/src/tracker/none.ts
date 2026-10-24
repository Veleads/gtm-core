import type { TrackerAdapter } from "./types.ts";

/** tracker.kind: none. Every call succeeds and does nothing. */
export const noneTracker: TrackerAdapter = {
  kind: "none",
  async upsert(item) { return { key: item.key, url: "", created: false }; },
  async comment() {},
  async close() {},
};
