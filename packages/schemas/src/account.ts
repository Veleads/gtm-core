import { z } from "zod";
import { Domain, FieldSources, Slug } from "./common.ts";

/** Normalized account as produced by an AccountSource adapter (stage 2). */
export const Account = z.object({
  client_id: Slug,
  tam_id: Slug,
  domain: Domain,
  name: z.string().min(1),
  linkedin_url: z.string().url().nullable(),
  industry: z.string().nullable(),
  employee_count: z.number().int().nonnegative().nullable(),
  revenue_usd: z.number().int().nonnegative().nullable(),
  hq_country: z.string().length(2).nullable(),
  technologies: z.array(z.string()).default([]),
  field_sources: FieldSources,
});
export type Account = z.infer<typeof Account>;
