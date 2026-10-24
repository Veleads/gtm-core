import { defineConfig } from "prisma/config";

// Prisma 7: connection settings live here, not in schema.prisma. Env vars are not loaded automatically,
// so the local docker-compose URL is the fallback (generate works without a database).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "postgresql://gtm:gtm@localhost:5432/gtm" },
});
