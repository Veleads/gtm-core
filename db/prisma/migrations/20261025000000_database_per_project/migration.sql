-- One database per project (AGENTS.md section 2): the database is the project scope, so project_id
-- moves from every row into a single-row "project" table that workers check before writing.
-- A database holding more than one project must be split first (CHANGELOG, "action").
CREATE TEMP TABLE "_gtm_projects" AS
    SELECT project_id FROM "runs"
    UNION SELECT project_id FROM "accounts"
    UNION SELECT project_id FROM "contacts"
    UNION SELECT project_id FROM "enrichments"
    UNION SELECT project_id FROM "signals"
    UNION SELECT project_id FROM "suppression"
    UNION SELECT project_id FROM "campaign_leads"
    UNION SELECT project_id FROM "outreach_events"
    UNION SELECT project_id FROM "costs";

DO $$
BEGIN
    IF (SELECT count(DISTINCT project_id) FROM "_gtm_projects") > 1 THEN
        RAISE EXCEPTION 'This database holds data for more than one project_id. Split it into one database per project before upgrading (see CHANGELOG).';
    END IF;
END $$;

-- DropIndex
DROP INDEX "runs_project_campaign_idx";

-- DropIndex
DROP INDEX "accounts_project_tam_domain_uq";

-- DropIndex
DROP INDEX "contacts_project_email_idx";

-- DropIndex
DROP INDEX "contacts_project_linkedin_uq";

-- DropIndex
DROP INDEX "enrichments_cache_uq";

-- DropIndex
DROP INDEX "signals_project_account_idx";

-- DropIndex
DROP INDEX "suppression_project_domain_idx";

-- DropIndex
DROP INDEX "suppression_project_email_idx";

-- DropIndex
DROP INDEX "campaign_leads_status_idx";

-- DropIndex
DROP INDEX "campaign_leads_campaign_contact_uq";

-- DropIndex
DROP INDEX "outreach_events_external_uq";

-- DropIndex
DROP INDEX "costs_project_campaign_idx";

-- AlterTable
ALTER TABLE "runs" DROP COLUMN "project_id";

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "project_id";

-- AlterTable
ALTER TABLE "contacts" DROP COLUMN "project_id";

-- AlterTable
ALTER TABLE "enrichments" DROP COLUMN "project_id";

-- AlterTable
ALTER TABLE "signals" DROP COLUMN "project_id";

-- AlterTable
ALTER TABLE "suppression" DROP COLUMN "project_id";

-- AlterTable
ALTER TABLE "campaign_leads" DROP COLUMN "project_id";

-- AlterTable
ALTER TABLE "outreach_events" DROP COLUMN "project_id";

-- AlterTable
ALTER TABLE "costs" DROP COLUMN "project_id";

-- CreateTable
CREATE TABLE "project" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "project_id" TEXT NOT NULL,
    "bound_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_project_id_key" ON "project"("project_id");

-- CreateIndex
CREATE INDEX "runs_campaign_idx" ON "runs"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_tam_domain_uq" ON "accounts"("tam_id", "domain");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_linkedin_uq" ON "contacts"("linkedin_url");

-- CreateIndex
CREATE UNIQUE INDEX "enrichments_cache_uq" ON "enrichments"("provider", "operation", "input_key");

-- CreateIndex
CREATE INDEX "signals_account_idx" ON "signals"("account_id", "signal_key");

-- CreateIndex
CREATE INDEX "suppression_domain_idx" ON "suppression"("domain");

-- CreateIndex
CREATE INDEX "suppression_email_idx" ON "suppression"("email");

-- CreateIndex
CREATE INDEX "campaign_leads_status_idx" ON "campaign_leads"("campaign_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_leads_campaign_contact_uq" ON "campaign_leads"("campaign_id", "contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "outreach_events_external_uq" ON "outreach_events"("external_ref", "kind");

-- CreateIndex
CREATE INDEX "costs_campaign_idx" ON "costs"("campaign_id");

-- Exactly one row: this database belongs to one project.
ALTER TABLE "project" ADD CONSTRAINT "project_single_row" CHECK ("id" = 1);

-- Bind an existing database to the project its rows belonged to.
INSERT INTO "project" ("id", "project_id") SELECT 1, project_id FROM "_gtm_projects" LIMIT 1;
DROP TABLE "_gtm_projects";
