/**
 * Schema version of each project-owned YAML file kind. Bump a kind's version only together with
 * a migration in migrations.ts (see AGENTS.md "Compatibility contract"). Workers must keep accepting
 * the previous version until the next major release.
 */
export const FILE_VERSIONS = {
  project: 2,
  icp: 2,
  signals: 2,
  "campaign-config": 2,
} as const;

export type FileKind = keyof typeof FILE_VERSIONS;

/** Where each kind lives, relative to a project repo root. `*` = any campaign folder. */
export const FILE_LOCATIONS: Record<FileKind, string> = {
  project: "project.yaml",
  icp: "context/icp.yaml",
  signals: "context/signals.yaml",
  "campaign-config": "campaigns/*/config.yaml",
};

/** Files renamed by a release. `gtm migrate` moves them before migrating contents. */
export const FILE_RENAMES: { from: string; to: string; since: string }[] = [
  { from: "client.yaml", to: "project.yaml", since: "0.3.0" },
  { from: "CLIENT.md", to: "PROJECT.md", since: "0.3.0" },
];
