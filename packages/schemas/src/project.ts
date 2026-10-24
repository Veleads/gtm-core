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
    gtm_engineer: z.string().min(1).describe("GitHub handle (@user) or name"),
    sdrs: z.array(z.string().min(1)).describe("GitHub handles (@user) or names"),
    approver: z
      .string()
      .min(1)
      .describe("Signs off ICP and copy. A GitHub handle (@user) makes approvals PR reviews enforced by GitHub; a name records them by name"),
  }),
  regions: z.array(z.string().min(2)).min(1).describe("Target regions, e.g. EU, UK, US"),
  features: z.record(z.string(), z.boolean()).default({}).describe("Opt-in core features, see FEATURES"),
  tracker: z
    .object({ kind: z.enum(["github", "none"]) })
    .default({ kind: "none" })
    .describe("Where `gtm track` mirrors stages and gates. Git files stay the source of truth"),
});
export type ProjectFile = z.infer<typeof ProjectFile>;
