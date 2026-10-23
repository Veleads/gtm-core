/**
 * Schema version of each client-owned YAML file kind. Bump a kind's version only together with
 * a migration in migrations.ts (see AGENTS.md "Breaking changes"). Workers must keep accepting
 * the previous version until the next major release.
 */
export const FILE_VERSIONS = {
  client: 1,
  icp: 1,
  signals: 1,
  "campaign-config": 1,
} as const;

export type FileKind = keyof typeof FILE_VERSIONS;

/** Where each kind lives, relative to a client repo root. `*` = any campaign folder. */
export const FILE_LOCATIONS: Record<FileKind, string> = {
  client: "client.yaml",
  icp: "context/icp.yaml",
  signals: "context/signals.yaml",
  "campaign-config": "campaigns/*/config.yaml",
};
