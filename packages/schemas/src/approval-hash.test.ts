import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "yaml";
import { icpContentHash } from "./approval-hash.ts";

const base = `version: 1
client_id: acme
approval: {status: pending, approved_by: null, approved_at: null}
segments:
  - id: seg-a
    description: A
    firmographics: {industries: [Software], employee_count: {min: 50, max: 500}}
personas:
  - {id: cfo, role: decision_maker, titles_any: [CFO]}
`;
const hash = (text: string) => icpContentHash(parse(text));

test("comments, formatting and key order do not change the hash", () => {
  const reformatted = `# reviewed with client
client_id: acme   # the slug
version: 1
personas:
  - id: cfo
    titles_any:
      - CFO
    role: decision_maker
segments:
  - firmographics:
      employee_count: {max: 500, min: 50}
      industries: [Software]
    id: seg-a
    description: A
approval: {status: pending, approved_by: null, approved_at: null}
`;
  assert.equal(hash(reformatted), hash(base));
});

test("approval and version fields are excluded", () => {
  const approved = base.replace("approval: {status: pending, approved_by: null, approved_at: null}",
    "approval: {status: approved, approved_by: Maria, approved_at: 2026-10-23, content_hash: sha256:0000000000000000}")
    .replace("version: 1", "version: 2");
  assert.equal(hash(approved), hash(base));
});

test("any content change does change the hash", () => {
  assert.notEqual(hash(base.replace("max: 500", "max: 600")), hash(base));
  assert.notEqual(hash(base.replace("[CFO]", "[CFO, Finance Director]")), hash(base));
  assert.notEqual(hash(base + "exclusions: {domains: [rival.example]}\n"), hash(base));
});

test("format is sha256 with 16 hex chars", () => {
  assert.match(hash(base), /^sha256:[0-9a-f]{16}$/);
});
