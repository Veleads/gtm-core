// gtm icp: shows the ICP as jobs see it: each segment's final filters (core + segment overrides),
// its personas, and the shared exclusions. Read-only; use it to review an ICP before sign-off.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { IcpFile, resolveIcp, type Firmographics } from "@gtm/schemas";

const LABELS: Record<keyof Firmographics, string> = {
  industries: "industries",
  employee_count: "employees",
  revenue_usd: "revenue (USD)",
  hq_countries: "HQ countries",
  technologies_any: "tech (any of)",
  technologies_none: "tech (none of)",
  keywords_any: "keywords (any)",
  keywords_none: "keywords (none)",
};

function show(value: unknown): string | null {
  if (Array.isArray(value)) return value.length ? value.join(", ") : null;
  if (value && typeof value === "object") {
    const r = value as { min?: number; max?: number };
    return r.min !== undefined && r.max !== undefined ? `${r.min}–${r.max}` : r.min !== undefined ? `≥ ${r.min}` : r.max !== undefined ? `≤ ${r.max}` : null;
  }
  return null;
}

export function runIcp(root: string): boolean {
  const file = join(root, "context", "icp.yaml");
  if (!existsSync(file)) { console.error("context/icp.yaml not found: run this from the root of a project repo"); return false; }
  const parsed = IcpFile.safeParse(parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    console.error("context/icp.yaml is not valid (run `npx gtm validate` for details):");
    for (const i of parsed.error.issues) console.error(`  ✗ ${i.path.join(".") || "(root)"}: ${i.message}`);
    return false;
  }
  const icp = parsed.data;
  const resolved = resolveIcp(icp);
  console.log(`ICP for ${icp.project_id} · approval: ${icp.approval.status}${icp.approval.approved_by ? ` by ${icp.approval.approved_by}` : ""}`);
  const core = icp.core?.firmographics ?? {};
  const coreLines = (Object.keys(LABELS) as (keyof Firmographics)[])
    .map((k) => [LABELS[k], show(core[k])] as const)
    .filter((line): line is readonly [string, string] => line[1] !== null);
  console.log(`\nCore (every segment): ${coreLines.length ? "" : "none (each segment defines its own filters)"}`);
  for (const [label, v] of coreLines) console.log(`  ${label.padEnd(16)}${v}`);

  for (const s of resolved.segments) {
    console.log(`\nSegment ${s.id}: ${s.description}`);
    for (const k of Object.keys(LABELS) as (keyof Firmographics)[]) {
      const v = show(s.firmographics[k]);
      if (v) console.log(`  ${LABELS[k].padEnd(16)}${v}${s.overrides.includes(k) ? (core[k] !== undefined ? "   ← segment (replaces core)" : "   ← segment") : ""}`);
    }
    console.log(`  ${"personas".padEnd(16)}${s.personas.join(", ")}${s.personas.length < icp.personas.length ? "   ← restricted" : ""}`);
  }
  const x = resolved.exclusions;
  const ex = [x.domains.length && `${x.domains.length} domain(s)`, x.industries.length && `industries: ${x.industries.join(", ")}`, x.hq_countries.length && `countries: ${x.hq_countries.join(", ")}`].filter(Boolean);
  console.log(`\nExclusions (all segments): ${ex.length ? ex.join(" · ") : "none"}`);
  return true;
}
