// gtm track: mirrors stages and gates into the project's tracker (project.yaml → tracker.kind).
//   gtm track stage <campaign>                     campaign item with its current stage (from config.yaml)
//   gtm track gate-open <icp|copy|launch> [campaign] [--pr <n>]   sign-off item assigned to the approver
//   gtm track gate-done <icp|copy|launch> [campaign]             closes it, only if the files say approved
// The tracker is a mirror: this reads git files and never writes them.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { Stage, isGitHubHandle } from "@gtm/schemas";
import { GitHubError } from "../github.ts";
import { createTracker, type TrackItemInput, type TrackerAdapter } from "../tracker/index.ts";

type Gate = "icp" | "copy" | "launch";
const GATES: Gate[] = ["icp", "copy", "launch"];

const USAGE = `Usage:
  gtm track stage <campaign>
  gtm track gate-open <icp|copy|launch> [campaign] [--pr <number>]
  gtm track gate-done <icp|copy|launch> [campaign]`;

function readYaml(file: string): any {
  return existsSync(file) ? parse(readFileSync(file, "utf8")) : null;
}

const handles = (...values: (string | undefined)[]) => values.filter(isGitHubHandle).map((h) => h.slice(1));

interface Ctx {
  root: string;
  project: any;
  tracker: TrackerAdapter;
}

/** Upsert, retrying without assignees if GitHub rejects them (e.g. not a collaborator). */
async function upsert(ctx: Ctx, item: TrackItemInput): Promise<string> {
  try {
    const res = await ctx.tracker.upsert(item);
    return res.url;
  } catch (e) {
    if (e instanceof GitHubError && e.status === 422 && item.assignees?.length) {
      console.log(`  ! could not assign ${item.assignees.map((a) => "@" + a).join(", ")} (not a collaborator?): created unassigned`);
      return (await ctx.tracker.upsert({ ...item, assignees: [] })).url;
    }
    throw e;
  }
}

function gateKey(gate: Gate, campaign?: string) {
  return gate === "icp" ? "gate:icp" : `gate:${gate}:${campaign}`;
}

function gateFile(gate: Gate, campaign?: string) {
  return gate === "icp" ? "context/icp.yaml" : `campaigns/${campaign}/config.yaml`;
}

function gateApproval(root: string, gate: Gate, campaign?: string): any {
  const doc = readYaml(join(root, gateFile(gate, campaign)));
  return gate === "icp" ? doc?.approval : doc?.gates?.[gate];
}

async function trackStage(ctx: Ctx, campaign: string | undefined): Promise<boolean> {
  const cfg = campaign ? readYaml(join(ctx.root, "campaigns", campaign, "config.yaml")) : null;
  if (!campaign || !cfg) { console.error(campaign ? `campaigns/${campaign}/config.yaml not found` : USAGE); return false; }
  const current = Stage.safeParse(cfg.stage).success ? (cfg.stage as Stage) : null;
  if (!current) { console.error(`campaigns/${campaign}/config.yaml has no valid stage`); return false; }
  const idx = Stage.options.indexOf(current);
  const checklist = Stage.options.map((s, i) => `- [${i < idx ? "x" : " "}] ${s}${s === current ? "  ← current" : ""}`).join("\n");
  const url = await upsert(ctx, {
    key: `campaign:${campaign}`,
    title: `Campaign: ${campaign}`,
    body: `**Stage: \`${current}\`** (source of truth: \`campaigns/${campaign}/config.yaml\`)\n\n${checklist}\n\nBrief: \`campaigns/${campaign}/brief.md\`. Counts and decisions only in this issue: never lead data.`,
    labels: ["campaign", `stage:${current}`],
    exclusiveLabelPrefixes: ["stage:"],
    assignees: handles(cfg.owner, ctx.project?.owners?.gtm_engineer),
  });
  if (url) await ctx.tracker.comment(`campaign:${campaign}`, `Stage → \`${current}\``);
  console.log(url ? `tracked campaign ${campaign} at stage ${current}: ${url}` : `tracker none: skipped (campaign ${campaign} at ${current})`);
  return true;
}

const GATE_TEXT: Record<Gate, { title: string; review: string }> = {
  icp: { title: "ICP sign-off", review: "segments + filters, personas, exclusions, signals with weights, expected TAM range (`context/icp.md`, `context/icp.yaml`, `context/signals.yaml`)" },
  copy: { title: "Copy sign-off", review: "every step of every variant in `copy.md`, rendered with one realistic fictional example" },
  launch: { title: "Launch go/no-go", review: "`qa.md` result, leads by tier, daily volume, spend so far, paused sender campaign" },
};

async function gateOpen(ctx: Ctx, gate: Gate, campaign: string | undefined, pr?: string): Promise<boolean> {
  if (gate !== "icp" && !campaign) { console.error(USAGE); return false; }
  const owners = ctx.project?.owners ?? {};
  const approver = gate === "launch" ? owners.gtm_engineer : owners.approver;
  const how = isGitHubHandle(approver)
    ? `**${approver}**: review and approve the pull request${pr ? ` #${pr}` : ""} on GitHub. Then the agent records it with \`npx gtm approve ${gate === "icp" ? "icp" : `${gate} ${campaign}`} --pr <number>\`.`
    : `Approver **${approver ?? "(not set)"}**: reply with an explicit approval; it is recorded with \`npx gtm approve ... --by "<name (role)>"\`.`;
  const key = gateKey(gate, campaign);
  const url = await upsert(ctx, {
    key,
    title: `${GATE_TEXT[gate].title}${campaign ? `: ${campaign}` : ""}`,
    body: `**Hard stop.** Nothing moves past this gate until it is approved.\n\nReview: ${GATE_TEXT[gate].review}.\n\n${how}\n\nSource of truth: \`${gateFile(gate, campaign)}\`.`,
    labels: ["gate", `gate:${gate}`],
    assignees: handles(approver),
  });
  console.log(url ? `opened ${GATE_TEXT[gate].title}: ${url}` : `tracker none: skipped (${key})`);
  return true;
}

async function gateDone(ctx: Ctx, gate: Gate, campaign: string | undefined): Promise<boolean> {
  if (gate !== "icp" && !campaign) { console.error(USAGE); return false; }
  const approval = gateApproval(ctx.root, gate, campaign);
  if (approval?.status !== "approved") {
    console.error(`${gateFile(gate, campaign)} says this gate is "${approval?.status ?? "missing"}": record the approval first; the tracker only mirrors it.`);
    return false;
  }
  const via = approval.approved_via ? ` via ${approval.approved_via}` : "";
  if (ctx.tracker.kind === "none") { console.log(`tracker none: skipped (${gateKey(gate, campaign)})`); return true; }
  await ctx.tracker.close(gateKey(gate, campaign), `✅ Approved by ${approval.approved_by} on ${approval.approved_at}${via}.`);
  console.log(`closed ${GATE_TEXT[gate].title}${campaign ? `: ${campaign}` : ""}`);
  return true;
}

export async function runTrack(root: string, args: string[], opts: { pr?: string; fetchImpl?: typeof fetch } = {}): Promise<boolean> {
  const [action, a1, a2] = args;
  const project = readYaml(join(root, "project.yaml"));
  if (!project) { console.error("project.yaml not found: run this from the root of a project repo"); return false; }
  const tracker = createTracker(project.tracker?.kind ?? "none", root, opts.fetchImpl);
  if (typeof tracker === "string") { console.error(tracker); return false; }
  const ctx: Ctx = { root, project, tracker };
  try {
    if (action === "stage") return await trackStage(ctx, a1);
    if ((action === "gate-open" || action === "gate-done") && GATES.includes(a1 as Gate)) {
      return action === "gate-open" ? await gateOpen(ctx, a1 as Gate, a2, opts.pr) : await gateDone(ctx, a1 as Gate, a2);
    }
    console.error(USAGE);
    return false;
  } catch (e) {
    console.error(`tracker error: ${(e as Error).message}`);
    return false;
  }
}
