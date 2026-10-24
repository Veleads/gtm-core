import { z } from "zod";
import { Approval, Domain, IntRange, Slug } from "./common.ts";
import { FILE_VERSIONS } from "./versions.ts";

/**
 * Firmographic/technographic filters as written in icp.yaml: only the fields given. `core` and each
 * segment use this shape; a segment field REPLACES the same core field (lists are not combined).
 */
export const FirmographicFilters = z.object({
  industries: z.array(z.string()).optional(),
  employee_count: IntRange.optional(),
  revenue_usd: IntRange.optional(),
  hq_countries: z.array(z.string().length(2)).optional().describe("ISO 3166-1 alpha-2"),
  technologies_any: z.array(z.string()).optional(),
  technologies_none: z.array(z.string()).optional(),
  keywords_any: z.array(z.string()).optional(),
  keywords_none: z.array(z.string()).optional(),
});
export type FirmographicFilters = z.infer<typeof FirmographicFilters>;

/** Resolved filters for one segment (core + segment overrides, defaults applied). What jobs consume. */
export const Firmographics = z.object({
  industries: z.array(z.string()).default([]),
  employee_count: IntRange.optional(),
  revenue_usd: IntRange.optional(),
  hq_countries: z.array(z.string().length(2)).default([]),
  technologies_any: z.array(z.string()).default([]),
  technologies_none: z.array(z.string()).default([]),
  keywords_any: z.array(z.string()).default([]),
  keywords_none: z.array(z.string()).default([]),
});
export type Firmographics = z.infer<typeof Firmographics>;

/** A segment as written: what differs from `core`, plus an optional persona restriction. */
export const IcpSegmentSpec = z.object({
  id: Slug,
  description: z.string().min(1),
  firmographics: FirmographicFilters.default({}),
  personas: z.array(Slug).min(1).optional().describe("Restrict to these persona ids; default: all personas"),
});
export type IcpSegmentSpec = z.infer<typeof IcpSegmentSpec>;

/** A resolved segment: full filters after merging core. This is the shape jobs and adapters use. */
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

const FILTER_KEYS = Object.keys(FirmographicFilters.shape) as (keyof FirmographicFilters)[];

/** core + segment: a field set on the segment replaces the core field; unset fields come from core. */
export function mergeFilters(core: FirmographicFilters | undefined, segment: FirmographicFilters | undefined): Firmographics {
  const merged: Record<string, unknown> = {};
  for (const key of FILTER_KEYS) {
    const value = segment?.[key] !== undefined ? segment[key] : core?.[key];
    if (value !== undefined) merged[key] = value;
  }
  return Firmographics.parse(merged);
}

const hasAnyFilter = (f: Firmographics) =>
  f.industries.length + f.hq_countries.length + f.technologies_any.length + f.keywords_any.length > 0 || !!f.employee_count || !!f.revenue_usd;

/** context/icp.yaml: the machine-readable ICP consumed by scripts. */
export const IcpFile = z
  .object({
    version: z.literal(FILE_VERSIONS.icp),
    project_id: Slug,
    approval: Approval,
    core: z
      .object({ firmographics: FirmographicFilters.default({}) })
      .optional()
      .describe("Profile every segment shares. Segments only add or replace what differs"),
    segments: z.array(IcpSegmentSpec).min(1),
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
    const personaIds = new Set(icp.personas.map((p) => p.id));
    icp.segments.forEach((s, i) => {
      for (const p of s.personas ?? []) {
        if (!personaIds.has(p)) ctx.addIssue({ code: "custom", path: ["segments", i, "personas"], message: `unknown persona "${p}"` });
      }
      // A field-level error (e.g. min > max inside the segment) is already reported; skip the cross-checks.
      let resolved: Firmographics;
      try { resolved = mergeFilters(icp.core?.firmographics, s.firmographics); } catch { return; }
      if (!hasAnyFilter(resolved)) {
        ctx.addIssue({ code: "custom", path: ["segments", i, "firmographics"], message: `segment "${s.id}" has no filters (core + segment): it would match every company` });
      }
      const range = resolved.employee_count;
      if (range?.min !== undefined && range.max !== undefined && range.min > range.max) {
        ctx.addIssue({ code: "custom", path: ["segments", i, "firmographics", "employee_count"], message: `segment "${s.id}" resolves to min > max` });
      }
    });
  });
export type IcpFile = z.infer<typeof IcpFile>;

export interface ResolvedSegment extends IcpSegment {
  /** Persona ids this segment targets (its own restriction, or all personas). */
  personas: string[];
  /** Which filter fields came from the segment rather than core (for display and review). */
  overrides: (keyof FirmographicFilters)[];
}

/** The ICP as jobs see it: every segment with its final filters and personas. */
export function resolveIcp(icp: IcpFile): { segments: ResolvedSegment[]; exclusions: IcpFile["exclusions"] } {
  const allPersonas = icp.personas.map((p) => p.id);
  return {
    exclusions: icp.exclusions,
    segments: icp.segments.map((s) => ({
      id: s.id,
      description: s.description,
      firmographics: mergeFilters(icp.core?.firmographics, s.firmographics),
      personas: s.personas ?? allPersonas,
      overrides: FILTER_KEYS.filter((k) => s.firmographics?.[k] !== undefined),
    })),
  };
}
