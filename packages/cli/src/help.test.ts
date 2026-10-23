import assert from "node:assert/strict";
import { test } from "node:test";
import { COMMANDS, commandHelp, generalHelp } from "./help.ts";

test("general help lists every command and points agents to AGENTS.md", () => {
  const help = generalHelp("9.9.9");
  for (const name of Object.keys(COMMANDS)) assert.match(help, new RegExp(`^  ${name}\\s`, "m"));
  assert.match(help, /AGENTS\.md/);
  assert.match(help, /v9\.9\.9/);
});

test("every command documents usage, what it writes, and at least one example", () => {
  for (const [name, c] of Object.entries(COMMANDS)) {
    assert.ok(c.usage.startsWith(`gtm ${name}`), `${name}: usage starts with the command`);
    assert.ok(c.writes.length > 0, `${name}: writes`);
    assert.ok(c.examples.length > 0, `${name}: examples`);
    assert.match(commandHelp(name)!, /Writes: /);
  }
});

test("read-only commands say so", () => {
  for (const name of ["validate", "status"]) assert.match(COMMANDS[name]!.writes, /^Nothing/);
});

test("unknown command has no help", () => {
  assert.equal(commandHelp("nope"), null);
});
