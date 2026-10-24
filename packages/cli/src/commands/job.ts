// gtm job <name> <campaign>: runs a pipeline job on the workers (via Hatchet) and prints the result.
// The CLI resolves everything from the repo into the job payload; workers never read project repos.
//   tam: build the TAM for the campaign's segments (needs an approved ICP and config.yaml → tam.source)
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { loadStackEnv, STACK_ENV_FILE } from "@gtm/core";
import { CampaignConfig, IcpFile, JOB_NAMES, ProjectFile, Stage, TamJobInput, TamJobResult } from "@gtm/schemas";
import { GTM_VERSION } from "../paths.ts";
import { runValidate } from "./validate.ts";

const PLANNED = ["enrich", "suppression:import", "signals", "qualify", "qa", "push", "activate", "results"];

function git(root: string, args: string[]): string | null {
  const res = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return res.status === 0 ? res.stdout.trim() : null;
}

/** Builds and validates the tam payload from the repo, or returns an error message. */
export function buildTamInput(root: string, campaign: string): TamJobInput | string {
  const read = (rel: string) => parse(readFileSync(join(root, rel), "utf8"));
  const project = ProjectFile.parse(read("project.yaml"));
  const icp = IcpFile.parse(read("context/icp.yaml"));
  const cfgText = readFileSync(join(root, "campaigns", campaign, "config.yaml"), "utf8");
  const cfg = CampaignConfig.parse(parse(cfgText));

  if (icp.approval.status !== "approved") return "TAM needs an approved ICP (hard stop, AGENTS.md section 4). Get ICP sign-off first.";
  if (Stage.options.indexOf(cfg.stage) < Stage.options.indexOf("tam")) return `campaign stage is "${cfg.stage}": move it to "tam" first.`;
  if (!cfg.tam) return 'config.yaml has no `tam:` section. Add `tam: { source: mock-accounts }` for a local proof, or a real account source.';
  const segments = icp.segments.filter((s) => cfg.segments.includes(s.id));

  return TamJobInput.parse({
    ctx: {
      project_id: project.project_id,
      campaign_id: campaign,
      triggered_by: process.env.GTM_USER ?? git(root, ["config", "user.name"]) ?? "unknown",
      core_version: GTM_VERSION,
      git_sha: git(root, ["rev-parse", "HEAD"]),
      config_hash: `sha256:${createHash("sha256").update(cfgText).digest("hex").slice(0, 16)}`,
    },
    tam_id: cfg.tam_id,
    source: cfg.tam.source,
    max_accounts_per_segment: cfg.tam.max_accounts_per_segment,
    segments,
    exclusions: icp.exclusions,
    budget_usd: cfg.budget.max_total,
  });
}

function printTam(res: TamJobResult, campaign: string) {
  const header = ["segment", "found", "excluded", "new", "updated", "reachable", "active"];
  const rows = res.segments.map((s) => [s.segment_id, s.found, s.excluded, s.inserted, s.updated, s.reachable, s.active].map(String));
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));
  const line = (r: string[]) => r.map((c, i) => (i === 0 ? c.padEnd(widths[i]!) : c.padStart(widths[i]!))).join("  ");
  console.log(`\n${line(header)}\n${widths.map((w) => "-".repeat(w)).join("  ")}`);
  for (const r of rows) console.log(line(r));
  console.log(`\nFunnel: TAM ${res.totals.tam} → reachable ${res.totals.reachable} → active ${res.totals.active}   cost $${res.cost_usd.toFixed(2)}   run ${res.run_id}`);
  console.log(`\nRun log row (campaigns/${campaign}/runs/…):\n| tam | ${res.run_id} | succeeded | ${res.segments.length} segment(s) | TAM ${res.totals.tam} → reachable ${res.totals.reachable} → active ${res.totals.active} | ${res.cost_usd.toFixed(2)} |`);
}

export async function runJob(root: string, args: string[]): Promise<boolean> {
  const [name, campaign] = args;
  if (name && PLANNED.includes(name)) {
    console.error(`gtm job ${name}: not available yet (planned). Per AGENTS.md this is a mandatory stop: do not improvise it with scripts.`);
    return false;
  }
  if (name !== "tam" || !campaign) {
    console.error(`Usage: gtm job tam <campaign>   (planned: ${PLANNED.join(", ")})`);
    return false;
  }
  if (!existsSync(join(root, "campaigns", campaign, "config.yaml"))) { console.error(`campaigns/${campaign}/config.yaml not found`); return false; }

  console.log(`• validating ${campaign}`);
  if (!(await runValidate(root, campaign))) { console.error("\nFix the validation errors above before running jobs."); return false; }
  let input: TamJobInput | string;
  try { input = buildTamInput(root, campaign); } catch (e) { console.error((e as Error).message); return false; }
  if (typeof input === "string") { console.error(input); return false; }

  loadStackEnv();
  if (!process.env.HATCHET_CLIENT_TOKEN) {
    console.error(`No Hatchet connection. Local: run \`pnpm stack:up\` and \`pnpm worker\` in gtm-core (writes ${STACK_ENV_FILE}). Deployed: set HATCHET_CLIENT_TOKEN.`);
    return false;
  }
  // Loaded lazily: only `gtm job` needs the Hatchet SDK.
  const { HatchetClient } = await import("@hatchet-dev/typescript-sdk/v1");
  const hatchet = HatchetClient.init();
  const tam = hatchet.task({ name: JOB_NAMES.tam, fn: async () => { throw new Error("runs on the gtm worker"); } });

  console.log(`• running tam for ${input.segments.length} segment(s) via ${input.source} (budget $${input.budget_usd})`);
  const hint = setTimeout(() => console.log("  … still waiting. Is the worker running? (`pnpm worker` in gtm-core)"), 20_000);
  try {
    const output = await tam.run(input as never);
    printTam(TamJobResult.parse(output), campaign);
    return true;
  } catch (e) {
    console.error(`tam failed: ${(e as Error).message}`);
    return false;
  } finally {
    clearTimeout(hint);
  }
}
