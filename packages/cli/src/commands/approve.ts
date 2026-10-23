// Records a human sign-off and pins a hash of the approved content, so `gtm validate` fails if the
// content changes afterwards without a new approval. Run only after the approver said yes in session.
//   gtm approve icp --by "<Name (side)>" [--notes ".."] [--date YYYY-MM-DD]
//   gtm approve copy <campaign> --by "<Name (side)>" [--notes ".."] [--date YYYY-MM-DD]
// The launch gate is recorded by hand in config.yaml (its content is the lead set in Postgres).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseDocument, type Document } from "yaml";
import type { z } from "zod";
import { CampaignConfig, IcpFile, IsoDate, copyContentHash, icpContentHash } from "@gtm/schemas";

const USAGE = `Usage:
  gtm approve icp --by "<Name (side)>" [--notes "<what was approved>"] [--date YYYY-MM-DD]
  gtm approve copy <campaign> --by "<Name (side)>" [--notes "<what was approved>"] [--date YYYY-MM-DD]`;

interface Opts { by?: string; notes?: string; date?: string }

function load(file: string): Document | null {
  if (!existsSync(file)) { console.error(`${file} not found: run this from the root of a client repo`); return null; }
  const doc = parseDocument(readFileSync(file, "utf8"));
  if (doc.errors.length) { console.error(`${file}: invalid YAML: ${doc.errors[0]!.message}`); return null; }
  return doc;
}

/** Writes the approval at `path` in `doc`, after checking the whole file would still validate. */
function pin(file: string, doc: Document, path: string[], schema: z.ZodType, hash: string, opts: Required<Pick<Opts, "by" | "date">> & Opts): boolean {
  const approval: Record<string, string> = { status: "approved", approved_by: opts.by, approved_at: opts.date, content_hash: hash };
  if (opts.notes) approval.notes = opts.notes;
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
  writeFileSync(file, doc.toString({ flowCollectionPadding: false, lineWidth: 0 }));
  return true;
}

export function runApprove(root: string, args: string[], opts: Opts): boolean {
  const [gate, campaign] = args;
  if (gate !== "icp" && gate !== "copy") {
    console.error(USAGE);
    if (gate) console.error(`The "${gate}" gate is recorded by hand in config.yaml → gates (AGENTS.md section 4).`);
    return false;
  }
  const by = opts.by?.trim();
  if (!by) { console.error('--by is required: the human who approved, e.g. --by "Maria Chen (client)"'); return false; }
  const date = opts.date ?? new Date().toISOString().slice(0, 10);
  if (!IsoDate.safeParse(date).success) { console.error(`--date must be YYYY-MM-DD (got "${date}")`); return false; }

  if (gate === "icp") {
    const file = join(root, "context", "icp.yaml");
    const doc = load(file);
    if (!doc) return false;
    const hash = icpContentHash(doc.toJS() as Record<string, unknown>);
    if (!pin(file, doc, ["approval"], IcpFile, hash, { ...opts, by, date })) return false;
    console.log(`ICP approved by ${by} on ${date} (content ${hash}).`);
    console.log("Commit context/icp.yaml together with the run log that quotes the approval.");
    return true;
  }

  if (!campaign) { console.error(USAGE); return false; }
  const dir = join(root, "campaigns", campaign);
  const copyFile = join(dir, "copy.md");
  if (!existsSync(copyFile)) { console.error(`campaigns/${campaign}/copy.md not found`); return false; }
  const copy = readFileSync(copyFile, "utf8");
  if (!copy.split("\n").some((l) => l.trim() && !/^\s*(>|#)/.test(l))) { console.error(`campaigns/${campaign}/copy.md has no copy yet`); return false; }
  const file = join(dir, "config.yaml");
  const doc = load(file);
  if (!doc) return false;
  const hash = copyContentHash(copy);
  if (!pin(file, doc, ["gates", "copy"], CampaignConfig, hash, { ...opts, by, date })) return false;
  console.log(`Copy for ${campaign} approved by ${by} on ${date} (content ${hash}).`);
  console.log(`Commit campaigns/${campaign}/config.yaml and copy.md together with the run log that quotes the approval.`);
  return true;
}
