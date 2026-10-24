// gtm upgrade [version]: moves this project repo to a newer core, safely.
//   install exact version → sync kit → migrate YAML → validate → print changelog.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { changelogBetween } from "../changelog.ts";
import { PACKAGE_NAME } from "../paths.ts";
import { campaignStages } from "./status.ts";
import { pinnedVersion } from "./validate.ts";

/**
 * Runs pnpm: from PATH if available, else the exact version pinned in the project's
 * package.json "packageManager" via npx. (npm_execpath is unreliable: under npx it points to npm.)
 */
function pm(root: string, args: string[]): number {
  const onPath = spawnSync("pnpm", ["--version"], { stdio: "ignore" }).status === 0;
  const pinned = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).packageManager ?? "pnpm@10";
  const [cmd, pre] = onPath ? ["pnpm", []] : ["npx", ["-y", pinned]];
  return spawnSync(cmd, [...pre, ...args], { cwd: root, stdio: "inherit" }).status ?? 1;
}

const FROZEN_STAGES = ["qa", "launch"];

export function runUpgrade(root: string, opts: { version?: string; force?: boolean }): boolean {
  const before = pinnedVersion(root);
  if (!before) { console.error(`package.json does not depend on ${PACKAGE_NAME}: is this a project repo?`); return false; }

  const frozen = campaignStages(root).filter((c) => FROZEN_STAGES.includes(c.stage));
  if (frozen.length && !opts.force) {
    console.error(`Refusing to upgrade: campaign(s) between QA and launch: ${frozen.map((c) => `${c.id} (${c.stage})`).join(", ")}.`);
    console.error("Finish the launch first, or re-run with --force if a GTM engineer approved it.");
    return false;
  }
  const dirty = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
  if (dirty.status === 0 && dirty.stdout.trim() && !opts.force) {
    console.error("Refusing to upgrade with uncommitted changes. Commit or stash first (or --force).");
    return false;
  }

  const target = opts.version ?? "latest";
  console.log(`Upgrading ${PACKAGE_NAME} ${before} → ${target}`);
  if (pm(root, ["add", "-D", "--save-exact", `${PACKAGE_NAME}@${target}`]) !== 0) return false;
  // The steps below must run with the NEW version's binary, hence `exec` rather than in-process calls.
  if (pm(root, ["exec", "gtm", "sync"]) !== 0) return false;
  if (pm(root, ["exec", "gtm", "migrate"]) !== 0) return false;
  const valid = pm(root, ["exec", "gtm", "validate"]) === 0;

  const after = pinnedVersion(root) ?? target;
  const changelog = join(root, "node_modules", ...PACKAGE_NAME.split("/"), "CHANGELOG.md");
  if (existsSync(changelog)) {
    const notes = changelogBetween(readFileSync(changelog, "utf8"), before, after);
    console.log(`\n=== Changes ${before} → ${after} ===\n${notes || "(no changelog entries)"}\n`);
  }
  console.log(valid
    ? `Upgraded to ${after}. Review the diff, then: git switch -c upgrade/core-v${after} && git add -A && git commit -m "chore: core v${after}"`
    : `Upgraded to ${after} but validation fails. Fix the errors above (see "migration" notes in the changelog) before committing.`);
  return valid;
}
