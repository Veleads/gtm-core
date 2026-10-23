import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { runApprove } from "./commands/approve.ts";
import { runInit } from "./commands/init.ts";
import { runJob } from "./commands/job.ts";
import { runMigrate } from "./commands/migrate.ts";
import { runNewCampaign } from "./commands/new-campaign.ts";
import { runStatus } from "./commands/status.ts";
import { runSync } from "./commands/sync.ts";
import { runUpgrade } from "./commands/upgrade.ts";
import { runValidate } from "./commands/validate.ts";
import { GTM_VERSION } from "./paths.ts";

const HELP = `gtm v${GTM_VERSION}: gtm-brain core CLI (run inside a client repo)

  gtm init <client-slug> --name "<Name>" [--dir <path>]   scaffold a new client repo
  gtm new-campaign <campaign-slug>                        scaffold campaigns/<slug>/
  gtm validate [campaign]                                 check repo against schemas, gates, data rules
  gtm status                                              campaigns, stages, gates
  gtm approve icp --by "<Name (side)>" [--notes ..] [--date YYYY-MM-DD]
  gtm approve copy <campaign> --by "<Name (side)>" [..]   record a sign-off and pin a hash of the approved content
  gtm sync [--check]                                      copy core kit into .gtm/ + AGENTS.md
  gtm migrate [--dry-run]                                 upgrade YAML files to current schema versions
  gtm upgrade [version] [--force]                         install newer core, sync, migrate, validate
  gtm job <name> <campaign>                               run a pipeline job (Phase 2)

Global: --root <dir>  repo root (default: current directory)`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    root: { type: "string" },
    name: { type: "string" },
    dir: { type: "string" },
    by: { type: "string" },
    notes: { type: "string" },
    date: { type: "string" },
    check: { type: "boolean" },
    "dry-run": { type: "boolean" },
    force: { type: "boolean" },
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
  },
});

const [command, ...args] = positionals;
const cwd = process.cwd();
const root = resolve(cwd, values.root ?? ".");

function run(): boolean {
  if (values.version) { console.log(GTM_VERSION); return true; }
  switch (command) {
    case "init": return runInit(args[0], { name: values.name, dir: values.dir, cwd });
    case "new-campaign": return runNewCampaign(root, args[0]);
    case "validate": return runValidate(root, args[0]);
    case "status": return runStatus(root);
    case "approve": return runApprove(root, args, { by: values.by, notes: values.notes, date: values.date });
    case "sync": return runSync(root, { check: values.check });
    case "migrate": return runMigrate(root, { dryRun: values["dry-run"] });
    case "upgrade": return runUpgrade(root, { version: args[0], force: values.force });
    case "job": return runJob(args[0]);
    case undefined:
    case "help": console.log(HELP); return true;
    default: console.error(`Unknown command "${command}"\n\n${HELP}`); return false;
  }
}

process.exit(run() ? 0 : 1);
