import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// dist/ (installed) or src/ (core repo dev): the package root is one level up either way.
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export const PACKAGE_NAME = "@velead/gtm";
export const GTM_VERSION: string = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf8")).version;

/** kit/ is copied into the package at build time; in the core repo it lives at the repo root. */
function firstExisting(candidates: string[]): string | null {
  return candidates.find((p) => existsSync(p)) ?? null;
}

const kit = firstExisting([join(pkgRoot, "kit"), join(pkgRoot, "..", "..", "kit")]);
if (!kit) throw new Error("gtm: kit/ not found next to the package; reinstall @velead/gtm");
export const KIT_DIR = kit;
export const CHANGELOG_FILE = firstExisting([join(pkgRoot, "CHANGELOG.md"), join(pkgRoot, "..", "..", "CHANGELOG.md")]);
