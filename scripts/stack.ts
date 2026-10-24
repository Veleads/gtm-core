// Local stack lifecycle (docker-compose.yml): Postgres + hatchet-lite, gtm DB migrations, Hatchet token.
//   pnpm stack:up            start, migrate, create a token → ~/.gtm/stack.env (chmod 600)
//   pnpm stack:down [--wipe] stop (data kept) · --wipe also deletes all data and the env file
//   pnpm stack:status
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHatchetToken, hatchetReady, waitFor } from "../packages/core/src/local-stack.ts";
import { STACK_ENV_FILE } from "../packages/core/src/stack-env.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATABASE_URL = "postgresql://gtm:gtm@localhost:5432/gtm";
const HATCHET_URL = "http://localhost:8888";

function sh(cmd: string, args: string[], opts: { cwd?: string; env?: NodeJS.ProcessEnv; quiet?: boolean } = {}) {
  const res = spawnSync(cmd, args, { cwd: opts.cwd ?? ROOT, env: { ...process.env, ...opts.env }, encoding: "utf8", stdio: opts.quiet ? "pipe" : ["ignore", "inherit", "inherit"] });
  if (res.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed${opts.quiet ? `: ${res.stderr || res.stdout}` : ""}`);
  return (res.stdout ?? "").trim();
}

async function up() {
  console.log("• starting postgres + hatchet-lite");
  sh("docker", ["compose", "up", "-d", "--wait", "postgres"]);
  sh("docker", ["compose", "up", "-d", "hatchet-lite"]);
  await waitFor("hatchet-lite", () => hatchetReady(HATCHET_URL));

  console.log("• applying gtm database migrations");
  sh("npx", ["prisma", "migrate", "deploy"], { cwd: join(ROOT, "db"), env: { DATABASE_URL } });

  console.log("• creating a Hatchet API token");
  const exec = (service: string, args: string[]) => sh("docker", ["compose", "exec", "-T", service, ...args], { quiet: true });
  const token = await createHatchetToken(exec, `gtm-local-${Date.now()}`);

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
  console.log(`hatchet: ${(await hatchetReady(HATCHET_URL)) ? "ready" : "not ready"} · env file: ${existsSync(STACK_ENV_FILE) ? STACK_ENV_FILE : "missing"}`);
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
