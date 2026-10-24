// The gtm worker: registers every job with Hatchet and executes them. Local: `pnpm worker`.
import { hatchet } from "./hatchet.ts";
import { tamTask } from "./tasks.ts";

const worker = await hatchet.worker("gtm-worker", { workflows: [tamTask], slots: 5 });
console.log("gtm worker started: jobs [tam]");
await worker.start();
