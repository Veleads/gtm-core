// gtm new-campaign <campaign-slug>: scaffolds campaigns/<slug>/ from the kit template.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { Slug } from "@gtm/schemas";
import { KIT_DIR } from "../paths.ts";
import { copyTemplate } from "../template.ts";

export function runNewCampaign(root: string, campaign: string | undefined): boolean {
  if (!campaign || !Slug.safeParse(campaign).success) { console.error("Usage: gtm new-campaign <campaign-slug>"); return false; }
  const clientFile = join(root, "client.yaml");
  if (!existsSync(clientFile)) { console.error("client.yaml not found: run this from the root of a client repo"); return false; }
  const dest = join(root, "campaigns", campaign);
  if (existsSync(dest)) { console.error(`campaigns/${campaign} already exists`); return false; }

  const clientId = parse(readFileSync(clientFile, "utf8"))?.client_id ?? "TODO";
  copyTemplate(join(KIT_DIR, "templates", "campaign"), dest, { CLIENT_ID: clientId, CAMPAIGN_ID: campaign, OWNER: process.env.GTM_USER ?? "TODO" });
  mkdirSync(join(dest, "runs"), { recursive: true });
  writeFileSync(join(dest, "runs", ".gitkeep"), "");
  console.log(`Created campaigns/${campaign}. Branch: git switch -c campaign/${campaign}`);
  return true;
}
