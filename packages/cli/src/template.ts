import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { walk } from "./fsutil.ts";

/** npm strips dotfiles like .gitignore from packages, so templates store them without the dot. */
const DOTFILES = new Set(["gitignore", "env.example", "github"]);

function destName(rel: string): string {
  const [first, ...rest] = rel.split("/");
  return [DOTFILES.has(first!) ? `.${first}` : first, ...rest].join("/");
}

/** Copies a template tree, restoring dotfile names and replacing __PLACEHOLDERS__ in text files. */
export function copyTemplate(src: string, dest: string, vars: Record<string, string>, opts: { only?: string[]; rename?: (rel: string) => string } = {}) {
  for (const rel of walk(src)) {
    if (opts.only && !opts.only.includes(rel)) continue;
    const out = join(dest, (opts.rename ?? destName)(rel));
    mkdirSync(dirname(out), { recursive: true });
    if (/\.(md|ya?ml|json|txt|example)$|gitignore$/.test(rel)) {
      let text = readFileSync(join(src, rel), "utf8");
      for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`__${k}__`, v);
      writeFileSync(out, text);
    } else {
      cpSync(join(src, rel), out);
    }
  }
}
