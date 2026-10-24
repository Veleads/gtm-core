import { z } from "zod";
import { Approval, Domain, IntRange, Slug } from "./common.ts";
import { FILE_VERSIONS } from "./versions.ts";

const Firmographics = z.object({
  industries: z.array(z.string()).default([]),
  employee_count: IntRange.optional(),
  revenue_usd: IntRange.optional(),
  hq_countries: z.array(z.string().length(2)).default([]).describe("ISO 3166-1 alpha-2"),
  technologies_any: z.array(z.string()).default([]),
  technologies_none: z.array(z.string()).default([]),
  keywords_any: z.array(z.string()).default([]),
  keywords_none: z.array(z.string()).default([]),
});

export const IcpSegment = z.object({
  id: Slug,
  description: z.string().min(1),
  firmographics: Firmographics,
});
export type IcpSegment = z.infer<typeof IcpSegment>;

export const IcpPersona = z.object({
  id: Slug,
  role: z.enum(["decision_maker", "champion", "influencer", "user"]),
  titles_any: z.array(z.string()).min(1),
  titles_none: z.array(z.string()).default([]),
  seniorities: z.array(z.enum(["c_level", "vp", "head", "director", "manager", "senior", "entry"])).default([]),
  departments: z.array(z.string()).default([]),
});
export type IcpPersona = z.infer<typeof IcpPersona>;

/** context/icp.yaml: the machine-readable ICP consumed by scripts. */
export const IcpFile = z
  .object({
    version: z.literal(FILE_VERSIONS.icp),
    project_id: Slug,
    approval: Approval,
    segments: z.array(IcpSegment).min(1),
    personas: z.array(IcpPersona).min(1),
    exclusions: z
      .object({
        domains: z.array(Domain).default([]),
        industries: z.array(z.string()).default([]),
        hq_countries: z.array(z.string().length(2)).default([]),
      })
      .default({ domains: [], industries: [], hq_countries: [] }),
  })
  .superRefine((icp, ctx) => {
    for (const [key, list] of [["segments", icp.segments], ["personas", icp.personas]] as const) {
      const ids = list.map((x) => x.id);
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
      if (dupes.length) ctx.addIssue({ code: "custom", path: [key], message: `duplicate ids: ${dupes.join(", ")}` });
    }
  });
export type IcpFile = z.infer<typeof IcpFile>;
