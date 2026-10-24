import type { Account, IcpSegment } from "@gtm/schemas";
import type { AdapterResult, ProviderAdapter, RunContext } from "../types.ts";

export interface AccountPage {
  accounts: Omit<Account, "tam_id">[];
  nextCursor: string | null;
}

/** Stage 2: builds the TAM from icp.yaml segment filters. */
export interface AccountSourceAdapter extends ProviderAdapter {
  countAccounts(ctx: RunContext, segment: IcpSegment): Promise<AdapterResult<number>>;
  searchAccounts(ctx: RunContext, segment: IcpSegment, cursor: string | null): Promise<AdapterResult<AccountPage>>;
}
