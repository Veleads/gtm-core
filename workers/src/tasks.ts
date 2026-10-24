import { createDb } from "@gtm/db";
import type { JsonObject } from "@hatchet-dev/typescript-sdk/v1/types";
import { JOB_NAMES } from "@gtm/schemas";
import { hatchet } from "./hatchet.ts";
import { createRegistry } from "./registry.ts";
import { runTam } from "./run-tam.ts";

const db = createDb();
const registry = createRegistry();

/** Input arrives as plain JSON and is validated against the shared contract inside runTam. */
export const tamTask = hatchet.task({
  name: JOB_NAMES.tam,
  retries: 0,
  executionTimeout: "30m",
  fn: async (input: JsonObject) => (await runTam(db, registry, input)) as unknown as JsonObject,
});
