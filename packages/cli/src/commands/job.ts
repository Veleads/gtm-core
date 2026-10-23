// gtm job <name> <campaign>: Phase 2. Planned flow (see workers/README.md in gtm-core):
//   1. validate the campaign, 2. resolve config + context into one payload,
//   3. trigger the Hatchet workflow with { payload, client repo commit, core version },
//   4. wait and print run_id, counts and cost. Workers never read client repos.
const JOBS = ["tam", "enrich", "suppression:import", "signals", "qualify", "qa", "push", "activate", "results", "status"];

export function runJob(name: string | undefined): boolean {
  console.error(
    `gtm job ${name ?? "<name>"}: not available yet (planned for Phase 2). Known jobs: ${JOBS.join(", ")}.\n` +
      "Per AGENTS.md this is a mandatory stop: do not improvise the job with ad-hoc scripts.",
  );
  return false;
}
