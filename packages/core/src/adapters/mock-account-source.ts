import { createHash } from "node:crypto";
import type { IcpSegment } from "@gtm/schemas";
import type { AdapterResult, RunContext } from "../types.ts";
import type { AccountPage, AccountSourceAdapter } from "./account-source.ts";

const PAGE_SIZE = 100;

/** Deterministic number in [0, n) from a string, so the same segment always yields the same accounts. */
function pick(seed: string, n: number): number {
  return n <= 0 ? 0 : createHash("sha256").update(seed).digest().readUInt32BE(0) % n;
}

/**
 * Fictional accounts for proving the pipeline locally: `<segment>-<n>.example` domains, firmographics
 * drawn from the segment's own filters, zero cost. Same input → same output, so re-runs are idempotent.
 */
export class MockAccountSource implements AccountSourceAdapter {
  readonly slug = "mock-accounts";
  constructor(private readonly perSegment = 120) {}

  estimateCostUsd(): number {
    return 0;
  }

  private total(segment: IcpSegment): number {
    return Math.max(1, this.perSegment - pick(`${segment.id}:total`, Math.ceil(this.perSegment / 5)));
  }

  private cost(operation: string, units: number) {
    return { provider: this.slug, operation, units, unitCostUsd: 0 };
  }

  async countAccounts(_ctx: RunContext, segment: IcpSegment): Promise<AdapterResult<number>> {
    return { data: this.total(segment), raw: { segment: segment.id }, cost: this.cost("count", 1) };
  }

  async searchAccounts(_ctx: RunContext, segment: IcpSegment, cursor: string | null): Promise<AdapterResult<AccountPage>> {
    const total = this.total(segment);
    const start = cursor ? Number(cursor) : 0;
    const end = Math.min(total, start + PAGE_SIZE);
    const f = segment.firmographics;
    const min = f.employee_count?.min ?? 50;
    const max = f.employee_count?.max ?? Math.max(min + 1, 1000);
    const accounts: AccountPage["accounts"] = [];
    for (let i = start; i < end; i++) {
      const seed = `${segment.id}:${i}`;
      const n = String(i + 1).padStart(4, "0");
      accounts.push({
        domain: `${segment.id}-${n}.example`,
        name: `Mock ${segment.id} ${n}`,
        linkedin_url: null,
        industry: f.industries.length ? f.industries[pick(`${seed}:ind`, f.industries.length)]! : null,
        employee_count: min + pick(`${seed}:emp`, max - min + 1),
        revenue_usd: null,
        hq_country: f.hq_countries.length ? f.hq_countries[pick(`${seed}:ctry`, f.hq_countries.length)]! : null,
        technologies: f.technologies_any.length ? [f.technologies_any[pick(`${seed}:tech`, f.technologies_any.length)]!] : [],
        field_sources: { "*": this.slug },
      });
    }
    return {
      data: { accounts, nextCursor: end < total ? String(end) : null },
      raw: { segment: segment.id, start, end },
      cost: this.cost("search", 1),
    };
  }

  /** Mock reachability: roughly 3 in 4 accounts have a findable persona. Real sources answer this in enrich. */
  isReachable(domain: string): boolean {
    return pick(`${domain}:reach`, 4) !== 0;
  }
}
