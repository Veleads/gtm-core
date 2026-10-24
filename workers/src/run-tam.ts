// TAM build: page accounts from the account source per ICP segment, drop exclusions, bulk-upsert into
// `accounts` (idempotent on tam + domain), and compute the funnel TAM → reachable → active.
// Pure orchestration over injected db + registry, so it runs in Hatchet or in a test the same way.
import { BudgetExceededError, CostTracker, ProviderRegistry, type RunContext } from "@gtm/core";
import type { Db } from "@gtm/db";
import { TamJobInput, type TamJobResult } from "@gtm/schemas";
import { PrismaCostSink } from "./cost-sink.ts";
import { bindProject } from "./project-binding.ts";

const CHUNK = 1000;

interface Row {
  domain: string; name: string; linkedin_url: string | null; industry: string | null; employee_count: number | null;
  revenue_usd: number | null; hq_country: string | null; technologies: string[]; reachable: boolean | null; field_sources: Record<string, string>;
}

/** One statement per chunk: INSERT … ON CONFLICT DO UPDATE. Returns how many rows were new. */
async function upsertAccounts(db: Db, ctx: RunContext, tamId: string, segmentId: string, rows: Row[]): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const json = JSON.stringify(rows.slice(i, i + CHUNK));
    const res = await db.$queryRaw<{ inserted: boolean }[]>`
      INSERT INTO accounts (campaign_id, run_id, tam_id, segment_id, domain, name, linkedin_url, industry,
                            employee_count, revenue_usd, hq_country, technologies, reachable, field_sources)
      SELECT ${ctx.campaignId}, ${ctx.runId}::uuid, ${tamId}, ${segmentId}, r.domain, r.name, r.linkedin_url,
             r.industry, r.employee_count, r.revenue_usd, r.hq_country,
             ARRAY(SELECT jsonb_array_elements_text(COALESCE(r.technologies, '[]'::jsonb))), r.reachable,
             COALESCE(r.field_sources, '{}'::jsonb)
      FROM jsonb_to_recordset(${json}::jsonb) AS r(domain text, name text, linkedin_url text, industry text,
           employee_count int, revenue_usd bigint, hq_country text, technologies jsonb, reachable boolean, field_sources jsonb)
      ON CONFLICT (tam_id, domain) DO UPDATE SET
        segment_id = EXCLUDED.segment_id, name = EXCLUDED.name, linkedin_url = EXCLUDED.linkedin_url,
        industry = EXCLUDED.industry, employee_count = EXCLUDED.employee_count, revenue_usd = EXCLUDED.revenue_usd,
        hq_country = EXCLUDED.hq_country, technologies = EXCLUDED.technologies, reachable = EXCLUDED.reachable,
        field_sources = EXCLUDED.field_sources, run_id = EXCLUDED.run_id, updated_at = now()
      RETURNING (xmax = 0) AS inserted`;
    inserted += res.filter((r) => r.inserted).length;
  }
  return inserted;
}

/** Reachable accounts of a segment that no active suppression entry covers (all campaigns or this one). */
async function countActive(db: Db, ctx: RunContext, tamId: string, segmentId: string): Promise<number> {
  const [row] = await db.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM accounts a
    WHERE a.tam_id = ${tamId} AND a.segment_id = ${segmentId} AND a.reachable IS TRUE
      AND NOT EXISTS (
        SELECT 1 FROM suppression s
        WHERE s.domain = a.domain
          AND (s.campaign_id IS NULL OR s.campaign_id = ${ctx.campaignId})
          AND (s.expires_at IS NULL OR s.expires_at > now()))`;
  return Number(row?.n ?? 0);
}

export async function runTam(db: Db, registry: ProviderRegistry, rawInput: unknown): Promise<TamJobResult> {
  const input = TamJobInput.parse(rawInput);
  const c = input.ctx;
  await bindProject(db, c.project_id);
  const run = await db.run.create({
    data: {
      campaignId: c.campaign_id, stage: "tam", job: "tam", status: "running", triggeredBy: c.triggered_by,
      gitSha: c.git_sha, configHash: c.config_hash, startedAt: new Date(),
      params: { tam_id: input.tam_id, source: input.source, segments: input.segments.map((s) => s.id), core_version: c.core_version },
    },
  });
  const ctx: RunContext = { campaignId: c.campaign_id, runId: run.id, triggeredBy: c.triggered_by };

  try {
    const source = registry.accountSource(input.source);
    const costs = await CostTracker.forCampaign(ctx, input.budget_usd, new PrismaCostSink(db));
    const startSpend = costs.spentUsd;
    const excludedDomains = new Set(input.exclusions.domains);
    const excludedIndustries = new Set(input.exclusions.industries.map((i) => i.toLowerCase()));
    const excludedCountries = new Set(input.exclusions.hq_countries);
    const reachableOf = (domain: string) => ("isReachable" in source && typeof source.isReachable === "function" ? Boolean(source.isReachable(domain)) : null);

    const segments: TamJobResult["segments"] = [];
    for (const segment of input.segments) {
      const rows: Row[] = [];
      let excluded = 0;
      let cursor: string | null = null;
      do {
        costs.reserve(source.estimateCostUsd("search"));
        const page = await source.searchAccounts(ctx, segment, cursor);
        await costs.record(page.cost);
        for (const a of page.data?.accounts ?? []) {
          if (rows.length >= input.max_accounts_per_segment) break;
          if (excludedDomains.has(a.domain) || (a.industry && excludedIndustries.has(a.industry.toLowerCase())) || (a.hq_country && excludedCountries.has(a.hq_country))) {
            excluded++;
            continue;
          }
          rows.push({ ...a, reachable: reachableOf(a.domain) });
        }
        cursor = page.data?.nextCursor ?? null;
      } while (cursor && rows.length < input.max_accounts_per_segment);

      const inserted = await upsertAccounts(db, ctx, input.tam_id, segment.id, rows);
      segments.push({
        segment_id: segment.id,
        found: rows.length + excluded,
        inserted,
        updated: rows.length - inserted,
        excluded,
        reachable: rows.filter((r) => r.reachable).length,
        active: await countActive(db, ctx, input.tam_id, segment.id),
      });
    }

    const where = { tamId: input.tam_id };
    const totals = {
      tam: await db.account.count({ where }),
      reachable: await db.account.count({ where: { ...where, reachable: true } }),
      active: segments.reduce((n, s) => n + s.active, 0),
    };
    const result: TamJobResult = { run_id: run.id, segments, totals, cost_usd: Number((costs.spentUsd - startSpend).toFixed(6)) };
    await db.run.update({ where: { id: run.id }, data: { status: "succeeded", counts: result, finishedAt: new Date() } });
    return result;
  } catch (e) {
    const status = e instanceof BudgetExceededError ? "budget_stopped" : "failed";
    await db.run.update({ where: { id: run.id }, data: { status, error: (e as Error).message, finishedAt: new Date() } });
    throw e;
  }
}
