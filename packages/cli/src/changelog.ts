/** Numeric semver compare (prerelease tags ignored). */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^[^\d]*/, "").split(/[.-]/).slice(0, 3).map(Number);
  const pb = b.replace(/^[^\d]*/, "").split(/[.-]/).slice(0, 3).map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

/** CHANGELOG.md sections with from < version <= to. Sections start with "## [x.y.z]" or "## x.y.z". */
export function changelogBetween(text: string, from: string, to: string): string {
  const parts = text.split(/^(?=## )/m);
  return parts
    .filter((p) => {
      const m = p.match(/^## \[?(\d+\.\d+\.\d+)/);
      return m && compareVersions(m[1]!, from) > 0 && compareVersions(m[1]!, to) <= 0;
    })
    .join("")
    .trim();
}
