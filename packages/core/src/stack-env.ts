import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Where `pnpm stack:up` writes local connection settings (outside every repo, never committed). */
export const STACK_ENV_FILE = process.env.GTM_STACK_ENV ?? join(homedir(), ".gtm", "stack.env");

/** Loads KEY=VALUE lines from the stack env file into process.env without overriding real env vars. */
export function loadStackEnv(file = STACK_ENV_FILE): boolean {
  if (!existsSync(file)) return false;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
  return true;
}
