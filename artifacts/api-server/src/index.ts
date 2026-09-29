import app from "./app";
import { logger } from "./lib/logger";
import path from "node:path";
import { applyDatabaseMigrations, isDatabaseConfigured, pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function formatStartupError(error: unknown): string {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);

  return message
    .replace(/((?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/)[^@\s]+@/gi, "$1[redacted]@")
    .replace(/\b((?:password|passwd|token|secret|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi, "$1[redacted]")
    .replace(/\s+/g, " ")
    .slice(0, 2000);
}

async function startServer(): Promise<void> {
  if (isDatabaseConfigured) {
    const migrationsFolder = path.join(import.meta.dirname, "migrations");

    logger.info({ migrationsFolder }, "Applying pending database migrations");
    try {
      await applyDatabaseMigrations(migrationsFolder);
      logger.info("Database migrations are up to date");
    } catch (error) {
      logger.fatal(
        { err: error },
        `Database migration or schema validation failed; API server will not start: ${formatStartupError(error)}`,
      );
      await pool?.end().catch((closeError: unknown) => {
        logger.error({ err: closeError }, "Failed to close database pool");
      });
      process.exitCode = 1;
      return;
    }
  } else {
    logger.warn("DATABASE_URL is not configured; skipping database migrations");
  }

  app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}

void startServer();
