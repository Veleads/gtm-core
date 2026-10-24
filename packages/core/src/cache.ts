import { createHash } from "node:crypto";

export interface CachedResponse<T = unknown> {
  data: T | null;
  raw: unknown;
  fetchedAt: string;
}

/**
 * Raw provider responses keyed by (project, provider, operation, inputKey). Backed by the
 * `enrichments` table in Phase 2. Makes every job idempotent: re-running never re-pays.
 */
export interface EnrichmentCache {
  get<T>(projectId: string, provider: string, operation: string, inputKey: string): Promise<CachedResponse<T> | null>;
  put<T>(
    projectId: string,
    provider: string,
    operation: string,
    inputKey: string,
    value: CachedResponse<T>,
    ttlDays: number,
  ): Promise<void>;
}

/** Stable key: sha256 of the input with sorted keys and normalized strings. */
export function inputKey(input: Record<string, unknown>): string {
  const normalized = Object.keys(input)
    .sort()
    .map((k) => {
      const v = input[k];
      return [k, typeof v === "string" ? v.trim().toLowerCase() : v ?? null];
    });
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}
