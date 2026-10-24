// Records a human sign-off and pins a hash of the approved content, so `gtm validate` fails if the
// content changes afterwards without a new approval. Run only after the approver said yes in session.
//   gtm approve icp --by "<Name (role)>" [--notes ".."] [--date YYYY-MM-DD]
//   gtm approve copy <campaign> --by "<Name (role)>" [--notes ".."] [--date YYYY-MM-DD]
// The launch gate is recorded by hand in config.yaml (its content is the lead set in Postgres).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseDocument, type Document } from "yaml";
import type { z } from "zod";
import { CampaignConfig, IcpFile, IsoDate, copyContentHash, icpContentHash, isGitHubHandle } from "@gtm/schemas";
import { parse } from "yaml";
import { GitHubApi } from "../github.ts";
import { verifyPrApproval } from "../github-approval.ts";

const USAGE = `Usage:
  gtm approve icp --pr <number> [--notes ".."]                   (approver is a GitHub @handle)
  gtm approve copy <campaign> --pr <number> [--notes ".."]
  gtm approve icp --by "<Name (role)>" [--notes ".."] [--date YYYY-MM-DD]   (approver is a name)
  gtm approve copy <campaign> --by "<Name (role)>" [--notes ".."] [--date YYYY-MM-DD]`;

interface Opts { by?: string; notes?: string; date?: string; pr?: string; fetchImpl?: typeof fetch }

function load(file: string): Document | null {
  if (!existsSync(file)) { console.error(`${file} not found: run this from the root of a project repo`); return null; }
  const doc = parseDocument(readFileSync(file, "utf8"));
  if (doc.errors.length) { console.error(`${file}: invalid YAML: ${doc.errors[0]!.message}`); return null; }
  return doc;
}

/** Writes the approval at `path` in `doc`, after checking the whole file would still validate. */
function pin(file: string, doc: Document, path: string[], schema: z.ZodType, hash: string, opts: Required<Pick<Opts, "by" | "date">> & Opts & { via?: string }): boolean {
  const approval: Record<string, string> = { status: "approved", approved_by: opts.by, approved_at: opts.date, content_hash: hash };
  if (opts.notes) approval.notes = opts.notes;
  if (opts.via) approval.approved_via = opts.via;
  const candidate = doc.toJS() as Record<string, any>;
  let target = candidate;
  for (const key of path.slice(0, -1)) target = target[key] ??= {};
  target[path.at(-1)!] = { ...(target[path.at(-1)!] ?? {}), ...approval };
  const check = schema.safeParse(candidate);
  if (!check.success) {
    console.error(`${file} is not valid, fix it before approving:`);
    for (const i of check.error.issues) console.error(`  ✗ ${i.path.join(".") || "(root)"}: ${i.message}`);
    return false;
  }
  for (const [key, value] of Object.entries(approval)) doc.setIn([...path, key], value);
  if (!opts.via) doc.deleteIn([...path, "approved_via"]);
  writeFileSync(file, doc.toString({ flowCollectionPadding: false, lineWidth: 0 }));
  return true;
}

export async function runApprove(root: string, args: string[], opts: Opts): Promise<boolean> {
  const [gate, campaign] = args;
  if (gate !== "icp" && gate !== "copy") {
    console.error(USAGE);
    if (gate) console.error(`The "${gate}" gate is recorded by hand in config.yaml → gates (AGENTS.md section 4).`);
    return false;
  }
  if (gate === "copy" && !campaign) { console.error(USAGE); return false; }

  const approver: string | undefined = (existsSync(join(root, "project.yaml")) ? parse(readFileSync(join(root, "project.yaml"), "utf8")) : null)?.owners?.approver;
  const githubMode = isGitHubHandle(approver);
  const contentPath = gate === "icp" ? "context/icp.yaml" : `campaigns/${campaign}/copy.md`;
  const contentFile = join(root, contentPath);
  if (!existsSync(contentFile)) { console.error(`${contentPath} not found`); return false; }
  const local = readFileSync(contentFile, "utf8");
  if (gate === "copy" && !local.split("\n").some((l) => l.trim() && !/^\s*(>|#)/.test(l))) { console.error(`${contentPath} has no copy yet`); return false; }
  const hashOf = (text: string) => (gate === "icp" ? icpContentHash(parse(text)) : copyContentHash(text));

  let by: string, date: string, via: string | undefined;
  if (githubMode) {
    if (!opts.pr) {
      console.error(`The approver is ${approver} (GitHub mode): the approval is their APPROVED review on a pull request.`);
      console.error(`Open a PR with ${contentPath}, have ${approver} approve it on GitHub, then run: npx gtm approve ${gate}${campaign ? ` ${campaign}` : ""} --pr <number>`);
      return false;
    }
    const api = GitHubApi.fromRepo(root, opts.fetchImpl);
    if (typeof api === "string") { console.error(`Cannot verify on GitHub: ${api}`); return false; }
    const verified = await verifyPrApproval(api, opts.pr, approver!, contentPath);
    if (typeof verified === "string") { console.error(verified); return false; }
    if (hashOf(verified.approvedContent) !== hashOf(local)) {
      console.error(`Your local ${contentPath} differs from the version ${approver} approved on the PR. Check out / pull the PR's latest commit, then run this again.`);
      return false;
    }
    by = verified.reviewer; date = verified.approvedAt; via = verified.prUrl;
  } else {
    if (opts.pr) { console.error(`--pr needs a GitHub approver: set project.yaml → owners.approver to their @handle, or record with --by.`); return false; }
    by = opts.by?.trim() ?? "";
    if (!by) { console.error('--by is required: the human who approved, e.g. --by "Maria Chen (VP Marketing)"'); return false; }
    date = opts.date ?? new Date().toISOString().slice(0, 10);
    if (!IsoDate.safeParse(date).success) { console.error(`--date must be YYYY-MM-DD (got "${date}")`); return false; }
  }

  const hash = hashOf(local);
  const file = gate === "icp" ? contentFile : join(root, "campaigns", campaign!, "config.yaml");
  const doc = load(file);
  if (!doc) return false;
  const path = gate === "icp" ? ["approval"] : ["gates", "copy"];
  if (!pin(file, doc, path, gate === "icp" ? IcpFile : CampaignConfig, hash, { ...opts, by, date, via })) return false;
  const what = gate === "icp" ? "ICP" : `Copy for ${campaign}`;
  console.log(`${what} approved by ${by} on ${date}${via ? ` via ${via}` : ""} (content ${hash}).`);
  console.log(`Commit ${gate === "icp" ? "context/icp.yaml" : `campaigns/${campaign}/config.yaml and copy.md`} together with the run log that quotes the approval${via ? "" : ""}.`);
  if (via) console.log(`Then close the tracker item: npx gtm track gate-done ${gate}${campaign ? ` ${campaign}` : ""}`);
  return true;
}
