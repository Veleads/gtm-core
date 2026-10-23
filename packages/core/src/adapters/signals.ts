import type { SignalDefinition, SignalEvent } from "@gtm/schemas";
import type { AdapterResult, ProviderAdapter, RunContext } from "../types.ts";

/** Stage 4: fetches signal events for accounts. Which signals it can serve is declared up front. */
export interface SignalsAdapter extends ProviderAdapter {
  supports(definition: SignalDefinition): boolean;
  fetchSignals(
    ctx: RunContext,
    definition: SignalDefinition,
    accountDomains: string[],
  ): Promise<AdapterResult<Omit<SignalEvent, "client_id">[]>>;
}
