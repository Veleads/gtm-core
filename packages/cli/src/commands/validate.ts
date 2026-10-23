// gtm validate [campaign]: checks a client repo against the installed core's schemas and rules.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { z } from "zod";
import {
  CampaignConfig, ClientFile, FEATURES, FILE_VERSIONS, IcpFile, SignalsFile, Stage, copyContentHash, icpContentHash, type Approval, type FileKind,
} from "@gtm/schemas";
import { Report, subdirs, walk } from "../fsutil.ts";
import { GTM_VERSION, KIT_DIR, PACKAGE_NAME } from "../paths.ts";

const REQUIRED_CONTEXT = ["intake.md", "icp.md", "icp.yaml", "signals.yaml", "personas.md", "offer.md", "proof.md", "voice.md"];
const REQUIRED_CAMPAIGN = ["brief.md", "config.yaml", "copy.md"];
const DATA_FILES = /\.(csv|tsv|xlsx?|parquet|jsonl|ndjson)$/i;
const RUN_LOG_NAME = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const ALLOWED_EMAIL = /@(example\.(com|org|net)|[a-z0-9-]+\.example)$/i;
const SKIP_DIRS = ["node_modules", ".git", ".gtm"];

const stageIndex = (s: Stage) => Stage.options.indexOf(s);

export function readPackageJson(root: string): Record<string, any> | null {
  const p = join(root, "package.json");
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
}

export function pinnedVersion(root: string): string | null {
  const pkg = readPackageJson(root);
  return pkg?.devDependencies?.[PACKAGE_NAME] ?? pkg?.dependencies?.[PACKAGE_NAME] ?? null;
}

function loadVersioned<S extends z.ZodType>(r: Report, file: string, kind: FileKind, schema: S): z.infer<S> | null {
  if (!existsSync(file)) { r.err(file, "missing"); return null; }
  let raw: any;
  try { raw = parse(readFileSync(file, "utf8")); } catch (e) { r.err(file, `invalid YAML: ${(e as Error).message}`); return null; }
  const expected = FILE_VERSIONS[kind];
  if (raw?.version !== expected) {
    if (typeof raw?.version === "number" && raw.version < expected) r.err(file, `is version ${raw.version}, core v${GTM_VERSION} expects ${expected}: run \`pnpm gtm migrate\``);
    else if (typeof raw?.version === "number") r.err(file, `is version ${raw.version}, newer than core v${GTM_VERSION} (${expected}): run \`pnpm gtm upgrade\``);
    else r.err(file, `missing "version: ${expected}"`);
    return null;
  }
  const res = schema.safeParse(raw);
  if (!res.success) {
    for (const issue of res.error.issues) r.err(file, `${issue.path.join(".") || "(root)"}: ${issue.message}`);
    return null;
  }
  return res.data;
}

function checkCoreSync(r: Report, root: string) {
  const pinned = pinnedVersion(root);
  if (!pinned) return; // not a client repo (e.g. examples/ in gtm-core)
  if (!/^\d+\.\d+\.\d+/.test(pinned)) r.err(join(root, "package.json"), `${PACKAGE_NAME} must be pinned exactly (got "${pinned}")`);
  const versionFile = join(root, ".gtm", "VERSION");
  const synced = existsSync(versionFile) ? readFileSync(versionFile, "utf8").trim() : null;
  if (synced !== GTM_VERSION) r.err(versionFile, `is ${synced ?? "missing"}, installed core is ${GTM_VERSION}: run \`pnpm gtm sync\``);
  if (!existsSync(join(root, "AGENTS.md"))) r.err(join(root, "AGENTS.md"), "missing: run `pnpm gtm sync`");
}

/** Data rule: no lead data in git. Blocks data files, flags real-looking email addresses. */
function checkNoLeadData(r: Report, root: string) {
  for (const rel of walk(root, SKIP_DIRS)) {
    const file = join(root, rel);
    if (DATA_FILES.test(rel)) { r.err(file, "data files are not allowed in a client repo (lead data belongs in Postgres)"); continue; }
    if (!/\.(md|ya?ml|txt)$/i.test(rel) || rel === "pnpm-lock.yaml") continue;
    if (/\.ya?ml$/i.test(rel) && /\bTODO\b/.test(readFileSync(file, "utf8"))) r.warn(file, "still contains TODO placeholders");
    const found = (readFileSync(file, "utf8").match(EMAIL) ?? []).filter((e) => !ALLOWED_EMAIL.test(e));
    if (found.length) r.warn(file, `contains email address(es) ${[...new Set(found)].slice(0, 3).join(", ")}: confirm none are prospects`);
  }
}

/**
 * A pinned gate holds only while its content is unchanged since approval. Approvals recorded before
 * hashes existed (no content_hash) still count, with a warning to pin them.
 */
function checkPinnedApproval(r: Report, contentFile: string, approval: Approval, current: string, what: string, approveCmd: string): boolean {
  if (approval.status !== "approved") return false;
  const pinned = approval.content_hash;
  if (!pinned) {
    r.warn(contentFile, `${what} approved without a content hash: pin it with \`${approveCmd} --by "${approval.approved_by}" --date ${approval.approved_at}\``);
    return true;
  }
  if (current === pinned) return true;
  r.err(contentFile, `${what} changed after approval (approved ${pinned}, now ${current}). Re-present it to the approver and record it with \`${approveCmd} --by "<name>"\`, or revert the change`);
  return false;
}

function validateCampaign(r: Report, root: string, clientId: string, campaign: string, icp: IcpFile | null, signals: SignalsFile | null, icpApproved: boolean) {
  const dir = join(root, "campaigns", campaign);
  console.log(`campaign ${campaign}`);
  for (const f of REQUIRED_CAMPAIGN) if (!existsSync(join(dir, f))) r.err(join(dir, f), "missing");

  const cfgFile = join(dir, "config.yaml");
  const cfg = loadVersioned(r, cfgFile, "campaign-config", CampaignConfig);
  if (cfg) {
    if (cfg.client_id !== clientId) r.err(cfgFile, `client_id "${cfg.client_id}" does not match client.yaml "${clientId}"`);
    if (cfg.campaign_id !== campaign) r.err(cfgFile, `campaign_id "${cfg.campaign_id}" does not match folder "${campaign}"`);

    if (icp) {
      const segs = new Set(icp.segments.map((s) => s.id));
      const pers = new Set(icp.personas.map((p) => p.id));
      for (const s of cfg.segments) if (!segs.has(s)) r.err(cfgFile, `segment "${s}" not in context/icp.yaml`);
      for (const p of cfg.personas) if (!pers.has(p)) r.err(cfgFile, `persona "${p}" not in context/icp.yaml`);
    }
    if (signals) {
      const keys = new Set(signals.signals.map((s) => s.key));
      for (const k of cfg.scoring.signals) if (!keys.has(k)) r.err(cfgFile, `scoring signal "${k}" not in context/signals.yaml`);
    }

    const providers = new Set([...cfg.enrichment.email_waterfall, cfg.enrichment.verification.provider, cfg.sending.sender]);
    for (const p of providers) {
      if (!p.startsWith("mock-") && !existsSync(join(KIT_DIR, "providers", `${p}.md`))) r.warn(cfgFile, `no .gtm/providers/${p}.md documenting "${p}"`);
    }
    if (stageIndex(cfg.stage) > stageIndex("tam") && !existsSync(join(root, "tam", `${cfg.tam_id}.md`))) {
      r.err(cfgFile, `stage is "${cfg.stage}" but tam/${cfg.tam_id}.md does not exist`);
    }

    // Gates: a campaign cannot be past a gate that a human has not approved.
    if (stageIndex(cfg.stage) > stageIndex("icp") && !icpApproved) {
      r.err(cfgFile, `stage is "${cfg.stage}" but the ICP gate (context/icp.yaml approval) is not approved, or the ICP changed since approval`);
    }
    const copyFile = join(dir, "copy.md");
    const copyApproved = existsSync(copyFile)
      ? checkPinnedApproval(r, copyFile, cfg.gates.copy, copyContentHash(readFileSync(copyFile, "utf8")), "copy", `pnpm gtm approve copy ${campaign}`)
      : false;
    if (stageIndex(cfg.stage) > stageIndex("copy") && !copyApproved) {
      r.err(cfgFile, `stage is "${cfg.stage}" but gates.copy is not approved, or copy.md changed since approval`);
    }
    if (stageIndex(cfg.stage) > stageIndex("launch") && cfg.gates.launch.status !== "approved") {
      r.err(cfgFile, `stage is "${cfg.stage}" but gates.launch is not approved`);
    }
    if (cfg.gates.launch.status === "approved" && !copyApproved) {
      r.err(cfgFile, "gates.launch is approved but gates.copy is not");
    }
    if (stageIndex(cfg.stage) > stageIndex("qa") && !existsSync(join(dir, "qa.md"))) {
      r.err(join(dir, "qa.md"), "missing: QA report is required before launch");
    }
  }

  const runs = join(dir, "runs");
  if (existsSync(runs)) {
    for (const f of readdirSync(runs).filter((f) => !f.startsWith("."))) {
      if (!RUN_LOG_NAME.test(f)) r.err(join(runs, f), "run logs must be named YYYY-MM-DD-<user>[-n].md");
    }
  }
}

export function runValidate(root: string, onlyCampaign?: string): boolean {
  const r = new Report(root);
  console.log(`validating ${root} against core v${GTM_VERSION}`);
  checkCoreSync(r, root);

  const meta = loadVersioned(r, join(root, "client.yaml"), "client", ClientFile);
  const clientId = meta?.client_id ?? "";
  if (meta) {
    for (const key of Object.keys(meta.features)) {
      if (!FEATURES[key]) r.err(join(root, "client.yaml"), `unknown feature "${key}" (known: ${Object.keys(FEATURES).join(", ") || "none"})`);
    }
  }
  if (!existsSync(join(root, "CLIENT.md"))) r.warn(join(root, "CLIENT.md"), "missing (client-specific rules for agents)");

  for (const f of REQUIRED_CONTEXT) if (!existsSync(join(root, "context", f))) r.err(join(root, "context", f), "missing");
  const icpFile = join(root, "context", "icp.yaml");
  const sigFile = join(root, "context", "signals.yaml");
  const icp = existsSync(icpFile) ? loadVersioned(r, icpFile, "icp", IcpFile) : null;
  const signals = existsSync(sigFile) ? loadVersioned(r, sigFile, "signals", SignalsFile) : null;
  if (meta && icp && icp.client_id !== clientId) r.err(icpFile, `client_id "${icp.client_id}" does not match client.yaml "${clientId}"`);
  if (meta && signals && signals.client_id !== clientId) r.err(sigFile, `client_id "${signals.client_id}" does not match client.yaml "${clientId}"`);
  const icpApproved = icp
    ? checkPinnedApproval(r, icpFile, icp.approval, icpContentHash(parse(readFileSync(icpFile, "utf8"))), "ICP", "pnpm gtm approve icp")
    : false;

  checkNoLeadData(r, root);

  const campaigns = onlyCampaign ? [onlyCampaign] : subdirs(join(root, "campaigns"));
  for (const c of campaigns) {
    if (!existsSync(join(root, "campaigns", c))) { r.err(join(root, "campaigns", c), "campaign folder not found"); continue; }
    validateCampaign(r, root, clientId, c, icp, signals, icpApproved);
  }

  r.summary();
  return r.errors === 0;
}
