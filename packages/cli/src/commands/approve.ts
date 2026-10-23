// gtm approve icp --by "<Name (side)>" [--notes "..."] [--date YYYY-MM-DD]
// Records the ICP gate after a human approved it in session, pinning a hash of the approved content.
// `gtm validate` fails if context/icp.yaml changes afterwards without a new approval.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseDocument } from "yaml";
import { IcpFile, IsoDate, icpContentHash } from "@gtm/schemas";

export function runApprove(root: string, gate: string | undefined, opts: { by?: string; notes?: string; date?: string }): boolean {
  if (gate !== "icp") {
    console.error('Usage: gtm approve icp --by "<Name (side)>" [--notes "<what was approved>"] [--date YYYY-MM-DD]');
    if (gate) console.error(`Only the icp gate is recorded by command for now; record "${gate}" in config.yaml → gates (AGENTS.md section 4).`);
    return false;
  }
  if (!opts.by?.trim()) { console.error('--by is required: the human who approved, e.g. --by "Maria Chen (client)"'); return false; }
  const date = opts.date ?? new Date().toISOString().slice(0, 10);
  if (!IsoDate.safeParse(date).success) { console.error(`--date must be YYYY-MM-DD (got "${date}")`); return false; }

  const file = join(root, "context", "icp.yaml");
  if (!existsSync(file)) { console.error("context/icp.yaml not found: run this from the root of a client repo"); return false; }
  const doc = parseDocument(readFileSync(file, "utf8"));
  if (doc.errors.length) { console.error(`context/icp.yaml: invalid YAML: ${doc.errors[0]!.message}`); return false; }

  const raw = doc.toJS() as Record<string, unknown>;
  const hash = icpContentHash(raw);
  const approval = { status: "approved", approved_by: opts.by.trim(), approved_at: date, content_hash: hash };
  // Never pin an ICP that would not validate.
  const check = IcpFile.safeParse({ ...raw, approval: { ...(raw.approval as object), ...approval } });
  if (!check.success) {
    console.error("context/icp.yaml is not valid, fix it before approving:");
    for (const i of check.error.issues) console.error(`  ✗ ${i.path.join(".") || "(root)"}: ${i.message}`);
    return false;
  }

  for (const [key, value] of Object.entries(approval)) doc.setIn(["approval", key], value);
  if (opts.notes) doc.setIn(["approval", "notes"], opts.notes);
  writeFileSync(file, doc.toString({ flowCollectionPadding: false, lineWidth: 0 }));
  console.log(`ICP approved by ${approval.approved_by} on ${date} (content ${hash}).`);
  console.log("Commit context/icp.yaml together with the run log that quotes the approval.");
  return true;
}
