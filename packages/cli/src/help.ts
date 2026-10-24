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
    usage: 'gtm init <project-slug> --name "<Project Name>" [--dir <path>]\ngtm init . --name "<Project Name>" [--slug <project-slug>]',
    summary: "scaffold a project repo (new folder, or the current one with \".\")",
    details: [
      "Creates a complete project repo: project.yaml, context/ templates, campaigns/, tam/, PROJECT.md,",
      "CI workflows, .gtm/ (core kit) and AGENTS.md, pinned to this CLI's version.",
      '"." sets up the current folder; the slug comes from the folder name (gtm-project-acme → acme) or --slug.',
      "Works in a fresh clone: .git is kept (no git init inside an existing repo), README.md is kept,",
      ".gitignore gets gtm rules appended, CLAUDE.md gets @AGENTS.md. Any other existing gtm file",
      "(e.g. AGENTS.md, .gtm/, package.json) stops init before anything is written.",
      "Push the result to a PRIVATE repo: it will hold project context.",
    ],
    writes: "The target folder (new ./gtm-project-<slug>, --dir, or the current folder with \".\"). Never overwrites existing files.",
    examples: ['npx @veleads/gtm init . --name "Acme Corp"', 'npx @veleads/gtm init acme --name "Acme Corp"', 'npx @veleads/gtm init . --name "Acme Corp" --slug acme'],
  },
  "new-campaign": {
    usage: "gtm new-campaign <campaign-slug>",
    summary: "scaffold campaigns/<slug>/",
    details: ["Copies the campaign template (brief.md, config.yaml, copy.md, runs/). Owner comes from GTM_USER."],
    writes: "campaigns/<slug>/ (refuses if it exists).",
    examples: ["git switch -c campaign/q1-uk-cfo && npx gtm new-campaign q1-uk-cfo"],
  },
  validate: {
    usage: "gtm validate [campaign] [--verify-github]",
    summary: "check repo against schemas, gates, data rules",
    details: [
      "Checks project.yaml, context/ and campaigns against the schemas; segment/persona/signal references;",
      "gate order (no stage past an unapproved or changed ICP/copy approval); required files; run-log names;",
      "no lead data (blocks data files, warns on email addresses); .gtm/ matches the installed core.",
      "GitHub mode: ICP/copy approvals must come from the approver's PR review (approved_via).",
      "--verify-github (CI) re-checks each recorded PR approval on GitHub.",
      "Exit code 1 if there is any error; warnings never fail.",
    ],
    writes: "Nothing (read-only).",
    examples: ["npx gtm validate", "npx gtm validate q1-uk-cfo", "npx gtm validate --verify-github"],
  },
  status: {
    usage: "gtm status",
    summary: "campaigns, stages, gates",
    details: ["One screen: project, core version, ICP gate, and per campaign the stage, copy/launch gates, owner and latest run log."],
    writes: "Nothing (read-only).",
    examples: ["npx gtm status"],
  },
  approve: {
    usage: 'gtm approve icp --pr <number> [--notes ".."]\ngtm approve copy <campaign> --pr <number> [--notes ".."]\ngtm approve icp --by "<Name (role)>" [--notes ".."] [--date YYYY-MM-DD]\ngtm approve copy <campaign> --by "<Name (role)>" [..]',
    summary: "record a sign-off and pin a hash of the approved content",
    details: [
      "GitHub mode (project.yaml owners.approver is an @handle): the approval IS the approver's APPROVED",
      "review on a pull request. --pr verifies on GitHub that the PR changes the file, the approver approved",
      "its latest commit, and your local file equals the approved version; then records approved_via.",
      "Recorded mode (approver is a name): run ONLY after the named human explicitly approved in this session.",
      "Either way a content hash is pinned: if the ICP or copy changes later, `gtm validate` fails.",
      "The launch gate is recorded by hand in config.yaml.",
    ],
    writes: "context/icp.yaml → approval (icp), or campaigns/<campaign>/config.yaml → gates.copy (copy).",
    examples: ["npx gtm approve icp --pr 12", "npx gtm approve copy q1-uk-cfo --pr 15", 'npx gtm approve icp --by "Maria Chen (VP Marketing)"'],
  },
  track: {
    usage: "gtm track stage <campaign>\ngtm track gate-open <icp|copy|launch> [campaign] [--pr <number>]\ngtm track gate-done <icp|copy|launch> [campaign]",
    summary: "mirror stages and gates into the project tracker",
    details: [
      "Uses project.yaml → tracker.kind (github | none). GitHub: one issue per campaign (label stage:<stage>)",
      "and one per gate, assigned to the approver. Re-running updates the same issue.",
      "The tracker is a mirror only: stage and gates live in the YAML files. gate-done refuses unless the",
      "files say the gate is approved.",
    ],
    writes: "Issues in the tracker (GitHub: issues, labels, comments). No local files.",
    examples: ["npx gtm track stage q1-uk-cfo", "npx gtm track gate-open icp --pr 12", "npx gtm track gate-done copy q1-uk-cfo"],
  },
  github: {
    usage: "gtm github setup [--apply]",
    summary: "prepare the GitHub repo: labels and approval ruleset",
    details: [
      "Creates the labels gtm track uses, and a ruleset on the default branch: PR required, review from",
      "CODEOWNERS required (the approver owns icp.yaml, signals.yaml, copy.md), CI job `check` must pass.",
      "Without --apply it only prints the plan. Needs admin rights; private repos need a paid GitHub plan",
      "for rulesets (CI verification via `validate --verify-github` works on any plan).",
    ],
    writes: "With --apply: labels and a ruleset on GitHub. Without: nothing.",
    examples: ["npx gtm github setup", "npx gtm github setup --apply"],
  },
  sync: {
    usage: "gtm sync [--check]",
    summary: "copy core kit into .gtm/ + AGENTS.md",
    details: [
      "Makes .gtm/ (skills, templates, schemas, guides, provider docs) and AGENTS.md match the installed core,",
      "and maintains the gtm block in .github/CODEOWNERS from project.yaml → owners.approver.",
      "--check only compares and exits 1 if they differ (CI uses this; never edit .gtm/ by hand).",
    ],
    writes: ".gtm/ (replaced entirely), AGENTS.md, the gtm block in .github/CODEOWNERS; creates CLAUDE.md if missing. With --check: nothing.",
    examples: ["npx gtm sync", "npx gtm sync --check"],
  },
  migrate: {
    usage: "gtm migrate [--dry-run]",
    summary: "upgrade YAML files to current schema versions",
    details: ["Applies core schema migrations to project.yaml, context/*.yaml and campaigns/*/config.yaml, keeping comments."],
    writes: "Those YAML files, only if a migration applies. With --dry-run: nothing.",
    examples: ["npx gtm migrate --dry-run", "npx gtm migrate"],
  },
  upgrade: {
    usage: "gtm upgrade [version] [--force]",
    summary: "install newer core, sync, migrate, validate",
    details: [
      "Installs @veleads/gtm@<version|latest> pinned exactly, then sync, migrate and validate, and prints the changelog.",
      "Refuses while a campaign is in qa or launch, or with uncommitted changes (--force overrides; ask a GTM engineer).",
    ],
    writes: "package.json, lockfile, node_modules, .gtm/, AGENTS.md and migrated YAML files.",
    examples: ["npx gtm upgrade", "npx gtm upgrade 0.3.0"],
  },
  job: {
    usage: "gtm job <name> <campaign>",
    summary: "run a pipeline job (Phase 2)",
    details: [
      "Planned: tam, enrich, suppression:import, signals, qualify, qa, push, activate, results, status.",
      "Not available yet: it exits 1. Per AGENTS.md this is a stop; do not improvise jobs with ad-hoc scripts.",
    ],
    writes: "Nothing yet.",
    examples: ["npx gtm job tam q1-uk-cfo"],
  },
};

export function generalHelp(version: string): string {
  const width = Math.max(...Object.keys(COMMANDS).map((c) => c.length));
  const lines = Object.entries(COMMANDS).map(([name, c]) => `  ${name.padEnd(width)}  ${c.summary}`);
  return `gtm v${version}: CLI for gtm-brain project repos (@veleads/gtm)

Usage: gtm <command> [options]      (inside a project repo: npx gtm <command>)

Commands:
${lines.join("\n")}

Run \`gtm <command> --help\` for usage, what it writes, and examples.

Global options:
  --root <dir>     repo root (default: current directory)
  -h, --help       show help (with a command: that command's help; nothing is run)
  -v, --version    print the version

Exit codes: 0 success, 1 failure or validation errors.

For coding agents: inside a project repo, read AGENTS.md first and follow it. Read-only commands
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
