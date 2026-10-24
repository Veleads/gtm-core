// gtm init: scaffolds a project repo (one repo = one project).
//   gtm init <project-slug> --name "<Project Name>" [--dir <path>]   → new folder (default ./gtm-project-<slug>)
//   gtm init . --name "<Project Name>" [--slug <project-slug>]        → the current folder
// Plans every file first; if anything core-owned or template-owned already exists, nothing is written.
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { Slug } from "@gtm/schemas";
import { GTM_VERSION, KIT_DIR } from "../paths.ts";
import { planTemplate, writePlanned, type PlannedFile } from "../template.ts";
import { expectedFiles, runSync } from "./sync.ts";

const USAGE = `Usage:
  gtm init <project-slug> --name "<Project Name>" [--dir <path>]   create ./gtm-project-<slug> (or <path>)
  gtm init . --name "<Project Name>" [--slug <project-slug>]        set up the current folder
Slugs: lowercase letters, digits and hyphens.`;

/** Files that may already exist in a fresh repo (e.g. created on GitHub): kept or merged, never a conflict. */
const MERGEABLE = new Set([".gitignore", "README.md", "CLAUDE.md", "campaigns/.gitkeep", "tam/.gitkeep"]);

/** "gtm-project-Acme Corp" → "acme-corp". */
export function slugFromFolder(path: string): string {
  return basename(path)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^gtm-project-/, "");
}

/** Lines of `ours` missing from an existing .gitignore. */
function missingIgnoreLines(existing: string, ours: string): string[] {
  const have = new Set(existing.split("\n").map((l) => l.trim()));
  return ours.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#") && !have.has(l.trim()));
}

export function runInit(target: string | undefined, opts: { name?: string; dir?: string; slug?: string; cwd: string }): boolean {
  const here = target === "." || opts.dir === ".";
  const root = resolve(opts.cwd, here ? (opts.dir ?? ".") : (opts.dir ?? `gtm-project-${target ?? ""}`));
  const slug = target && target !== "." ? target : (opts.slug ?? slugFromFolder(root));
  if (!opts.name || !slug || !Slug.safeParse(slug).success) {
    console.error(USAGE);
    if (!slug && here) console.error(`Couldn't derive a slug from the folder name "${basename(root)}": pass one with --slug`);
    else if (slug && !Slug.safeParse(slug).success) console.error(`"${slug}" is not a valid slug: pass one with --slug`);
    return false;
  }

  if (existsSync(join(root, "project.yaml")) || existsSync(join(root, "client.yaml"))) {
    console.error(`${root} is already a gtm project. Use \`npx gtm sync\` or \`npx gtm upgrade\` instead.`);
    return false;
  }

  // Plan everything that would be written.
  const vars = { PROJECT_ID: slug, PROJECT_NAME: opts.name, TODAY: new Date().toISOString().slice(0, 10), GTM_VERSION };
  const tpl = join(KIT_DIR, "templates");
  const planned: PlannedFile[] = [
    ...planTemplate(join(tpl, "repo"), vars),
    ...planTemplate(join(tpl, "project"), vars, (rel) => (rel === "project.yaml" ? rel : join("context", rel))),
    { rel: "campaigns/.gitkeep", content: "" },
    { rel: "tam/.gitkeep", content: "" },
  ];
  const coreOwned = [...expectedFiles().keys()];

  const conflicts = [...planned.map((f) => f.rel), ...coreOwned].filter((rel) => existsSync(join(root, rel)) && !MERGEABLE.has(rel));
  if (existsSync(join(root, ".gtm"))) conflicts.unshift(".gtm/");
  if (conflicts.length) {
    console.error(`Cannot set up ${root}: these files already exist and belong to gtm. Nothing was written.`);
    for (const c of [...new Set(conflicts)].slice(0, 15)) console.error(`  ✗ ${c}`);
    console.error("Move them away (or use an empty folder) and run init again.");
    return false;
  }

  // Write: new files as planned; README.md kept; .gitignore merged.
  const notes: string[] = [];
  for (const file of planned) {
    const path = join(root, file.rel);
    if (!existsSync(path)) { writePlanned(root, file); continue; }
    if (file.rel === ".gitignore") {
      const add = missingIgnoreLines(readFileSync(path, "utf8"), file.content.toString());
      if (add.length) { appendFileSync(path, `\n# gtm-brain\n${add.join("\n")}\n`); notes.push(`.gitignore: added ${add.length} gtm rule(s)`); }
    } else if (file.rel === "README.md") {
      notes.push("README.md: kept yours (see .gtm/templates/repo/README.md for the gtm version)");
    }
  }
  const claude = join(root, "CLAUDE.md");
  const hadClaude = existsSync(claude);
  runSync(root);
  if (hadClaude && !readFileSync(claude, "utf8").includes("@AGENTS.md")) {
    appendFileSync(claude, "\n@AGENTS.md\n");
    notes.push("CLAUDE.md: added @AGENTS.md so Claude Code loads the operating manual");
  }

  // git: only initialise when the folder isn't already inside a repository.
  const inRepo = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: root, encoding: "utf8" }).stdout?.trim() === "true";
  const gitNote = inRepo ? "existing git repository kept" : spawnSync("git", ["init", "-q", "-b", "main"], { cwd: root }).status === 0 ? "git initialised" : "git not initialised";

  const where = relative(opts.cwd, root) || ".";
  console.log(`\nSet up project "${opts.name}" (${slug}) in ${root} (core v${GTM_VERSION}; ${gitNote}).`);
  for (const n of notes) console.log(`  · ${n}`);
  console.log(`
Next:
  1. ${where === "." ? "" : `cd ${where} && `}npm install && npx gtm validate     (or pnpm/yarn; TODO warnings remain until intake is done)
  2. ${inRepo ? "Commit and push to your PRIVATE repo." : `Create a PRIVATE GitHub repo (e.g. <your-org>/gtm-project-${slug}) and push.`} Project repos hold project context: never make them public.
  3. Open the repo in Claude Code or Codex and start with stage 00-intake.`);
  return true;
}
