import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

// Stack settings live outside every repo; point them at a throwaway folder before the modules load.
process.env.GTM_STACKS_DIR = mkdtempSync(join(tmpdir(), "gtm-stacks-"));
const { composeEnv, stackEnvText, stackSettings, WORKER_IMAGE } = await import("./commands/stack.ts");
const { GTM_VERSION } = await import("./paths.ts");

test("each project gets its own compose project, settings file and worker image at the pinned core version", () => {
  const s = stackSettings("acme", {});
  assert.equal(s.composeProject, "gtm-acme");
  assert.equal(s.envFile, join(process.env.GTM_STACKS_DIR!, "acme.env"));
  assert.equal(s.secretsFile, join(process.env.GTM_STACKS_DIR!, "acme.secrets.env"));
  assert.equal(s.workerImage, `${WORKER_IMAGE}:${GTM_VERSION}`);
  assert.deepEqual(s.ports, { GTM_PG_PORT: 5432, GTM_HATCHET_UI_PORT: 8888, GTM_HATCHET_GRPC_PORT: 7077 });
  assert.match(s.composeFile, /kit[\\/]stack[\\/]docker-compose\.yml$/);
});

test("ports: env var beats the saved settings, saved settings beat the default", () => {
  writeFileSync(join(process.env.GTM_STACKS_DIR!, "beta.env"), "GTM_PG_PORT=5433\nGTM_HATCHET_UI_PORT=8889\n");
  const s = stackSettings("beta", { GTM_HATCHET_UI_PORT: "9999" });
  assert.equal(s.ports.GTM_PG_PORT, 5433);
  assert.equal(s.ports.GTM_HATCHET_UI_PORT, 9999);
  assert.equal(s.ports.GTM_HATCHET_GRPC_PORT, 7077);
});

test("invalid ports are refused", () => {
  assert.throws(() => stackSettings("acme", { GTM_PG_PORT: "nope" }), /GTM_PG_PORT must be a port number/);
});

test("GTM_WORKER_IMAGE overrides the published image (local builds)", () => {
  assert.equal(stackSettings("acme", { GTM_WORKER_IMAGE: "gtm-worker:dev" }).workerImage, "gtm-worker:dev");
});

test("compose env and the settings file agree on ports and carry the token", () => {
  const s = stackSettings("acme", { GTM_PG_PORT: "6000" });
  const env = composeEnv(s, "tok");
  assert.equal(env.GTM_PG_PORT, "6000");
  assert.equal(env.HATCHET_CLIENT_TOKEN, "tok");
  assert.equal(env.GTM_SECRETS_FILE, s.secretsFile);
  const text = stackEnvText(s, "tok");
  assert.match(text, /^DATABASE_URL=postgresql:\/\/gtm:gtm@localhost:6000\/gtm$/m);
  assert.match(text, /^HATCHET_CLIENT_TOKEN=tok$/m);
  assert.match(text, /^GTM_PG_PORT=6000$/m);
});
