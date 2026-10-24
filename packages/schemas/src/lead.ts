import { z } from "zod";
import { Domain, FieldSources, Slug, Tier } from "./common.ts";

/**
 * A lead ready to be pushed to the sender (stage 6 QA validates every row against this).
 * Stricter than Contact on purpose: no lead leaves the system without a verified email,
 * a tier allowed to send, a passed suppression check and a recorded source per field.
 */
export const Lead = z.object({
  project_id: Slug,
  campaign_id: Slug,
  run_id: z.uuid(),
  email: z.email(),
  email_status: z.enum(["valid", "catch_all"]),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  title: z.string().min(1),
  company_name: z.string().min(1),
  company_domain: Domain,
  country: z.string().length(2).nullable(),
  segment_id: Slug,
  persona_id: Slug,
  tier: Tier,
  score: z.number().int().min(0),
  signal_keys: z.array(Slug),
  variables: z.record(z.string(), z.string()).describe("Personalization variables used by copy.md"),
  suppression_checked_at: z.iso.datetime({ offset: true }),
  field_sources: FieldSources.refine((s) => "email" in s, "field_sources.email is required"),
});
export type Lead = z.infer<typeof Lead>;
