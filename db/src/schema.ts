// Data layer. Rules (AGENTS.md "Data rules"):
// - every row carries client_id, campaign_id (null when not campaign-scoped), run_id, timestamps
// - PII lives here and nowhere else; git only ever gets aggregates
import { sql } from "drizzle-orm";
import {
  boolean, index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";

const scope = {
  clientId: text("client_id").notNull(),
  campaignId: text("campaign_id"),
  runId: uuid("run_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
};

export const stageEnum = pgEnum("stage", ["intake", "icp", "tam", "enrich", "qualify", "copy", "qa", "launch", "results"]);
export const runStatusEnum = pgEnum("run_status", ["queued", "running", "succeeded", "failed", "cancelled", "budget_stopped"]);
export const emailStatusEnum = pgEnum("email_status", ["valid", "catch_all", "invalid", "unknown", "not_found"]);
export const tierEnum = pgEnum("tier", ["A", "B", "C"]);
export const suppressionKindEnum = pgEnum("suppression_kind", [
  "customers", "open_deals", "competitors", "do_not_contact", "past_bounces", "unsubscribed", "recently_contacted",
]);
export const leadStatusEnum = pgEnum("lead_status", [
  "qualified", "suppressed", "disqualified", "ready", "pushed", "sent", "replied", "positive", "meeting", "bounced", "unsubscribed",
]);
export const outreachEventEnum = pgEnum("outreach_event", ["sent", "opened", "replied", "positive", "meeting", "bounced", "unsubscribed"]);

/** One row per job execution. run_id is referenced by every other table and by run logs in git. */
export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: text("client_id").notNull(),
  campaignId: text("campaign_id"),
  stage: stageEnum("stage").notNull(),
  job: text("job").notNull(),
  status: runStatusEnum("status").notNull().default("queued"),
  triggeredBy: text("triggered_by").notNull(),
  gitSha: text("git_sha"),
  configHash: text("config_hash"),
  params: jsonb("params").notNull().default({}),
  counts: jsonb("counts").notNull().default({}),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("runs_client_campaign_idx").on(t.clientId, t.campaignId)]);

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...scope,
  tamId: text("tam_id").notNull(),
  segmentId: text("segment_id"),
  domain: text("domain").notNull(),
  name: text("name").notNull(),
  linkedinUrl: text("linkedin_url"),
  industry: text("industry"),
  employeeCount: integer("employee_count"),
  revenueUsd: numeric("revenue_usd"),
  hqCountry: text("hq_country"),
  technologies: text("technologies").array().notNull().default(sql`'{}'::text[]`),
  reachable: boolean("reachable"),
  fieldSources: jsonb("field_sources").notNull().default({}),
}, (t) => [uniqueIndex("accounts_client_tam_domain_uq").on(t.clientId, t.tamId, t.domain)]);

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...scope,
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  title: text("title").notNull(),
  seniority: text("seniority"),
  department: text("department"),
  linkedinUrl: text("linkedin_url"),
  country: text("country"),
  email: text("email"),
  emailStatus: emailStatusEnum("email_status").notNull().default("unknown"),
  emailSource: text("email_source"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  fieldSources: jsonb("field_sources").notNull().default({}),
}, (t) => [
  uniqueIndex("contacts_client_linkedin_uq").on(t.clientId, t.linkedinUrl),
  index("contacts_client_email_idx").on(t.clientId, t.email),
]);

/** Raw provider responses cached by input key. Re-running a job never re-pays for the same input. */
export const enrichments = pgTable("enrichments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...scope,
  provider: text("provider").notNull(),
  operation: text("operation").notNull(),
  inputKey: text("input_key").notNull(),
  input: jsonb("input").notNull(),
  response: jsonb("response"),
  ok: boolean("ok").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => [uniqueIndex("enrichments_cache_uq").on(t.clientId, t.provider, t.operation, t.inputKey)]);

export const signals = pgTable("signals", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...scope,
  signalKey: text("signal_key").notNull(),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  contactId: uuid("contact_id").references(() => contacts.id),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  source: text("source").notNull(),
  evidenceUrl: text("evidence_url"),
  summary: text("summary").notNull(),
}, (t) => [index("signals_client_account_idx").on(t.clientId, t.accountId, t.signalKey)]);

/** campaign_id null = applies to every campaign of the client. Match on domain and/or email. */
export const suppression = pgTable("suppression", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...scope,
  kind: suppressionKindEnum("kind").notNull(),
  domain: text("domain"),
  email: text("email"),
  reason: text("reason"),
  source: text("source").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
}, (t) => [
  index("suppression_client_domain_idx").on(t.clientId, t.domain),
  index("suppression_client_email_idx").on(t.clientId, t.email),
]);

export const campaignLeads = pgTable("campaign_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...scope,
  campaignId: text("campaign_id").notNull(),
  contactId: uuid("contact_id").notNull().references(() => contacts.id),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  segmentId: text("segment_id").notNull(),
  personaId: text("persona_id").notNull(),
  score: integer("score").notNull(),
  tier: tierEnum("tier").notNull(),
  signalKeys: text("signal_keys").array().notNull().default(sql`'{}'::text[]`),
  variables: jsonb("variables").notNull().default({}),
  status: leadStatusEnum("status").notNull().default("qualified"),
  suppressionReason: suppressionKindEnum("suppression_reason"),
  suppressionCheckedAt: timestamp("suppression_checked_at", { withTimezone: true }),
  senderLeadRef: text("sender_lead_ref"),
  pushedAt: timestamp("pushed_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("campaign_leads_campaign_contact_uq").on(t.clientId, t.campaignId, t.contactId),
  index("campaign_leads_status_idx").on(t.clientId, t.campaignId, t.status),
]);

export const outreachEvents = pgTable("outreach_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...scope,
  campaignId: text("campaign_id").notNull(),
  campaignLeadId: uuid("campaign_lead_id").notNull().references(() => campaignLeads.id),
  kind: outreachEventEnum("kind").notNull(),
  step: integer("step"),
  variant: text("variant"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  externalRef: text("external_ref").notNull(),
}, (t) => [uniqueIndex("outreach_events_external_uq").on(t.clientId, t.externalRef, t.kind)]);

export const costs = pgTable("costs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...scope,
  provider: text("provider").notNull(),
  operation: text("operation").notNull(),
  units: integer("units").notNull(),
  unitCostUsd: numeric("unit_cost_usd", { precision: 12, scale: 6 }).notNull(),
  totalUsd: numeric("total_usd", { precision: 12, scale: 6 }).notNull(),
  cached: boolean("cached").notNull().default(false),
}, (t) => [index("costs_client_campaign_idx").on(t.clientId, t.campaignId)]);
