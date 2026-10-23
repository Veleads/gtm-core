import { z } from "zod";
import { IsoDate, Slug } from "./common.ts";
import { FILE_VERSIONS } from "./versions.ts";

/** client.yaml at the root of a client repo */
export const ClientFile = z.object({
  version: z.literal(FILE_VERSIONS.client),
  client_id: Slug,
  name: z.string().min(1),
  status: z.enum(["onboarding", "active", "paused", "churned"]),
  started_at: IsoDate,
  owners: z.object({
    gtm_engineer: z.string().min(1),
    sdrs: z.array(z.string().min(1)),
    client_approver: z.string().min(1).describe("Client-side person who signs off ICP and copy"),
  }),
  regions: z.array(z.string().min(2)).min(1).describe("Target regions, e.g. EU, UK, US"),
  features: z.record(z.string(), z.boolean()).default({}).describe("Opt-in core features, see FEATURES"),
});
export type ClientFile = z.infer<typeof ClientFile>;
