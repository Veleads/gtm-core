/** Every job runs inside a RunContext. Every DB row and cost entry carries these ids. */
export interface RunContext {
  clientId: string;
  campaignId: string | null;
  runId: string;
  triggeredBy: string;
}

/** What one provider call cost. Adapters report it; they never decide whether to spend. */
export interface CallCost {
  provider: string;
  operation: string;
  units: number;
  unitCostUsd: number;
}

/** Common result envelope for every adapter call. `raw` is cached verbatim in `enrichments`. */
export interface AdapterResult<T> {
  data: T | null;
  raw: unknown;
  cost: CallCost;
}

export interface ProviderAdapter {
  /** Matches providers/<slug>.md and the slug used in config.yaml. */
  readonly slug: string;
  /** Upper-bound cost of one call, used by the cost tracker to refuse calls that would break the cap. */
  estimateCostUsd(operation: string): number;
}
