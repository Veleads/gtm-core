import { z } from "zod";
import { Slug } from "./common.ts";
import { FILE_VERSIONS } from "./versions.ts";

export const SignalDefinition = z.object({
  key: Slug,
  description: z.string().min(1),
  level: z.enum(["account", "contact"]),
  source_hint: z.string().min(1).describe("Kind of source, e.g. job_postings, funding, tech_install. Not a vendor."),
  weight: z.number().int().min(0).max(100),
  freshness_days: z.number().int().positive().describe("Signal is ignored when older than this"),
  messaging_angle: z.string().min(1).describe("How copy should use this signal"),
});
export type SignalDefinition = z.infer<typeof SignalDefinition>;

/** context/signals.yaml */
export const SignalsFile = z
  .object({
    version: z.literal(FILE_VERSIONS.signals),
    client_id: Slug,
    signals: z.array(SignalDefinition).min(1),
  })
  .superRefine((f, ctx) => {
    const keys = f.signals.map((s) => s.key);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    if (dupes.length) ctx.addIssue({ code: "custom", path: ["signals"], message: `duplicate keys: ${dupes.join(", ")}` });
  });
export type SignalsFile = z.infer<typeof SignalsFile>;
