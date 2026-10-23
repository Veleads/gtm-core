import assert from "node:assert/strict";
import { test } from "node:test";
import type { EnrichAdapter } from "./adapters/enrich.ts";
import type { VerifyAdapter } from "./adapters/verify.ts";
import type { CachedResponse, EnrichmentCache } from "./cache.ts";
import { BudgetExceededError, CostTracker, type CostEntry, type CostSink } from "./cost.ts";
import type { RunContext } from "./types.ts";
import { runEmailWaterfall } from "./waterfall.ts";

const ctx: RunContext = { clientId: "_example", campaignId: "_example", runId: "00000000-0000-4000-8000-000000000000", triggeredBy: "test" };
const input = { firstName: "Ada", lastName: "Lovelace", domain: "example.com", linkedinUrl: null };

function memoryCache(): EnrichmentCache {
  const store = new Map<string, CachedResponse>();
  return {
    async get<T>(c: string, p: string, o: string, k: string) { return (store.get([c, p, o, k].join("|")) as CachedResponse<T>) ?? null; },
    async put(c, p, o, k, v) { store.set([c, p, o, k].join("|"), v); },
  };
}

function memorySink(): CostSink & { entries: CostEntry[] } {
  const entries: CostEntry[] = [];
  return { entries, async record(_ctx, e) { entries.push(e); }, async spentForCampaign() { return 0; } };
}

function finder(slug: string, email: string | null): EnrichAdapter & { calls: number } {
  return {
    slug,
    calls: 0,
    estimateCostUsd: () => 0.1,
    async findEmail() {
      this.calls++;
      return { data: email ? { email, confidence: null } : null, raw: {}, cost: { provider: slug, operation: "find_email", units: 1, unitCostUsd: 0.1 } };
    },
  };
}

const verifier: VerifyAdapter = {
  slug: "mock-verifier",
  estimateCostUsd: () => 0.01,
  async verify(_ctx, email) {
    const status = email.startsWith("good") ? "valid" : "invalid";
    return { data: { email, status }, raw: {}, cost: { provider: "mock-verifier", operation: "verify", units: 1, unitCostUsd: 0.01 } };
  },
};

test("stops at the first verified email and records the source", async () => {
  const a = finder("mock-a", "bad@example.com");
  const b = finder("mock-b", "good@example.com");
  const c = finder("mock-c", "good2@example.com");
  const sink = memorySink();
  const res = await runEmailWaterfall(ctx, input, {
    finders: [a, b, c], verifier, accept: ["valid"], cache: memoryCache(), costs: new CostTracker(ctx, 10, sink), cacheTtlDays: 90,
  });
  assert.equal(res.email, "good@example.com");
  assert.equal(res.source, "mock-b");
  assert.equal(c.calls, 0);
  assert.equal(sink.entries.length, 4);
});

test("second run is served from cache and costs nothing", async () => {
  const a = finder("mock-a", "good@example.com");
  const cache = memoryCache();
  const sink = memorySink();
  const opts = { finders: [a], verifier, accept: ["valid" as const], cache, costs: new CostTracker(ctx, 10, sink), cacheTtlDays: 90 };
  await runEmailWaterfall(ctx, input, opts);
  await runEmailWaterfall(ctx, input, opts);
  assert.equal(a.calls, 1);
  assert.equal(sink.entries.length, 2);
});

test("refuses calls that would exceed the budget cap", async () => {
  const opts = { finders: [finder("mock-a", "good@example.com")], verifier, accept: ["valid" as const], cache: memoryCache(), costs: new CostTracker(ctx, 0.05, memorySink()), cacheTtlDays: 90 };
  await assert.rejects(runEmailWaterfall(ctx, input, opts), BudgetExceededError);
});
