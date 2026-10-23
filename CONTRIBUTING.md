# Contributing

Thanks for looking. gtm-core is maintained by Velead for its own client work and shared publicly.
Issues and PRs are welcome; there is no support guarantee.

1. Read [AGENTS.md](AGENTS.md), especially the **compatibility contract** (section 2): client repos
   upgrade on their own schedule, so breaking YAML changes need a version bump plus a migration.
2. Open an issue first for anything beyond a small fix or playbook clarification.
3. Run `pnpm check` and `pnpm test:e2e` before opening a PR, and add a `CHANGELOG.md` entry under
   `## [Unreleased]` tagged **no action**, **opt-in**, **action** or **migration**.
4. **Never include real client or prospect data**: no real company names from client work, no people,
   no emails, no negotiated vendor prices. Examples use fictional companies and `.example` domains.
   `pnpm guard:public` checks the obvious cases.
5. Keep `kit/` agent-agnostic: no instructions that only one agent (plugin, hook, MCP server) can follow.
