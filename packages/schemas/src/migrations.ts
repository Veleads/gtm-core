import type { Document } from "yaml";
import { FILE_VERSIONS, type FileKind } from "./versions.ts";

/**
 * One step that rewrites a client YAML file from `from` to `from + 1`. Edit the parsed Document
 * in place (doc.setIn / doc.deleteIn) so comments and formatting in client files survive.
 */
export interface Migration {
  kind: FileKind;
  from: number;
  description: string;
  up(doc: Document): void;
}

/** Registry. Append only; never edit a released migration. */
export const MIGRATIONS: Migration[] = [];

export interface MigrationResult {
  from: number;
  to: number;
  applied: string[];
}

export function migrateDocument(
  kind: FileKind,
  doc: Document,
  migrations: Migration[] = MIGRATIONS,
  target: number = FILE_VERSIONS[kind],
): MigrationResult {
  const raw = doc.get("version");
  const from = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(from)) throw new Error(`${kind}: missing or invalid "version"`);
  if (from > target) throw new Error(`${kind}: file is version ${from}, newer than this core (${target}). Upgrade @veleads/gtm.`);

  const applied: string[] = [];
  for (let v = from; v < target; v++) {
    const step = migrations.find((m) => m.kind === kind && m.from === v);
    if (!step) throw new Error(`${kind}: no migration from version ${v} to ${v + 1}`);
    step.up(doc);
    doc.set("version", v + 1);
    applied.push(`${kind} v${v}→v${v + 1}: ${step.description}`);
  }
  return { from, to: target, applied };
}
