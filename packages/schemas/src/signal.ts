import { z } from "zod";
import { Domain, IsoDateTime, Slug } from "./common.ts";

/** One observed signal event (stage 4 input). `signal_key` must exist in signals.yaml. */
export const SignalEvent = z.object({
  client_id: Slug,
  signal_key: Slug,
  account_domain: Domain,
  contact_linkedin_url: z.string().url().nullable(),
  observed_at: IsoDateTime,
  source: z.string().min(1).describe("Provider slug or 'manual'"),
  evidence_url: z.string().url().nullable(),
  summary: z.string().max(280).describe("One line usable as personalization context"),
});
export type SignalEvent = z.infer<typeof SignalEvent>;
