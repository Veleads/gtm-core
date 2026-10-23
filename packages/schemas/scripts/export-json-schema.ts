// Writes kit/schemas/<name>.schema.json from the Zod schemas. Commit the output.
// Shipped to client repos as .gtm/schemas/ for editor validation of YAML files.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { Account, CampaignConfig, ClientFile, Contact, IcpFile, Lead, SignalEvent, SignalsFile } from "../src/index.ts";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "kit", "schemas");
mkdirSync(out, { recursive: true });

const schemas = {
  client: ClientFile,
  icp: IcpFile,
  signals: SignalsFile,
  "campaign-config": CampaignConfig,
  account: Account,
  contact: Contact,
  signal: SignalEvent,
  lead: Lead,
};

for (const [name, schema] of Object.entries(schemas)) {
  const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" });
  writeFileSync(join(out, `${name}.schema.json`), JSON.stringify(json, null, 2) + "\n");
  console.log(`wrote kit/schemas/${name}.schema.json`);
}
