import { loadStackEnv } from "@gtm/core";
import { HatchetClient } from "@hatchet-dev/typescript-sdk/v1";

// Local: connection settings come from ~/.gtm/stack.env (written by `pnpm stack:up`). Deployed: real env vars.
loadStackEnv();
process.env.HATCHET_CLIENT_TLS_STRATEGY ??= "none";

export const hatchet = HatchetClient.init();
