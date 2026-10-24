// gtm upgrade [version]: moves this project repo to a newer core, safely.
//   install exact version → sync kit → migrate YAML → validate → print changelog.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { changelogBetween } from "../changelog.ts";
import { PACKAGE_NAME } from "../paths.ts";
import { campaignStages } from "./status.ts";
import { pinnedVersion } from "./validate.ts";

type PackageManager = "npm" | "pnpm" | "yarn";

/** The project's package manager, from its committed lockfile (npm when there is none). */
export function detectPackageManager(root: string): PackageManager {
  if (existsSync(join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(root, "yarn.lock"))) return "yarn";
  return "npm";
}

/** Installs an exact version of the core with the project's own package manager. */
function installExact(root: string, pm: PackageManager, spec: string): number {
  const onPath = (bin: string) => spawnSync(bin, ["--version"], { stdio: "ignore" }).status === 0;
  const [cmd, args] =
    pm === "npm" ? ["npm", ["install", "--save-dev", "--save-exact", spec]]
    : pm === "pnpm" ? (onPath("pnpm") ? ["pnpm", ["add", "-D", "--save-exact", spec]] : ["npx", ["-y", "pnpm@10", "add", "-D", "--save-exact", spec]])
    : onPath("yarn") ? ["yarn", ["add", "-D", "--exact", spec]] : ["npx", ["-y", "yarn@1", "add", "-D", "--exact", spec]];
  return spawnSync(cmd as string, args as string[], { cwd: root, stdio: "inherit" }).status ?? 1;
}

/** Runs the freshly installed CLI (node_modules/.bin), whichever package manager installed it. */
function gtm(root: string, args: string[]): number {
  return spawnSync("npx", ["gtm", ...args], { cwd: root, stdio: "inherit" }).status ?? 1;
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
  const pm = detectPackageManager(root);
  console.log(`Upgrading ${PACKAGE_NAME} ${before} → ${target} (with ${pm})`);
  if (installExact(root, pm, `${PACKAGE_NAME}@${target}`) !== 0) return false;
  // The steps below must run with the NEW version's binary, hence a new process rather than in-process calls.
  if (gtm(root, ["sync"]) !== 0) return false;
  if (gtm(root, ["migrate"]) !== 0) return false;
  const valid = gtm(root, ["validate"]) === 0;

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
