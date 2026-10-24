CREATE TYPE "public"."email_status" AS ENUM('valid', 'catch_all', 'invalid', 'unknown', 'not_found');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('qualified', 'suppressed', 'disqualified', 'ready', 'pushed', 'sent', 'replied', 'positive', 'meeting', 'bounced', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."outreach_event" AS ENUM('sent', 'opened', 'replied', 'positive', 'meeting', 'bounced', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'cancelled', 'budget_stopped');--> statement-breakpoint
CREATE TYPE "public"."stage" AS ENUM('intake', 'icp', 'tam', 'enrich', 'qualify', 'copy', 'qa', 'launch', 'results');--> statement-breakpoint
CREATE TYPE "public"."suppression_kind" AS ENUM('customers', 'open_deals', 'competitors', 'do_not_contact', 'past_bounces', 'unsubscribed', 'recently_contacted');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"campaign_id" text,
	"run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tam_id" text NOT NULL,
	"segment_id" text,
	"domain" text NOT NULL,
	"name" text NOT NULL,
	"linkedin_url" text,
	"industry" text,
	"employee_count" integer,
	"revenue_usd" numeric,
	"hq_country" text,
	"technologies" text[] DEFAULT '{}'::text[] NOT NULL,
	"reachable" boolean,
	"field_sources" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"contact_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"segment_id" text NOT NULL,
	"persona_id" text NOT NULL,
	"score" integer NOT NULL,
	"tier" "tier" NOT NULL,
	"signal_keys" text[] DEFAULT '{}'::text[] NOT NULL,
	"variables" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "lead_status" DEFAULT 'qualified' NOT NULL,
	"suppression_reason" "suppression_kind",
	"suppression_checked_at" timestamp with time zone,
	"sender_lead_ref" text,
	"pushed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"campaign_id" text,
	"run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"title" text NOT NULL,
	"seniority" text,
	"department" text,
	"linkedin_url" text,
	"country" text,
	"email" text,
	"email_status" "email_status" DEFAULT 'unknown' NOT NULL,
	"email_source" text,
	"verified_at" timestamp with time zone,
	"field_sources" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"campaign_id" text,
	"run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider" text NOT NULL,
	"operation" text NOT NULL,
	"units" integer NOT NULL,
	"unit_cost_usd" numeric(12, 6) NOT NULL,
	"total_usd" numeric(12, 6) NOT NULL,
	"cached" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrichments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"campaign_id" text,
	"run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider" text NOT NULL,
	"operation" text NOT NULL,
	"input_key" text NOT NULL,
	"input" jsonb NOT NULL,
	"response" jsonb,
	"ok" boolean NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"campaign_lead_id" uuid NOT NULL,
	"kind" "outreach_event" NOT NULL,
	"step" integer,
	"variant" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"external_ref" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"campaign_id" text,
	"stage" "stage" NOT NULL,
	"job" text NOT NULL,
	"status" "run_status" DEFAULT 'queued' NOT NULL,
	"triggered_by" text NOT NULL,
	"git_sha" text,
	"config_hash" text,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"campaign_id" text,
	"run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"signal_key" text NOT NULL,
	"account_id" uuid NOT NULL,
	"contact_id" uuid,
	"observed_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"evidence_url" text,
	"summary" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppression" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"campaign_id" text,
	"run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" "suppression_kind" NOT NULL,
	"domain" text,
	"email" text,
	"reason" text,
	"source" text NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "campaign_leads" ADD CONSTRAINT "campaign_leads_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_leads" ADD CONSTRAINT "campaign_leads_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_events" ADD CONSTRAINT "outreach_events_campaign_lead_id_campaign_leads_id_fk" FOREIGN KEY ("campaign_lead_id") REFERENCES "public"."campaign_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_project_tam_domain_uq" ON "accounts" USING btree ("project_id","tam_id","domain");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_leads_campaign_contact_uq" ON "campaign_leads" USING btree ("project_id","campaign_id","contact_id");--> statement-breakpoint
CREATE INDEX "campaign_leads_status_idx" ON "campaign_leads" USING btree ("project_id","campaign_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_project_linkedin_uq" ON "contacts" USING btree ("project_id","linkedin_url");--> statement-breakpoint
CREATE INDEX "contacts_project_email_idx" ON "contacts" USING btree ("project_id","email");--> statement-breakpoint
CREATE INDEX "costs_project_campaign_idx" ON "costs" USING btree ("project_id","campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrichments_cache_uq" ON "enrichments" USING btree ("project_id","provider","operation","input_key");--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_events_external_uq" ON "outreach_events" USING btree ("project_id","external_ref","kind");--> statement-breakpoint
CREATE INDEX "runs_project_campaign_idx" ON "runs" USING btree ("project_id","campaign_id");--> statement-breakpoint
CREATE INDEX "signals_project_account_idx" ON "signals" USING btree ("project_id","account_id","signal_key");--> statement-breakpoint
CREATE INDEX "suppression_project_domain_idx" ON "suppression" USING btree ("project_id","domain");--> statement-breakpoint
CREATE INDEX "suppression_project_email_idx" ON "suppression" USING btree ("project_id","email");