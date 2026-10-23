import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** All files under dir, as paths relative to dir, skipping the given directory names. */
export function walk(dir: string, skip: string[] = []): string[] {
  const out: string[] = [];
  const visit = (d: string) => {
    for (const name of readdirSync(d)) {
      if (skip.includes(name)) continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) visit(p);
      else out.push(relative(dir, p));
    }
  };
  visit(dir);
  return out.sort();
}

export function subdirs(dir: string): string[] {
  try {
    return readdirSync(dir).filter((n) => !n.startsWith(".") && statSync(join(dir, n)).isDirectory()).sort();
  } catch {
    return [];
  }
}

export class Report {
  errors = 0;
  warnings = 0;
  constructor(private readonly root: string) {}
  private rel(file: string) { return relative(this.root, file) || "."; }
  err(file: string, msg: string) { this.errors++; console.log(`  ✗ ${this.rel(file)}: ${msg}`); }
  warn(file: string, msg: string) { this.warnings++; console.log(`  ! ${this.rel(file)}: ${msg}`); }
  summary() { console.log(`\n${this.errors} error(s), ${this.warnings} warning(s)`); }
}
