import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { walk } from "./fsutil.ts";

/** npm strips dotfiles like .gitignore from packages, so templates store them without the dot. */
const DOTFILES = new Set(["gitignore", "env.example", "github"]);

function destName(rel: string): string {
  const [first, ...rest] = rel.split("/");
  return [DOTFILES.has(first!) ? `.${first}` : first, ...rest].join("/");
}

export interface PlannedFile {
  /** Destination path relative to the target folder. */
  rel: string;
  content: string | Buffer;
}

/** Renders a template tree in memory: dotfile names restored, __PLACEHOLDERS__ replaced in text files. */
export function planTemplate(src: string, vars: Record<string, string>, rename: (rel: string) => string = destName): PlannedFile[] {
  return walk(src).map((rel) => {
    const raw = readFileSync(join(src, rel));
    if (!/\.(md|ya?ml|json|txt|example)$|gitignore$/.test(rel)) return { rel: rename(rel), content: raw };
    let text = raw.toString("utf8");
    for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`__${k}__`, v);
    return { rel: rename(rel), content: text };
  });
}

export function writePlanned(root: string, file: PlannedFile): void {
  const out = join(root, file.rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, file.content);
}

/** Renders and writes a template tree into `dest`. */
export function copyTemplate(src: string, dest: string, vars: Record<string, string>, opts: { rename?: (rel: string) => string } = {}) {
  for (const file of planTemplate(src, vars, opts.rename)) writePlanned(dest, file);
}
