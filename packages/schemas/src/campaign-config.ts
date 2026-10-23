import { z } from "zod";
import { Approval, Slug, Stage, Tier } from "./common.ts";
import { FILE_VERSIONS } from "./versions.ts";

const ProviderSlug = Slug.describe("Must match .gtm/providers/<slug>.md and a registered adapter");

const Enrichment = z.object({
  email_waterfall: z.array(ProviderSlug).min(1).describe("Tried in order; stops at the first verified hit"),
  verification: z.object({
    provider: ProviderSlug,
    accept: z.array(z.enum(["valid", "catch_all"])).min(1),
  }),
  max_contacts_per_account: z.number().int().min(1).max(10),
  cache_ttl_days: z.number().int().positive(),
});

const Budget = z.object({
  currency: z.literal("USD"),
  max_total: z.number().positive().describe("Hard cap for this campaign; jobs stop when reached"),
  max_per_lead: z.number().positive(),
});

const Scoring = z.object({
  fit: z.object({
    segment_match: z.number().int().min(0).max(100),
    persona_role: z.record(z.enum(["decision_maker", "champion", "influencer", "user"]), z.number().int().min(0).max(100)),
  }),
  signals: z.array(Slug).describe("Keys from signals.yaml; weights come from there"),
  tiers: z.object({ A: z.number().int(), B: z.number().int() }).refine((t) => t.A > t.B, "A threshold must exceed B"),
  send_tiers: z.array(Tier).min(1),
});

const Suppression = z.object({
  lists: z.array(z.enum(["customers", "open_deals", "competitors", "do_not_contact", "past_bounces", "unsubscribed"])).min(1),
  recently_contacted_days: z.number().int().min(0),
});

const Sending = z.object({
  sender: ProviderSlug,
  sender_campaign_ref: z.string().nullable().describe("ID in the sender tool, set at launch"),
  domains: z.array(z.string()).min(1),
  inboxes: z.number().int().positive(),
  daily_cap_per_inbox: z.number().int().positive().max(50),
  warmup_min_days: z.number().int().min(0),
  timezone: z.string().min(1),
  send_window: z.object({
    days: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).min(1),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }),
});

const Compliance = z.object({
  regions: z.array(z.string().min(2)).min(1),
  lawful_basis: z.enum(["legitimate_interest", "consent", "not_applicable"]),
  lia_ref: z.string().nullable().describe("Link/path to Legitimate Interest Assessment; required when basis is legitimate_interest"),
  opt_out_text: z.string().min(1),
  privacy_notice_url: z.string().url().nullable(),
});

/** campaigns/<campaign>/config.yaml */
export const CampaignConfig = z
  .object({
    version: z.literal(FILE_VERSIONS["campaign-config"]),
    client_id: Slug,
    campaign_id: Slug,
    owner: z.string().min(1),
    stage: Stage.describe("The stage currently being worked on"),
    tam_id: Slug,
    segments: z.array(Slug).min(1).describe("Segment ids from icp.yaml"),
    personas: z.array(Slug).min(1).describe("Persona ids from icp.yaml"),
    enrichment: Enrichment,
    budget: Budget,
    scoring: Scoring,
    suppression: Suppression,
    sending: Sending,
    compliance: Compliance,
    gates: z.object({ copy: Approval, launch: Approval }),
  })
  .superRefine((c, ctx) => {
    if (c.compliance.lawful_basis === "legitimate_interest" && !c.compliance.lia_ref) {
      ctx.addIssue({ code: "custom", path: ["compliance", "lia_ref"], message: "required when lawful_basis is legitimate_interest" });
    }
  });
export type CampaignConfig = z.infer<typeof CampaignConfig>;
