import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

export const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;

if (pool) {
  // A pool without an error listener can terminate the Node process when an
  // idle connection fails. Request-level failures are mapped by the API.
  pool.on("error", () => undefined);
}

export const db = pool ? drizzle(pool, { schema }) : null;
export const isDatabaseConfigured = Boolean(databaseUrl);

export * from "./schema";
