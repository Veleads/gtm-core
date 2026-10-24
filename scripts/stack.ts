// Local stack lifecycle (docker-compose.yml): Postgres + hatchet-lite, gtm DB migrations, Hatchet token.
//   pnpm stack:up            start, migrate, create a token → ~/.gtm/stack.env (chmod 600)
//   pnpm stack:down [--wipe] stop (data kept) · --wipe also deletes all data and the env file
//   pnpm stack:status
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { STACK_ENV_FILE } from "../packages/core/src/stack-env.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATABASE_URL = "postgresql://gtm:gtm@localhost:5432/gtm";
const HATCHET_URL = "http://localhost:8888";

function sh(cmd: string, args: string[], opts: { cwd?: string; env?: NodeJS.ProcessEnv; quiet?: boolean } = {}) {
  const res = spawnSync(cmd, args, { cwd: opts.cwd ?? ROOT, env: { ...process.env, ...opts.env }, encoding: "utf8", stdio: opts.quiet ? "pipe" : ["ignore", "inherit", "inherit"] });
  if (res.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed${opts.quiet ? `: ${res.stderr || res.stdout}` : ""}`);
  return (res.stdout ?? "").trim();
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor(what: string, check: () => Promise<boolean> | boolean, seconds = 120) {
  for (let i = 0; i < seconds; i++) {
    if (await check()) return;
    await sleep(1000);
  }
  throw new Error(`timed out waiting for ${what}`);
}

async function hatchetReady() {
  try { return (await fetch(`${HATCHET_URL}/api/ready`)).ok; } catch { return false; }
}

async function up() {
  console.log("• starting postgres + hatchet-lite");
  sh("docker", ["compose", "up", "-d", "--wait", "postgres"]);
  sh("docker", ["compose", "up", "-d", "hatchet-lite"]);
  await waitFor("hatchet-lite", hatchetReady);

  console.log("• applying gtm database migrations");
  sh("npx", ["prisma", "migrate", "deploy"], { cwd: join(ROOT, "db"), env: { DATABASE_URL } });

  console.log("• creating a Hatchet API token");
  // The seeded "default" tenant. (Hatchet also creates an "internal" tenant whose queue is never
  // scheduled for user workers: a token for it makes jobs wait forever.)
  let tenant = "";
  await waitFor("hatchet tenant", () => {
    tenant = sh("docker", ["compose", "exec", "-T", "postgres", "psql", "-U", "gtm", "-d", "hatchet", "-tAc", `select id from "Tenant" where slug = 'default'`], { quiet: true });
    return /^[0-9a-f-]{36}$/.test(tenant);
  });
  let token = "";
  await waitFor("hatchet token", () => {
    try {
      token = sh("docker", ["compose", "exec", "-T", "hatchet-lite", "/hatchet-admin", "token", "create", "--config", "/config", "--tenant-id", tenant, "--name", `gtm-local-${Date.now()}`], { quiet: true }).split("\n").at(-1)!.trim();
    } catch { token = ""; }
    return /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(token);
  }, 60);

  mkdirSync(dirname(STACK_ENV_FILE), { recursive: true });
  writeFileSync(STACK_ENV_FILE, `# Written by \`pnpm stack:up\` in gtm-core. Local stack only; never commit.\nDATABASE_URL=${DATABASE_URL}\nHATCHET_CLIENT_TOKEN=${token}\nHATCHET_CLIENT_TLS_STRATEGY=none\n`);
  chmodSync(STACK_ENV_FILE, 0o600);

  console.log(`\nStack is up.
  Hatchet UI   ${HATCHET_URL}   (local login admin@example.com / Admin123!!)
  Postgres     ${DATABASE_URL}
  Settings     ${STACK_ENV_FILE}   (used by the worker and \`npx gtm job\`)
Next: \`pnpm worker\` in gtm-core, then \`npx gtm job tam <campaign>\` in a project repo.`);
}

function down(wipe: boolean) {
  sh("docker", ["compose", "down", ...(wipe ? ["-v"] : [])]);
  if (wipe && existsSync(STACK_ENV_FILE)) rmSync(STACK_ENV_FILE);
  console.log(wipe ? "Stack stopped; all data and the stack env file deleted." : "Stack stopped; data kept (pnpm stack:up to resume).");
}

async function status() {
  sh("docker", ["compose", "ps"]);
  console.log(`hatchet: ${(await hatchetReady()) ? "ready" : "not ready"} · env file: ${existsSync(STACK_ENV_FILE) ? STACK_ENV_FILE : "missing"}`);
}

const [cmd] = process.argv.slice(2);
try {
  if (cmd === "up") await up();
  else if (cmd === "down") down(process.argv.includes("--wipe"));
  else if (cmd === "status") await status();
  else { console.error("Usage: tsx scripts/stack.ts up|down [--wipe]|status"); process.exit(1); }
} catch (e) {
  console.error(`stack ${cmd}: ${(e as Error).message}`);
  process.exit(1);
}
