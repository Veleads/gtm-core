import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

/**
 * One client per process. Bulk, idempotent writes (upsert thousands of rows with ON CONFLICT) go
 * through `db.$executeRaw` with `Prisma.sql`, because Prisma's own upsert handles one row at a time.
 */
export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

export type Db = ReturnType<typeof createDb>;
export * from "./generated/prisma/client.ts";
