import type { EmailStatus } from "@gtm/schemas";
import type { AdapterResult, ProviderAdapter, RunContext } from "../types.ts";

export interface Verification {
  email: string;
  status: EmailStatus;
}

/** Stage 3: email verification. One provider per campaign (config.yaml enrichment.verification). */
export interface VerifyAdapter extends ProviderAdapter {
  verify(ctx: RunContext, email: string): Promise<AdapterResult<Verification>>;
}
