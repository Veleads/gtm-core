import { z } from "zod";
import { IsoDate, Slug } from "./common.ts";
import { FILE_VERSIONS } from "./versions.ts";

/** project.yaml at the root of a project repo (one repo = one project) */
export const ProjectFile = z.object({
  version: z.literal(FILE_VERSIONS.project),
  project_id: Slug,
  name: z.string().min(1),
  status: z.enum(["onboarding", "active", "paused", "closed"]),
  started_at: IsoDate,
  owners: z.object({
    gtm_engineer: z.string().min(1),
    sdrs: z.array(z.string().min(1)),
    approver: z.string().min(1).describe("Person who signs off ICP and copy for this project"),
  }),
  regions: z.array(z.string().min(2)).min(1).describe("Target regions, e.g. EU, UK, US"),
  features: z.record(z.string(), z.boolean()).default({}).describe("Opt-in core features, see FEATURES"),
});
export type ProjectFile = z.infer<typeof ProjectFile>;
