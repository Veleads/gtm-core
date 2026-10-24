import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { copyContentHash } from "@gtm/schemas";
import { GitHubApi, parseRepoUrl } from "./github.ts";
import { prNumber, verifyPrApproval, verifyRecordedApproval } from "./github-approval.ts";
import { GitHubTracker } from "./tracker/github.ts";
import { expectedCodeowners } from "./commands/sync.ts";

type Route = [method: string, pattern: RegExp, handler: (m: RegExpMatchArray, body: any) => unknown];

/** In-memory GitHub: routes are matched against "<METHOD> <path after /repos/o/r>". */
function fakeFetch(routes: Route[]): typeof fetch {
  return (async (url: string, init?: RequestInit) => {
    const path = url.replace("https://api.github.com/repos/acme/proj", "");
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    for (const [m, re, h] of routes) {
      const match = path.match(re);
      if (m === method && match) return new Response(JSON.stringify(h(match, body) ?? {}), { status: 200 });
    }
    return new Response(`no route for ${method} ${path}`, { status: 404 });
  }) as typeof fetch;
}
const api = (routes: Route[]) => new GitHubApi({ owner: "acme", repo: "proj" }, "t", fakeFetch(routes));
const b64 = (s: string) => Buffer.from(s).toString("base64");

test("parses https and ssh GitHub remotes", () => {
  assert.deepEqual(parseRepoUrl("https://github.com/Veleads/gtm-project-acme.git"), { owner: "Veleads", repo: "gtm-project-acme" });
  assert.deepEqual(parseRepoUrl("git@github.com:Veleads/gtm-project-acme.git"), { owner: "Veleads", repo: "gtm-project-acme" });
  assert.equal(parseRepoUrl("https://gitlab.com/a/b.git"), null);
  assert.equal(prNumber("https://github.com/acme/proj/pull/12"), 12);
  assert.equal(prNumber("#7"), 7);
});

test("tracker: upsert is idempotent by key and swaps stage labels", async () => {
  const issues: any[] = [];
  const tracker = new GitHubTracker(api([
    ["GET", /^\/issues\?/, () => issues],
    ["POST", /^\/issues$/, (_m, b) => { const i = { number: issues.length + 1, html_url: `u/${issues.length + 1}`, state: "open", body: b.body, labels: b.labels.map((name: string) => ({ name })), title: b.title }; issues.push(i); return i; }],
    ["PATCH", /^\/issues\/(\d+)$/, (m, b) => { const i = issues[Number(m[1]) - 1]; Object.assign(i, b, b.labels ? { labels: b.labels.map((name: string) => ({ name })) } : {}); return i; }],
    ["POST", /^\/issues\/(\d+)\/comments$/, () => ({})],
  ]));
  const item = { key: "campaign:q1", title: "Campaign: q1", body: "b", labels: ["campaign", "stage:tam"], exclusiveLabelPrefixes: ["stage:"] };
  const first = await tracker.upsert(item);
  const second = await tracker.upsert({ ...item, labels: ["campaign", "stage:enrich"] });
  assert.equal(issues.length, 1);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.deepEqual(issues[0].labels.map((l: any) => l.name).sort(), ["campaign", "gtm", "stage:enrich"]);
  await tracker.close("campaign:q1", "done");
  assert.equal(issues[0].state, "closed");
});

const copy = "# Copy\n> Status: awaiting sign-off\n\nHi {{first_name}}, close moved from day 9 to day 4.\n";
function prRoutes(opts: { author?: string; reviews?: any[]; files?: string[]; content?: string; head?: string }): Route[] {
  const head = opts.head ?? "abc123";
  return [
    ["GET", /^\/pulls\/12$/, () => ({ number: 12, html_url: "https://github.com/acme/proj/pull/12", head: { sha: head }, user: { login: opts.author ?? "abdullah" } })],
    ["GET", /^\/pulls\/12\/files/, () => (opts.files ?? ["campaigns/q1/copy.md"]).map((filename) => ({ filename }))],
    ["GET", /^\/pulls\/12\/reviews/, () => opts.reviews ?? [{ user: { login: "Maria" }, state: "APPROVED", commit_id: head, submitted_at: "2026-10-24T10:00:00Z" }]],
    ["GET", /^\/contents\/campaigns\/q1\/copy\.md\?ref=/, () => ({ content: b64(opts.content ?? copy), encoding: "base64" })],
  ];
}
const verify = (routes: Route[]) => verifyPrApproval(api(routes), "12", "@maria", "campaigns/q1/copy.md");

test("approval: accepted when the approver approved the latest commit", async () => {
  const res = await verify(prRoutes({}));
  assert.ok(typeof res !== "string", String(res));
  assert.equal(res.reviewer, "@Maria");
  assert.equal(res.approvedAt, "2026-10-24");
  assert.equal(res.approvedContent, copy);
});

test("approval: refused for the PR author, an older commit, a later change request, or an unrelated PR", async () => {
  assert.match(String(await verify(prRoutes({ author: "maria" }))), /doesn't let authors approve/);
  assert.match(String(await verify(prRoutes({ reviews: [{ user: { login: "maria" }, state: "APPROVED", commit_id: "old", submitted_at: "2026-10-24T10:00:00Z" }] }))), /older commit/);
  assert.match(String(await verify(prRoutes({ reviews: [
    { user: { login: "maria" }, state: "APPROVED", commit_id: "abc123", submitted_at: "2026-10-24T10:00:00Z" },
    { user: { login: "maria" }, state: "CHANGES_REQUESTED", commit_id: "abc123", submitted_at: "2026-10-24T11:00:00Z" },
  ] }))), /has not approved/);
  assert.match(String(await verify(prRoutes({ reviews: [{ user: { login: "sara" }, state: "APPROVED", commit_id: "abc123", submitted_at: "x" }] }))), /has not approved/);
  assert.match(String(await verify(prRoutes({ files: ["README.md"] }))), /does not change/);
});

test("CI verification: the reviewed commit must match the pinned hash", async () => {
  const routes = prRoutes({});
  const url = "https://github.com/acme/proj/pull/12";
  assert.equal(await verifyRecordedApproval(api(routes), url, "@maria", "campaigns/q1/copy.md", copyContentHash(copy), copyContentHash), true);
  assert.match(String(await verifyRecordedApproval(api(prRoutes({ content: copy.replace("day 4", "day 3") })), url, "@maria", "campaigns/q1/copy.md", copyContentHash(copy), copyContentHash)), /is pinned/);
  assert.match(String(await verifyRecordedApproval(api(routes), "https://github.com/other/repo/pull/12", "@maria", "campaigns/q1/copy.md", copyContentHash(copy), copyContentHash)), /another repository/);
});

test("CODEOWNERS: managed block for a GitHub approver, user lines kept, removed for a named approver", () => {
  const root = mkdtempSync(join(tmpdir(), "gtm-co-"));
  mkdirSync(join(root, ".github"));
  writeFileSync(join(root, ".github", "CODEOWNERS"), "/docs/ @docs-team\n");
  writeFileSync(join(root, "project.yaml"), "owners: {approver: '@maria'}\n");
  const withBlock = expectedCodeowners(root)!;
  assert.match(withBlock, /^\/docs\/ @docs-team/);
  assert.match(withBlock, /\/context\/icp\.yaml @maria/);
  assert.match(withBlock, /\/campaigns\/\*\/copy\.md @maria/);
  writeFileSync(join(root, ".github", "CODEOWNERS"), withBlock);
  assert.equal(expectedCodeowners(root), withBlock, "stable on re-run");
  writeFileSync(join(root, "project.yaml"), "owners: {approver: 'Maria Chen (VP)'}\n");
  assert.equal(expectedCodeowners(root), "/docs/ @docs-team\n");
  assert.equal(readFileSync(join(root, ".github", "CODEOWNERS"), "utf8"), withBlock, "pure: no writes");
});
