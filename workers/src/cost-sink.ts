import type { CostEntry, CostSink, RunContext } from "@gtm/core";
import type { Db } from "@gtm/db";

/** Persists every provider call to the `costs` table; spend per campaign feeds the budget cap. */
export class PrismaCostSink implements CostSink {
  constructor(private readonly db: Db) {}

  async record(ctx: RunContext, entry: CostEntry): Promise<void> {
    await this.db.cost.create({
      data: {
        projectId: ctx.projectId,
        campaignId: ctx.campaignId,
        runId: ctx.runId,
        provider: entry.provider,
        operation: entry.operation,
        units: entry.units,
        unitCostUsd: entry.unitCostUsd,
        totalUsd: entry.totalUsd,
        cached: entry.cached,
      },
    });
  }

  async spentForCampaign(projectId: string, campaignId: string): Promise<number> {
    const sum = await this.db.cost.aggregate({ _sum: { totalUsd: true }, where: { projectId, campaignId } });
    return Number(sum._sum.totalUsd ?? 0);
  }
}
