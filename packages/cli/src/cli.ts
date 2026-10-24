import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { runApprove } from "./commands/approve.ts";
import { runGithub } from "./commands/github.ts";
import { runTrack } from "./commands/track.ts";
import { runInit } from "./commands/init.ts";
import { runJob } from "./commands/job.ts";
import { runMigrate } from "./commands/migrate.ts";
import { runNewCampaign } from "./commands/new-campaign.ts";
import { runStatus } from "./commands/status.ts";
import { runSync } from "./commands/sync.ts";
import { runUpgrade } from "./commands/upgrade.ts";
import { runValidate } from "./commands/validate.ts";
import { commandHelp, generalHelp } from "./help.ts";
import { GTM_VERSION } from "./paths.ts";


const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    root: { type: "string" },
    name: { type: "string" },
    dir: { type: "string" },
    slug: { type: "string" },
    pr: { type: "string" },
    apply: { type: "boolean" },
    "verify-github": { type: "boolean" },
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

function help(name: string | undefined): boolean {
  if (!name) { console.log(generalHelp(GTM_VERSION)); return true; }
  const text = commandHelp(name);
  if (!text) { console.error(`Unknown command "${name}"\n\n${generalHelp(GTM_VERSION)}`); return false; }
  console.log(text);
  return true;
}

async function run(): Promise<boolean> {
  if (values.version) { console.log(GTM_VERSION); return true; }
  // `gtm <command> --help` and `gtm help <command>` print help and never run the command.
  if (values.help) return help(command === "help" ? args[0] : command);
  switch (command) {
    case "init": return runInit(args[0], { name: values.name, dir: values.dir, slug: values.slug, cwd });
    case "new-campaign": return runNewCampaign(root, args[0]);
    case "validate": return runValidate(root, args[0], { verifyGithub: values["verify-github"] });
    case "status": return runStatus(root);
    case "approve": return runApprove(root, args, { by: values.by, notes: values.notes, date: values.date, pr: values.pr });
    case "track": return runTrack(root, args, { pr: values.pr });
    case "github": return runGithub(root, args, { apply: values.apply });
    case "sync": return runSync(root, { check: values.check });
    case "migrate": return runMigrate(root, { dryRun: values["dry-run"] });
    case "upgrade": return runUpgrade(root, { version: args[0], force: values.force });
    case "job": return runJob(args[0]);
    case undefined: return help(undefined);
    case "help": return help(args[0]);
    default: console.error(`Unknown command "${command}"\n\n${generalHelp(GTM_VERSION)}`); return false;
  }
}

process.exit((await run()) ? 0 : 1);
