import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/cli.ts" },
  format: "esm",
  platform: "node",
  target: "node22",
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
  // Workspace packages are bundled in; zod and yaml stay real dependencies.
  noExternal: [/^@gtm\//],
});
