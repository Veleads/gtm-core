import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Where `pnpm stack:up` writes local connection settings (outside every repo, never committed). */
export const STACK_ENV_FILE = process.env.GTM_STACK_ENV ?? join(homedir(), ".gtm", "stack.env");

/** One folder per project stack, outside every repo: `<project_id>.env` and `<project_id>.secrets.env`. */
export const STACKS_DIR = process.env.GTM_STACKS_DIR ?? join(homedir(), ".gtm", "stacks");

/** Connection settings written by `gtm stack up` in a project repo. */
export const projectStackEnvFile = (projectId: string) => join(STACKS_DIR, `${projectId}.env`);

/** Provider API keys for this project's worker. Written by the human, read by the worker container only. */
export const projectSecretsFile = (projectId: string) => join(STACKS_DIR, `${projectId}.secrets.env`);

/** Parses KEY=VALUE lines (comments and blank lines ignored, surrounding quotes stripped). */
export function readEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
  return out;
}

/** Loads a stack env file into process.env without overriding real env vars. */
export function loadStackEnv(file = STACK_ENV_FILE): boolean {
  if (!existsSync(file)) return false;
  for (const [k, v] of Object.entries(readEnvFile(file))) if (process.env[k] === undefined) process.env[k] = v;
  return true;
}
