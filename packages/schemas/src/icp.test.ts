import assert from "node:assert/strict";
import { test } from "node:test";
import { IcpFile, resolveIcp } from "./icp.ts";

const base = {
  version: 2,
  project_id: "acme",
  approval: { status: "pending", approved_by: null, approved_at: null },
  personas: [
    { id: "founder", role: "decision_maker", titles_any: ["Founder", "Managing Director"] },
    { id: "head-of-ta", role: "champion", titles_any: ["Head of Talent"] },
  ],
};

const icp = (extra: object) => IcpFile.parse({ ...base, ...extra });

test("segment fields replace core fields; unset fields inherit from core; lists are not combined", () => {
  const r = resolveIcp(icp({
    core: { firmographics: { industries: ["Staffing and Recruiting"], employee_count: { min: 20, max: 200 }, technologies_any: ["Bullhorn"] } },
    segments: [
      { id: "uk", description: "UK", firmographics: { hq_countries: ["GB"] } },
      { id: "uk-ent", description: "UK enterprise", firmographics: { hq_countries: ["GB"], employee_count: { min: 200, max: 1000 }, technologies_any: ["Salesforce"] } },
    ],
  }));
  const [uk, ent] = r.segments;
  assert.deepEqual(uk!.firmographics.industries, ["Staffing and Recruiting"]);
  assert.deepEqual(uk!.firmographics.employee_count, { min: 20, max: 200 });
  assert.deepEqual(uk!.firmographics.hq_countries, ["GB"]);
  assert.deepEqual(uk!.overrides, ["hq_countries"]);
  assert.deepEqual(ent!.firmographics.employee_count, { min: 200, max: 1000 });
  assert.deepEqual(ent!.firmographics.technologies_any, ["Salesforce"], "replaced, not merged with core");
  assert.deepEqual(ent!.firmographics.industries, ["Staffing and Recruiting"]);
});

test("an ICP without core behaves exactly as before (defaults applied)", () => {
  const r = resolveIcp(icp({ segments: [{ id: "uk", description: "UK", firmographics: { industries: ["Software"], hq_countries: ["GB"] } }] }));
  assert.deepEqual(r.segments[0]!.firmographics, {
    industries: ["Software"], hq_countries: ["GB"], technologies_any: [], technologies_none: [], keywords_any: [], keywords_none: [],
  });
});

test("personas: all by default, restricted when a segment lists them; unknown ids rejected", () => {
  const r = resolveIcp(icp({
    core: { firmographics: { industries: ["Staffing and Recruiting"] } },
    segments: [{ id: "a", description: "A" }, { id: "b", description: "B", personas: ["head-of-ta"] }],
  }));
  assert.deepEqual(r.segments[0]!.personas, ["founder", "head-of-ta"]);
  assert.deepEqual(r.segments[1]!.personas, ["head-of-ta"]);
  const bad = IcpFile.safeParse({ ...base, segments: [{ id: "a", description: "A", firmographics: { industries: ["X"] }, personas: ["cfo"] }] });
  assert.equal(bad.success, false);
  assert.match(JSON.stringify(bad.error?.issues), /unknown persona \\"cfo\\"/);
});

test("a segment with no filters at all (core + segment) is rejected", () => {
  const res = IcpFile.safeParse({ ...base, segments: [{ id: "everyone", description: "?" }] });
  assert.equal(res.success, false);
  assert.match(JSON.stringify(res.error?.issues), /would match every company/);
});

test("an override that makes the size range impossible is rejected", () => {
  const res = IcpFile.safeParse({ ...base,
    core: { firmographics: { employee_count: { min: 50, max: 200 } } },
    segments: [{ id: "s", description: "S", firmographics: { employee_count: { min: 300, max: 100 } } }] });
  assert.equal(res.success, false);
});
