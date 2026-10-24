import { z } from "zod";
import { Domain, Slug } from "./common.ts";
import { IcpSegment } from "./icp.ts";

/**
 * Contract between `gtm job` (CLI, in a project repo) and the workers. The CLI resolves everything
 * from the repo into this payload; workers never read project repos.
 */
export const JOB_NAMES = { tam: "gtm-tam" } as const;

export const JobContext = z.object({
  project_id: Slug,
  campaign_id: Slug,
  triggered_by: z.string().min(1),
  core_version: z.string().min(1),
  git_sha: z.string().nullable(),
  config_hash: z.string().min(1),
});
export type JobContext = z.infer<typeof JobContext>;

export const TamJobInput = z.object({
  ctx: JobContext,
  tam_id: Slug,
  source: Slug.describe("Account source adapter, e.g. mock-accounts"),
  max_accounts_per_segment: z.number().int().positive().max(100_000),
  segments: z.array(IcpSegment).min(1),
  exclusions: z.object({ domains: z.array(Domain), industries: z.array(z.string()), hq_countries: z.array(z.string()) }),
  budget_usd: z.number().nonnegative(),
});
export type TamJobInput = z.infer<typeof TamJobInput>;

export const TamJobResult = z.object({
  run_id: z.uuid(),
  segments: z.array(z.object({
    segment_id: Slug,
    found: z.number().int(),
    inserted: z.number().int(),
    updated: z.number().int(),
    excluded: z.number().int(),
    reachable: z.number().int(),
    active: z.number().int(),
  })),
  totals: z.object({ tam: z.number().int(), reachable: z.number().int(), active: z.number().int() }),
  cost_usd: z.number().nonnegative(),
});
export type TamJobResult = z.infer<typeof TamJobResult>;
