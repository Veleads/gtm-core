import { z } from "zod";

/** Lowercase slug: letters, digits, hyphens. */
export const Slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase letters, digits and hyphens");

export const IsoDate = z.iso.date();
export const IsoDateTime = z.iso.datetime({ offset: true });

export const Domain = z
  .string()
  .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/, "bare lowercase domain, e.g. acme.com");

export const Tier = z.enum(["A", "B", "C"]);

/** A GitHub user handle, e.g. "@abdullah". Owners given as handles get GitHub-enforced approvals. */
export const GitHubHandle = z.string().regex(/^@[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/, "GitHub handle like @username");
export const isGitHubHandle = (value: string | null | undefined): value is string => !!value && GitHubHandle.safeParse(value).success;

export const Stage = z.enum([
  "intake",
  "icp",
  "tam",
  "enrich",
  "qualify",
  "copy",
  "qa",
  "launch",
  "results",
]);
export type Stage = z.infer<typeof Stage>;

export const IntRange = z
  .object({ min: z.number().int().nonnegative().optional(), max: z.number().int().positive().optional() })
  .refine((r) => r.min === undefined || r.max === undefined || r.min <= r.max, "min must be <= max");

/**
 * A human approval. Agents never set `approved` on their own: only after a named human
 * explicitly approves in the session (see AGENTS.md, "Hard stops").
 */
export const Approval = z
  .object({
    status: z.enum(["pending", "approved", "rejected"]),
    approved_by: z.string().min(1).nullable(),
    approved_at: IsoDate.nullable(),
    notes: z.string().optional(),
    content_hash: z
      .string()
      .regex(/^sha256:[0-9a-f]{16}$/)
      .optional()
      .describe("Fingerprint of the approved content, written by `gtm approve`. Never edit by hand."),
    approved_via: z
      .string()
      .url()
      .optional()
      .describe("Pull request whose review is the approval (GitHub mode). Written by `gtm approve --pr`."),
  })
  .refine(
    (a) => a.status !== "approved" || (a.approved_by !== null && a.approved_at !== null),
    "approved requires approved_by and approved_at",
  );
export type Approval = z.infer<typeof Approval>;

/** Where a field's value came from: provider slug, "project" (supplied by the project owner), "manual" or "derived". Required for GDPR. */
export const FieldSources = z.record(z.string(), z.string().min(1));
