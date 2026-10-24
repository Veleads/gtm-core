// gtm stack up|down [--wipe]|status: this project's own stack (Postgres + hatchet-lite + gtm worker) on
// Docker. One stack per project: compose project gtm-<project_id>, its own volumes, the worker image at
// the core version this repo pins. Settings go to ~/.gtm/stacks/<project_id>.env (outside the repo).
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { createHatchetToken, hatchetReady, projectSecretsFile, projectStackEnvFile, readEnvFile, STACKS_DIR, waitFor } from "@gtm/core";
import { ProjectFile } from "@gtm/schemas";
import { GTM_VERSION, KIT_DIR } from "../paths.ts";

export const WORKER_IMAGE = "ghcr.io/veleads/gtm-worker";
const PORTS = { GTM_PG_PORT: 5432, GTM_HATCHET_UI_PORT: 8888, GTM_HATCHET_GRPC_PORT: 7077 } as const;
type PortKey = keyof typeof PORTS;

export interface StackSettings {
  projectId: string;
  composeProject: string;
  composeFile: string;
  envFile: string;
  secretsFile: string;
  workerImage: string;
  ports: Record<PortKey, number>;
}

/** Ports: env var, else what the last `up` saved, else the default. Image: env override, else this core version. */
export function stackSettings(projectId: string, env: NodeJS.ProcessEnv = process.env): StackSettings {
  const envFile = projectStackEnvFile(projectId);
  const saved = readEnvFile(envFile);
  const ports = Object.fromEntries(
    (Object.keys(PORTS) as PortKey[]).map((k) => [k, Number(env[k] ?? saved[k] ?? PORTS[k])]),
  ) as Record<PortKey, number>;
  for (const [k, v] of Object.entries(ports)) if (!Number.isInteger(v) || v < 1 || v > 65535) throw new Error(`${k} must be a port number, got "${v}"`);
  return {
    projectId,
    composeProject: `gtm-${projectId}`,
    composeFile: join(KIT_DIR, "stack", "docker-compose.yml"),
    envFile,
    secretsFile: projectSecretsFile(projectId),
    workerImage: env.GTM_WORKER_IMAGE ?? `${WORKER_IMAGE}:${GTM_VERSION}`,
    ports,
  };
}

/** Variables docker compose interpolates into kit/stack/docker-compose.yml. */
export function composeEnv(s: StackSettings, token = ""): Record<string, string> {
  return {
    ...Object.fromEntries(Object.entries(s.ports).map(([k, v]) => [k, String(v)])),
    GTM_WORKER_IMAGE: s.workerImage,
    GTM_SECRETS_FILE: s.secretsFile,
    HATCHET_CLIENT_TOKEN: token,
  };
}

/** The env file `gtm job` reads: how to reach this project's Hatchet and database from this machine. */
export function stackEnvText(s: StackSettings, token: string): string {
  return [
    `# Written by \`gtm stack up\` for project ${s.projectId}. Local stack only; never commit.`,
    `DATABASE_URL=postgresql://gtm:gtm@localhost:${s.ports.GTM_PG_PORT}/gtm`,
    `HATCHET_CLIENT_TOKEN=${token}`,
    "HATCHET_CLIENT_TLS_STRATEGY=none",
    ...Object.entries(s.ports).map(([k, v]) => `${k}=${v}`),
    "",
  ].join("\n");
}

function compose(s: StackSettings, args: string[], opts: { token?: string; quiet?: boolean } = {}): string {
  const res = spawnSync("docker", ["compose", "-f", s.composeFile, "-p", s.composeProject, ...args], {
    env: { ...process.env, ...composeEnv(s, opts.token) },
    encoding: "utf8",
    stdio: opts.quiet ? "pipe" : ["ignore", "inherit", "inherit"],
  });
  if (res.error) throw new Error(`docker is not available (${res.error.message}). Install Docker Desktop or Docker Engine first.`);
  if (res.status !== 0) throw new Error(`docker compose ${args.join(" ")} failed${opts.quiet ? `: ${res.stderr || res.stdout}` : ""}`);
  return (res.stdout ?? "").trim();
}

async function up(s: StackSettings) {
  const ui = `http://localhost:${s.ports.GTM_HATCHET_UI_PORT}`;
  console.log(`• starting postgres + hatchet-lite (${s.composeProject})`);
  compose(s, ["up", "-d", "--wait", "postgres"]);
  compose(s, ["up", "-d", "hatchet-lite"]);
  await waitFor("hatchet-lite", () => hatchetReady(ui));

  console.log("• creating a Hatchet API token");
  const token = await createHatchetToken((service, args) => compose(s, ["exec", "-T", service, ...args], { quiet: true }), `gtm-${s.projectId}-${Date.now()}`);
  mkdirSync(STACKS_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(s.envFile, stackEnvText(s, token));
  chmodSync(s.envFile, 0o600);

  // The worker applies this core version's database migrations before it starts taking jobs.
  console.log(`• starting the worker (${s.workerImage})`);
  compose(s, ["up", "-d", "worker"], { token });

  console.log(`\nStack for ${s.projectId} is up.
  Hatchet UI   ${ui}   (local login admin@example.com / Admin123!!)
  Postgres     postgresql://gtm:gtm@localhost:${s.ports.GTM_PG_PORT}/gtm   (this project's database)
  Settings     ${s.envFile}   (used by \`npx gtm job\`)
  Secrets      ${s.secretsFile}   (provider API keys for the worker; ${existsSync(s.secretsFile) ? "found" : "not created yet"})
Next: \`npx gtm job tam <campaign>\`.`);
}

function down(s: StackSettings, wipe: boolean) {
  compose(s, ["down", ...(wipe ? ["-v"] : [])]);
  if (wipe) rmSync(s.envFile, { force: true });
  console.log(wipe
    ? `Stack stopped; this project's database, Hatchet state and ${s.envFile} are deleted (secrets file kept).`
    : "Stack stopped; data kept (`npx gtm stack up` to resume).");
}

async function status(s: StackSettings) {
  compose(s, ["ps"]);
  const ready = await hatchetReady(`http://localhost:${s.ports.GTM_HATCHET_UI_PORT}`);
  console.log(`hatchet: ${ready ? "ready" : "not ready"} · settings: ${existsSync(s.envFile) ? s.envFile : "missing (run `npx gtm stack up`)"} · worker image: ${s.workerImage}`);
}

export async function runStack(root: string, args: string[], opts: { wipe?: boolean } = {}): Promise<boolean> {
  const [action] = args;
  if (!action || !["up", "down", "status"].includes(action)) {
    console.error("Usage: gtm stack up | down [--wipe] | status");
    return false;
  }
  if (!existsSync(join(root, "project.yaml"))) { console.error("project.yaml not found: run gtm stack inside a project repo."); return false; }
  try {
    const project = ProjectFile.parse(parse(readFileSync(join(root, "project.yaml"), "utf8")));
    const s = stackSettings(project.project_id);
    if (action === "up") await up(s);
    else if (action === "down") down(s, Boolean(opts.wipe));
    else await status(s);
    return true;
  } catch (e) {
    console.error(`gtm stack ${action}: ${(e as Error).message}`);
    return false;
  }
}
