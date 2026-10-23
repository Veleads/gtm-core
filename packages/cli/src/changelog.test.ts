import assert from "node:assert/strict";
import { test } from "node:test";
import { changelogBetween, compareVersions } from "./changelog.ts";

const log = `# Changelog

## [Unreleased]

## [0.3.0] - 2026-11-01
- **opt-in** linkedin channel

## [0.2.0] - 2026-10-24
- **migration** campaign config v2

## [0.1.0] - 2026-10-23
- first
`;

test("returns sections after `from` up to and including `to`", () => {
  const out = changelogBetween(log, "0.1.0", "0.2.0");
  assert.match(out, /0\.2\.0[\s\S]*campaign config v2/);
  assert.doesNotMatch(out, /0\.3\.0|first|Unreleased/);
});

test("spans several releases", () => {
  const out = changelogBetween(log, "0.1.0", "0.3.0");
  assert.match(out, /linkedin channel/);
  assert.match(out, /campaign config v2/);
});

test("compares numerically", () => {
  assert.ok(compareVersions("0.10.0", "0.9.0") > 0);
  assert.equal(compareVersions("1.2.3", "1.2.3"), 0);
});
