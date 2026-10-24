import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "yaml";
import { copyContentHash, icpContentHash } from "./approval-hash.ts";

const base = `version: 1
project_id: acme
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
  const reformatted = `# reviewed with the approver
project_id: acme   # the slug
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

const copy = `# Copy: q1

> Status: **awaiting sign-off**
> Variables: {{first_name}}

## Variant A
**Step 1.** Subject: \`AP hire at {{company_name}}\`

Hi {{first_name}},

We moved close from day 9 to day 4.
`;

test("copy: note lines, line endings, trailing spaces and blank-line runs do not count", () => {
  const touched = copy.replace("awaiting sign-off", "approved by Maria")
    .replace("> Variables: {{first_name}}", "> Variables: {{first_name}}, {{company_name}}")
    .replace(/\n/g, "\r\n").replace("Hi {{first_name}},", "Hi {{first_name}},   ") + "\n\n\n";
  assert.equal(copyContentHash(touched), copyContentHash(copy));
});

test("copy: any change to the email text changes the hash", () => {
  assert.notEqual(copyContentHash(copy.replace("day 4", "day 5")), copyContentHash(copy));
  assert.notEqual(copyContentHash(copy.replace("AP hire at", "AP hiring at")), copyContentHash(copy));
  assert.notEqual(copyContentHash(copy + "\n**Step 2.** Follow-up\n"), copyContentHash(copy));
});
