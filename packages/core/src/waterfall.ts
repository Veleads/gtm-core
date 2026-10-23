import type { EnrichAdapter, FindEmailInput } from "./adapters/enrich.ts";
import type { Verification, VerifyAdapter } from "./adapters/verify.ts";
import { inputKey, type EnrichmentCache } from "./cache.ts";
import type { CostTracker } from "./cost.ts";
import type { RunContext } from "./types.ts";

export interface WaterfallOptions {
  /** Adapters in config.yaml enrichment.email_waterfall order. */
  finders: EnrichAdapter[];
  verifier: VerifyAdapter;
  /** config.yaml enrichment.verification.accept */
  accept: Verification["status"][];
  cache: EnrichmentCache;
  costs: CostTracker;
  cacheTtlDays: number;
}

export interface WaterfallAttempt {
  provider: string;
  email: string | null;
  status: Verification["status"] | "not_found";
  cached: boolean;
}

export interface WaterfallResult {
  email: string | null;
  status: Verification["status"] | "not_found";
  /** Provider that found the accepted email. Goes into field_sources.email. */
  source: string | null;
  attempts: WaterfallAttempt[];
}

/** Cache-first call: returns the cached response or pays for a fresh one and caches it. */
async function cachedCall<T>(
  ctx: RunContext,
  opts: WaterfallOptions,
  adapter: { slug: string; estimateCostUsd(op: string): number },
  operation: string,
  input: Record<string, unknown>,
  call: () => Promise<{ data: T | null; raw: unknown; cost: Parameters<CostTracker["record"]>[0] }>,
): Promise<{ data: T | null; cached: boolean }> {
  const key = inputKey(input);
  const hit = await opts.cache.get<T>(ctx.clientId, adapter.slug, operation, key);
  if (hit) return { data: hit.data, cached: true };

  opts.costs.reserve(adapter.estimateCostUsd(operation));
  const res = await call();
  await opts.costs.record(res.cost);
  await opts.cache.put(ctx.clientId, adapter.slug, operation, key, { data: res.data, raw: res.raw, fetchedAt: new Date().toISOString() }, opts.cacheTtlDays);
  return { data: res.data, cached: false };
}

/**
 * Email waterfall for ONE contact: try each finder in order, verify each hit, stop at the
 * first accepted status. Bulk iteration over contacts belongs to the worker, not the agent.
 */
export async function runEmailWaterfall(ctx: RunContext, input: FindEmailInput, opts: WaterfallOptions): Promise<WaterfallResult> {
  const attempts: WaterfallAttempt[] = [];

  for (const finder of opts.finders) {
    const found = await cachedCall(ctx, opts, finder, "find_email", { ...input }, () => finder.findEmail(ctx, input));
    if (!found.data) {
      attempts.push({ provider: finder.slug, email: null, status: "not_found", cached: found.cached });
      continue;
    }

    const email = found.data.email;
    const verified = await cachedCall(ctx, opts, opts.verifier, "verify", { email }, () => opts.verifier.verify(ctx, email));
    const status = verified.data?.status ?? "unknown";
    attempts.push({ provider: finder.slug, email, status, cached: found.cached });

    if (opts.accept.includes(status)) return { email, status, source: finder.slug, attempts };
  }

  const last = attempts.at(-1);
  return { email: null, status: last?.status === "not_found" || !last ? "not_found" : last.status, source: null, attempts };
}
