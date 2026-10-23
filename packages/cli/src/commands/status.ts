// gtm status: one-screen view of this client repo. Cross-client portfolio view comes from Postgres (Phase 2).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { subdirs } from "../fsutil.ts";
import { GTM_VERSION } from "../paths.ts";

function readYaml(file: string): any {
  try { return parse(readFileSync(file, "utf8")); } catch { return null; }
}

export function campaignStages(root: string): { id: string; stage: string }[] {
  return subdirs(join(root, "campaigns")).map((id) => ({ id, stage: readYaml(join(root, "campaigns", id, "config.yaml"))?.stage ?? "?" }));
}

export function runStatus(root: string): boolean {
  const client = readYaml(join(root, "client.yaml"));
  const icp = readYaml(join(root, "context", "icp.yaml"));
  console.log(`${client?.name ?? "?"} (${client?.client_id ?? "?"}) · status ${client?.status ?? "?"} · core v${GTM_VERSION}`);
  console.log(`ICP gate: ${icp?.approval?.status ?? "?"}${icp?.approval?.approved_by ? ` by ${icp.approval.approved_by} on ${icp.approval.approved_at}` : ""}\n`);

  const rows = subdirs(join(root, "campaigns")).map((id) => {
    const cfg = readYaml(join(root, "campaigns", id, "config.yaml")) ?? {};
    const runsDir = join(root, "campaigns", id, "runs");
    const last = existsSync(runsDir) ? readdirSync(runsDir).filter((f) => f.endsWith(".md")).sort().at(-1) ?? "-" : "-";
    return [id, cfg.stage ?? "?", cfg.gates?.copy?.status ?? "?", cfg.gates?.launch?.status ?? "?", cfg.owner ?? "?", last];
  });
  if (!rows.length) { console.log("no campaigns yet: pnpm gtm new-campaign <campaign-slug>"); return true; }

  const header = ["campaign", "stage", "copy gate", "launch gate", "owner", "latest run log"];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (r: string[]) => r.map((c, i) => String(c).padEnd(widths[i]!)).join("  ");
  console.log(line(header));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const r of rows) console.log(line(r));
  return true;
}
