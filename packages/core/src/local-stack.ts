// Shared by `pnpm stack:up` (core development) and `gtm stack up` (project repos): waiting for
// hatchet-lite and minting an API token inside the running containers.

/** Runs a command inside a compose service and returns stdout, or throws. */
export type ComposeExec = (service: string, args: string[]) => string;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function waitFor(what: string, check: () => Promise<boolean> | boolean, seconds = 120): Promise<void> {
  for (let i = 0; i < seconds; i++) {
    if (await check()) return;
    await sleep(1000);
  }
  throw new Error(`timed out waiting for ${what}`);
}

export async function hatchetReady(url: string): Promise<boolean> {
  try { return (await fetch(`${url}/api/ready`)).ok; } catch { return false; }
}

/** Creates a Hatchet API token for the seeded "default" tenant of a hatchet-lite container. */
export async function createHatchetToken(exec: ComposeExec, name: string): Promise<string> {
  // (Hatchet also creates an "internal" tenant whose queue is never scheduled for user workers: a token
  // for it makes jobs wait forever.)
  let tenant = "";
  await waitFor("hatchet tenant", () => {
    try { tenant = exec("postgres", ["psql", "-U", "gtm", "-d", "hatchet", "-tAc", `select id from "Tenant" where slug = 'default'`]); } catch { tenant = ""; }
    return /^[0-9a-f-]{36}$/.test(tenant);
  });
  let token = "";
  await waitFor("hatchet token", () => {
    try {
      token = exec("hatchet-lite", ["/hatchet-admin", "token", "create", "--config", "/config", "--tenant-id", tenant, "--name", name]).split("\n").at(-1)!.trim();
    } catch { token = ""; }
    return /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(token);
  }, 60);
  return token;
}
