import type { CallCost, RunContext } from "./types.ts";

export class BudgetExceededError extends Error {
  constructor(
    readonly spentUsd: number,
    readonly attemptedUsd: number,
    readonly capUsd: number,
  ) {
    super(`Budget cap $${capUsd} would be exceeded: spent $${spentUsd.toFixed(2)}, next call $${attemptedUsd.toFixed(2)}`);
    this.name = "BudgetExceededError";
  }
}

export interface CostEntry extends CallCost {
  totalUsd: number;
  cached: boolean;
  at: string;
}

/** Where cost entries are persisted (the `costs` table). Implemented in Phase 2. */
export interface CostSink {
  record(ctx: RunContext, entry: CostEntry): Promise<void>;
  /** Spend already recorded for this campaign by earlier runs. */
  spentForCampaign(campaignId: string): Promise<number>;
}

/**
 * Enforces config.yaml budget.max_total across runs. Call `reserve` before a provider call
 * (refuses if the estimate would break the cap) and `record` after it with the real cost.
 */
export class CostTracker {
  private spent: number;

  constructor(
    private readonly ctx: RunContext,
    private readonly capUsd: number,
    private readonly sink: CostSink,
    alreadySpentUsd = 0,
  ) {
    this.spent = alreadySpentUsd;
  }

  static async forCampaign(ctx: RunContext, capUsd: number, sink: CostSink): Promise<CostTracker> {
    const spent = ctx.campaignId ? await sink.spentForCampaign(ctx.campaignId) : 0;
    return new CostTracker(ctx, capUsd, sink, spent);
  }

  get spentUsd(): number {
    return this.spent;
  }

  get remainingUsd(): number {
    return Math.max(0, this.capUsd - this.spent);
  }

  reserve(estimateUsd: number): void {
    if (this.spent + estimateUsd > this.capUsd) throw new BudgetExceededError(this.spent, estimateUsd, this.capUsd);
  }

  async record(cost: CallCost, cached = false): Promise<void> {
    const totalUsd = cached ? 0 : cost.units * cost.unitCostUsd;
    this.spent += totalUsd;
    await this.sink.record(this.ctx, { ...cost, totalUsd, cached, at: new Date().toISOString() });
  }
}
