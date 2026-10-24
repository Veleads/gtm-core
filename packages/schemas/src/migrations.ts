import { isMap, isScalar, type Document } from "yaml";
import { FILE_VERSIONS, type FileKind } from "./versions.ts";

/**
 * One step that rewrites a project YAML file from `from` to `from + 1`. Edit the parsed Document
 * in place (doc.setIn / doc.deleteIn) so comments and formatting in project files survive.
 */
export interface Migration {
  kind: FileKind;
  from: number;
  description: string;
  up(doc: Document): void;
}

/** Renames a key in place, keeping its position, value and comments. No-op if absent. */
export function renameKey(doc: Document, path: (string | number)[], from: string, to: string): void {
  const node = path.length ? doc.getIn(path, true) : doc.contents;
  if (!isMap(node)) return;
  const pair = node.items.find((p) => (isScalar(p.key) ? p.key.value : p.key) === from);
  if (!pair) return;
  if (isScalar(pair.key)) pair.key.value = to;
  else (pair as { key: unknown }).key = to;
}

const renameClientId = (doc: Document) => renameKey(doc, [], "client_id", "project_id");

/** Registry. Append only; never edit a released migration. */
export const MIGRATIONS: Migration[] = [
  // 0.3.0: "clients" became "projects" (one private repo per project).
  { kind: "project", from: 1, description: "client_id → project_id, owners.client_approver → owners.approver, status churned → closed", up(doc) {
    renameClientId(doc);
    renameKey(doc, ["owners"], "client_approver", "approver");
    if (doc.get("status") === "churned") doc.set("status", "closed");
  } },
  { kind: "icp", from: 1, description: "client_id → project_id", up: renameClientId },
  { kind: "signals", from: 1, description: "client_id → project_id", up: renameClientId },
  { kind: "campaign-config", from: 1, description: "client_id → project_id", up: renameClientId },
];

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
