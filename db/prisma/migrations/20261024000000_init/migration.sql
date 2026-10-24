-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "stage" AS ENUM ('intake', 'icp', 'tam', 'enrich', 'qualify', 'copy', 'qa', 'launch', 'results');

-- CreateEnum
CREATE TYPE "run_status" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'budget_stopped');

-- CreateEnum
CREATE TYPE "email_status" AS ENUM ('valid', 'catch_all', 'invalid', 'unknown', 'not_found');

-- CreateEnum
CREATE TYPE "tier" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "suppression_kind" AS ENUM ('customers', 'open_deals', 'competitors', 'do_not_contact', 'past_bounces', 'unsubscribed', 'recently_contacted');

-- CreateEnum
CREATE TYPE "lead_status" AS ENUM ('qualified', 'suppressed', 'disqualified', 'ready', 'pushed', 'sent', 'replied', 'positive', 'meeting', 'bounced', 'unsubscribed');

-- CreateEnum
CREATE TYPE "outreach_event" AS ENUM ('sent', 'opened', 'replied', 'positive', 'meeting', 'bounced', 'unsubscribed');

-- CreateTable
CREATE TABLE "runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "stage" "stage" NOT NULL,
    "job" TEXT NOT NULL,
    "status" "run_status" NOT NULL DEFAULT 'queued',
    "triggered_by" TEXT NOT NULL,
    "git_sha" TEXT,
    "config_hash" TEXT,
    "params" JSONB NOT NULL DEFAULT '{}',
    "counts" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "run_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tam_id" TEXT NOT NULL,
    "segment_id" TEXT,
    "domain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "linkedin_url" TEXT,
    "industry" TEXT,
    "employee_count" INTEGER,
    "revenue_usd" BIGINT,
    "hq_country" TEXT,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reachable" BOOLEAN,
    "field_sources" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "run_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "account_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "seniority" TEXT,
    "department" TEXT,
    "linkedin_url" TEXT,
    "country" TEXT,
    "email" TEXT,
    "email_status" "email_status" NOT NULL DEFAULT 'unknown',
    "email_source" TEXT,
    "verified_at" TIMESTAMPTZ(6),
    "field_sources" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrichments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "run_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "input_key" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "response" JSONB,
    "ok" BOOLEAN NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "enrichments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "run_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signal_key" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "contact_id" UUID,
    "observed_at" TIMESTAMPTZ(6) NOT NULL,
    "source" TEXT NOT NULL,
    "evidence_url" TEXT,
    "summary" TEXT NOT NULL,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppression" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "run_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "suppression_kind" NOT NULL,
    "domain" TEXT,
    "email" TEXT,
    "reason" TEXT,
    "source" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "suppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "run_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contact_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "segment_id" TEXT NOT NULL,
    "persona_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "tier" "tier" NOT NULL,
    "signal_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "variables" JSONB NOT NULL DEFAULT '{}',
    "status" "lead_status" NOT NULL DEFAULT 'qualified',
    "suppression_reason" "suppression_kind",
    "suppression_checked_at" TIMESTAMPTZ(6),
    "sender_lead_ref" TEXT,
    "pushed_at" TIMESTAMPTZ(6),

    CONSTRAINT "campaign_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "run_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaign_lead_id" UUID NOT NULL,
    "kind" "outreach_event" NOT NULL,
    "step" INTEGER,
    "variant" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "external_ref" TEXT NOT NULL,

    CONSTRAINT "outreach_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "costs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "run_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "unit_cost_usd" DECIMAL(12,6) NOT NULL,
    "total_usd" DECIMAL(12,6) NOT NULL,
    "cached" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "costs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "runs_project_campaign_idx" ON "runs"("project_id", "campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_project_tam_domain_uq" ON "accounts"("project_id", "tam_id", "domain");

-- CreateIndex
CREATE INDEX "contacts_project_email_idx" ON "contacts"("project_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_project_linkedin_uq" ON "contacts"("project_id", "linkedin_url");

-- CreateIndex
CREATE UNIQUE INDEX "enrichments_cache_uq" ON "enrichments"("project_id", "provider", "operation", "input_key");

-- CreateIndex
CREATE INDEX "signals_project_account_idx" ON "signals"("project_id", "account_id", "signal_key");

-- CreateIndex
CREATE INDEX "suppression_project_domain_idx" ON "suppression"("project_id", "domain");

-- CreateIndex
CREATE INDEX "suppression_project_email_idx" ON "suppression"("project_id", "email");

-- CreateIndex
CREATE INDEX "campaign_leads_status_idx" ON "campaign_leads"("project_id", "campaign_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_leads_campaign_contact_uq" ON "campaign_leads"("project_id", "campaign_id", "contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "outreach_events_external_uq" ON "outreach_events"("project_id", "external_ref", "kind");

-- CreateIndex
CREATE INDEX "costs_project_campaign_idx" ON "costs"("project_id", "campaign_id");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_leads" ADD CONSTRAINT "campaign_leads_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_leads" ADD CONSTRAINT "campaign_leads_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_events" ADD CONSTRAINT "outreach_events_campaign_lead_id_fkey" FOREIGN KEY ("campaign_lead_id") REFERENCES "campaign_leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
