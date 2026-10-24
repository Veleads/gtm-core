// gtm init <project-slug> --name "<Project Name>": scaffolds a new private project repo.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Slug } from "@gtm/schemas";
import { GTM_VERSION, KIT_DIR } from "../paths.ts";
import { copyTemplate } from "../template.ts";
import { runSync } from "./sync.ts";

export function runInit(slug: string | undefined, opts: { name?: string; dir?: string; cwd: string }): boolean {
  if (!slug || !Slug.safeParse(slug).success || !opts.name) {
    console.error('Usage: gtm init <project-slug> --name "<Project Name>" [--dir <path>]   (slug: lowercase, digits, hyphens)');
    return false;
  }
  const root = resolve(opts.cwd, opts.dir ?? `gtm-project-${slug}`);
  if (existsSync(root) && readdirSync(root).length > 0) { console.error(`${root} exists and is not empty`); return false; }

  const vars = { PROJECT_ID: slug, PROJECT_NAME: opts.name, TODAY: new Date().toISOString().slice(0, 10), GTM_VERSION };
  const tpl = join(KIT_DIR, "templates");
  copyTemplate(join(tpl, "repo"), root, vars);
  copyTemplate(join(tpl, "project"), root, vars, { rename: (rel) => (rel === "project.yaml" ? rel : join("context", rel)) });
  for (const d of ["campaigns", "tam"]) {
    mkdirSync(join(root, d), { recursive: true });
    writeFileSync(join(root, d, ".gitkeep"), "");
  }
  runSync(root);

  const git = spawnSync("git", ["init", "-q", "-b", "main"], { cwd: root });
  console.log(`\nCreated ${root} (core v${GTM_VERSION})${git.status === 0 ? " with git initialised" : ""}.

Next:
  1. Create a PRIVATE GitHub repo for it (e.g. <your-org>/gtm-project-${slug}) and push this folder.
     Project repos hold project context: never make them public.
  2. pnpm install && pnpm gtm validate     (TODO warnings remain until intake is done)
  3. Open the repo in Claude Code or Codex and start with stage 00-intake.`);
  return true;
}
