import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDocument } from "yaml";
import { migrateDocument, type Migration } from "./migrations.ts";

const fake: Migration[] = [
  { kind: "campaign-config", from: 1, description: "rename owner → owners", up(doc) {
    doc.set("owners", [doc.get("owner")]);
    doc.delete("owner");
  } },
  { kind: "campaign-config", from: 2, description: "add channel", up(doc) { doc.set("channel", "email"); } },
];

test("applies the chain in order and keeps comments", () => {
  const doc = parseDocument("version: 1 # schema\n# who runs it\nowner: jdoe\nstage: copy # current\n");
  const res = migrateDocument("campaign-config", doc, fake, 3);
  assert.deepEqual([res.from, res.to, res.applied.length], [1, 3, 2]);
  const out = doc.toString();
  assert.match(out, /version: 3/);
  assert.match(out, /stage: copy # current/);
  assert.match(out, /owners:\n\s+- jdoe/);
  assert.match(out, /channel: email/);
});

test("is a no-op at the current version", () => {
  const doc = parseDocument("version: 3\n");
  assert.deepEqual(migrateDocument("campaign-config", doc, fake, 3).applied, []);
});

test("refuses files newer than core", () => {
  assert.throws(() => migrateDocument("campaign-config", parseDocument("version: 9\n"), fake, 3), /newer than this core/);
});

test("fails loudly on a gap in the chain", () => {
  assert.throws(() => migrateDocument("icp", parseDocument("version: 1\n"), fake, 2), /no migration from version 1/);
});
