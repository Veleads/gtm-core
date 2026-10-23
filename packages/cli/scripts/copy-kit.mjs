// Copies the repo-level kit/, CHANGELOG.md and LICENSE into this package before bundling/publishing.
import { cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(pkg, "..", "..");
rmSync(join(pkg, "kit"), { recursive: true, force: true });
cpSync(join(repo, "kit"), join(pkg, "kit"), { recursive: true });
cpSync(join(repo, "CHANGELOG.md"), join(pkg, "CHANGELOG.md"));
cpSync(join(repo, "LICENSE"), join(pkg, "LICENSE"));
