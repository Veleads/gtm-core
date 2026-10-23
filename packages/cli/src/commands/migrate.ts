// gtm migrate: rewrites client YAML files to the schema versions of the installed core.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseDocument } from "yaml";
import { migrateDocument, type FileKind } from "@gtm/schemas";
import { subdirs } from "../fsutil.ts";

export function clientYamlFiles(root: string): { kind: FileKind; file: string }[] {
  const files: { kind: FileKind; file: string }[] = [
    { kind: "client", file: join(root, "client.yaml") },
    { kind: "icp", file: join(root, "context", "icp.yaml") },
    { kind: "signals", file: join(root, "context", "signals.yaml") },
    ...subdirs(join(root, "campaigns")).map((c) => ({ kind: "campaign-config" as const, file: join(root, "campaigns", c, "config.yaml") })),
  ];
  return files.filter((f) => existsSync(f.file));
}

export function runMigrate(root: string, opts: { dryRun?: boolean } = {}): boolean {
  let ok = true;
  let changed = 0;
  for (const { kind, file } of clientYamlFiles(root)) {
    const rel = relative(root, file);
    const doc = parseDocument(readFileSync(file, "utf8"));
    if (doc.errors.length) { console.log(`  ✗ ${rel}: invalid YAML: ${doc.errors[0]!.message}`); ok = false; continue; }
    try {
      const res = migrateDocument(kind, doc);
      if (res.applied.length === 0) continue;
      changed++;
      for (const a of res.applied) console.log(`  ${opts.dryRun ? "would apply" : "applied"} ${rel}: ${a}`);
      // Keep client formatting close to hand-written: no padding inside [ ], no line wrapping.
      if (!opts.dryRun) writeFileSync(file, doc.toString({ flowCollectionPadding: false, lineWidth: 0 }));
    } catch (e) {
      console.log(`  ✗ ${rel}: ${(e as Error).message}`);
      ok = false;
    }
  }
  console.log(changed ? `${changed} file(s) ${opts.dryRun ? "need migration" : "migrated"}` : "all files at current schema versions");
  return ok;
}
