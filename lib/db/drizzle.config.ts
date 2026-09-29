import { defineConfig } from "drizzle-kit";
import path from "path";

const databaseCommands = new Set(["push", "migrate", "pull", "studio"]);
const selectedCommand = process.argv.find((argument) => databaseCommands.has(argument));
const databaseUrl = process.env.DATABASE_URL;

if (selectedCommand && !databaseUrl) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Schema generation and migration checks are offline; database operations
    // are guarded above and require the real DATABASE_URL.
    url: databaseUrl ?? "postgres://unused:unused@127.0.0.1:1/unused",
  },
});
