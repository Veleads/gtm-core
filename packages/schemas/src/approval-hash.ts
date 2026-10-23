import { createHash } from "node:crypto";

/** JSON with object keys sorted recursively, so key order never changes the result. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * Fingerprint of what the client approves in icp.yaml: everything except `approval` and `version`.
 * Takes the parsed YAML, so comments, formatting and key order don't change it; any edit to
 * segments, personas or exclusions does.
 */
export function icpContentHash(icp: Record<string, unknown>): string {
  const { approval: _approval, version: _version, ...content } = icp;
  return `sha256:${createHash("sha256").update(stableStringify(content)).digest("hex").slice(0, 16)}`;
}

/**
 * Fingerprint of approved copy (campaigns/<campaign>/copy.md). Note lines starting with ">" (status,
 * available variables) don't count, and neither do line endings, trailing spaces or runs of blank
 * lines. Every other character of the copy does.
 */
export function copyContentHash(markdown: string): string {
  const normalized = markdown
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => !/^\s*>/.test(line))
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return `sha256:${createHash("sha256").update(normalized).digest("hex").slice(0, 16)}`;
}
