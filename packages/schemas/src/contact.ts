import { z } from "zod";
import { Domain, FieldSources, Slug } from "./common.ts";

export const EmailStatus = z.enum(["valid", "catch_all", "invalid", "unknown", "not_found"]);
export type EmailStatus = z.infer<typeof EmailStatus>;

/** Normalized contact (stage 3). */
export const Contact = z.object({
  client_id: Slug,
  account_domain: Domain,
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  title: z.string().min(1),
  seniority: z.string().nullable(),
  department: z.string().nullable(),
  linkedin_url: z.string().url().nullable(),
  country: z.string().length(2).nullable(),
  email: z.email().nullable(),
  email_status: EmailStatus,
  field_sources: FieldSources,
});
export type Contact = z.infer<typeof Contact>;
