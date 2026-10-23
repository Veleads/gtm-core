// Help text for humans and coding agents. Every command says whether it writes files, so an agent
// can tell safe (read-only) commands from ones that change the repo before running them.

export interface CommandHelp {
  usage: string;
  summary: string;
  details: string[];
  /** What the command changes on disk. "Nothing" = read-only. */
  writes: string;
  examples: string[];
}

export const COMMANDS: Record<string, CommandHelp> = {
  init: {
    usage: 'gtm init <client-slug> --name "<Client Name>" [--dir <path>]',
    summary: "scaffold a new client repo",
    details: [
      "Creates a complete client repo: client.yaml, context/ templates, campaigns/, tam/, CLIENT.md,",
      "CI workflows, .gtm/ (core kit) and AGENTS.md, pinned to this CLI's version, then runs git init.",
      "Push the result to a PRIVATE repo: it will hold client context.",
    ],
    writes: "A new folder (default ./gtm-client-<slug>). Refuses if it exists and is not empty.",
    examples: ['npx @veleads/gtm init acme --name "Acme Corp"', 'npx @veleads/gtm init acme --name "Acme Corp" --dir ./clients/acme'],
  },
  "new-campaign": {
    usage: "gtm new-campaign <campaign-slug>",
    summary: "scaffold campaigns/<slug>/",
    details: ["Copies the campaign template (brief.md, config.yaml, copy.md, runs/). Owner comes from GTM_USER."],
    writes: "campaigns/<slug>/ (refuses if it exists).",
    examples: ["git switch -c campaign/q1-uk-cfo && pnpm gtm new-campaign q1-uk-cfo"],
  },
  validate: {
    usage: "gtm validate [campaign]",
    summary: "check repo against schemas, gates, data rules",
    details: [
      "Checks client.yaml, context/ and campaigns against the schemas; segment/persona/signal references;",
      "gate order (no stage past an unapproved or changed ICP/copy approval); required files; run-log names;",
      "no lead data (blocks data files, warns on email addresses); .gtm/ matches the installed core.",
      "Exit code 1 if there is any error; warnings never fail.",
    ],
    writes: "Nothing (read-only).",
    examples: ["pnpm gtm validate", "pnpm gtm validate q1-uk-cfo"],
  },
  status: {
    usage: "gtm status",
    summary: "campaigns, stages, gates",
    details: ["One screen: client, core version, ICP gate, and per campaign the stage, copy/launch gates, owner and latest run log."],
    writes: "Nothing (read-only).",
    examples: ["pnpm gtm status"],
  },
  approve: {
    usage: 'gtm approve icp --by "<Name (side)>" [--notes ".."] [--date YYYY-MM-DD]\ngtm approve copy <campaign> --by "<Name (side)>" [--notes ".."] [--date YYYY-MM-DD]',
    summary: "record a sign-off and pin a hash of the approved content",
    details: [
      "Run ONLY after the named human explicitly approved in this session (AGENTS.md section 4).",
      "Pins a content hash: if context/icp.yaml or the campaign's copy.md changes afterwards,",
      "`gtm validate` fails until it is re-approved. Refuses if the file would not validate.",
      "The launch gate is recorded by hand in config.yaml (its content is the lead set).",
    ],
    writes: "context/icp.yaml → approval (icp), or campaigns/<campaign>/config.yaml → gates.copy (copy).",
    examples: ['pnpm gtm approve icp --by "Maria Chen (client)" --notes "Segments A+B, personas CFO+AP"', 'pnpm gtm approve copy q1-uk-cfo --by "Maria Chen (client)"'],
  },
  sync: {
    usage: "gtm sync [--check]",
    summary: "copy core kit into .gtm/ + AGENTS.md",
    details: [
      "Makes .gtm/ (skills, templates, schemas, provider docs) and AGENTS.md match the installed core.",
      "--check only compares and exits 1 if they differ (CI uses this; never edit .gtm/ by hand).",
    ],
    writes: ".gtm/ (replaced entirely) and AGENTS.md; creates CLAUDE.md if missing. With --check: nothing.",
    examples: ["pnpm gtm sync", "pnpm gtm sync --check"],
  },
  migrate: {
    usage: "gtm migrate [--dry-run]",
    summary: "upgrade YAML files to current schema versions",
    details: ["Applies core schema migrations to client.yaml, context/*.yaml and campaigns/*/config.yaml, keeping comments."],
    writes: "Those YAML files, only if a migration applies. With --dry-run: nothing.",
    examples: ["pnpm gtm migrate --dry-run", "pnpm gtm migrate"],
  },
  upgrade: {
    usage: "gtm upgrade [version] [--force]",
    summary: "install newer core, sync, migrate, validate",
    details: [
      "Installs @veleads/gtm@<version|latest> pinned exactly, then sync, migrate and validate, and prints the changelog.",
      "Refuses while a campaign is in qa or launch, or with uncommitted changes (--force overrides; ask a GTM engineer).",
    ],
    writes: "package.json, lockfile, node_modules, .gtm/, AGENTS.md and migrated YAML files.",
    examples: ["pnpm gtm upgrade", "pnpm gtm upgrade 0.3.0"],
  },
  job: {
    usage: "gtm job <name> <campaign>",
    summary: "run a pipeline job (Phase 2)",
    details: [
      "Planned: tam, enrich, suppression:import, signals, qualify, qa, push, activate, results, status.",
      "Not available yet: it exits 1. Per AGENTS.md this is a stop; do not improvise jobs with ad-hoc scripts.",
    ],
    writes: "Nothing yet.",
    examples: ["pnpm gtm job tam q1-uk-cfo"],
  },
};

export function generalHelp(version: string): string {
  const width = Math.max(...Object.keys(COMMANDS).map((c) => c.length));
  const lines = Object.entries(COMMANDS).map(([name, c]) => `  ${name.padEnd(width)}  ${c.summary}`);
  return `gtm v${version}: CLI for gtm-brain client repos (@veleads/gtm)

Usage: gtm <command> [options]      (inside a client repo: pnpm gtm <command>)

Commands:
${lines.join("\n")}

Run \`gtm <command> --help\` for usage, what it writes, and examples.

Global options:
  --root <dir>     repo root (default: current directory)
  -h, --help       show help (with a command: that command's help; nothing is run)
  -v, --version    print the version

Exit codes: 0 success, 1 failure or validation errors.

For coding agents: inside a client repo, read AGENTS.md first and follow it. Read-only commands
(validate, status, sync --check, migrate --dry-run) are always safe to run.`;
}

export function commandHelp(name: string): string | null {
  const c = COMMANDS[name];
  if (!c) return null;
  return `gtm ${name}: ${c.summary}

Usage:
${c.usage.split("\n").map((u) => `  ${u}`).join("\n")}

${c.details.map((d) => `  ${d}`).join("\n")}

Writes: ${c.writes}

Examples:
${c.examples.map((e) => `  ${e}`).join("\n")}`;
}
