// gtm new-campaign <campaign-slug>: scaffolds campaigns/<slug>/ from the kit template.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { Slug } from "@gtm/schemas";
import { KIT_DIR } from "../paths.ts";
import { copyTemplate } from "../template.ts";

export function runNewCampaign(root: string, campaign: string | undefined): boolean {
  if (!campaign || !Slug.safeParse(campaign).success) { console.error("Usage: gtm new-campaign <campaign-slug>"); return false; }
  const projectFile = join(root, "project.yaml");
  if (!existsSync(projectFile)) { console.error("project.yaml not found: run this from the root of a project repo"); return false; }
  const dest = join(root, "campaigns", campaign);
  if (existsSync(dest)) { console.error(`campaigns/${campaign} already exists`); return false; }

  const projectId = parse(readFileSync(projectFile, "utf8"))?.project_id ?? "TODO";
  copyTemplate(join(KIT_DIR, "templates", "campaign"), dest, { PROJECT_ID: projectId, CAMPAIGN_ID: campaign, OWNER: process.env.GTM_USER ?? "TODO" });
  mkdirSync(join(dest, "runs"), { recursive: true });
  writeFileSync(join(dest, "runs", ".gitkeep"), "");
  console.log(`Created campaigns/${campaign}. Branch: git switch -c campaign/${campaign}`);
  return true;
}
