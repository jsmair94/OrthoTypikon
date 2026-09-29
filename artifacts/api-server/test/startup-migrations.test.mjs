import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const apiDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("the API stays available in no-database mode", async () => {
  const port = 20_000 + (process.pid % 40_000);
  const environment = { ...process.env, NODE_ENV: "production", PORT: String(port) };
  delete environment.DATABASE_URL;

  const child = spawn(
    process.execPath,
    ["--enable-source-maps", "./dist/index.mjs"],
    { cwd: apiDirectory, env: environment, stdio: "ignore" },
  );

  try {
    const deadline = Date.now() + 5_000;
    let health;
    while (Date.now() < deadline) {
      try {
        health = await fetch(`http://127.0.0.1:${port}/api/healthz`);
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    assert.equal(health?.status, 200, "health endpoint should work without a database");
    const databaseRoute = await fetch(`http://127.0.0.1:${port}/api/saints`);
    assert.equal(databaseRoute.status, 503);
    assert.equal((await databaseRoute.json()).code, "DATABASE_UNAVAILABLE");
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      await new Promise((resolve) => child.once("exit", resolve));
    }
  }
});

test("a failed database migration is reported and prevents API startup", async () => {
  assert.ok(
    existsSync(path.join(apiDirectory, "dist", "migrations", "meta", "_journal.json")),
    "the API build must include the Drizzle migration journal",
  );

  const port = 20_000 + (process.pid % 40_000);
  const child = spawn(
    process.execPath,
    ["--enable-source-maps", "./dist/index.mjs"],
    {
      cwd: apiDirectory,
      env: {
        ...process.env,
        DATABASE_URL: "postgres://migration:local@127.0.0.1:1/placeholder",
        NODE_ENV: "production",
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let output = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.setEncoding("utf8").on("data", (chunk) => {
    output += chunk;
  });

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("API did not exit after the database migration failed."));
    }, 5_000);

    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal });
    });
  });

  assert.deepEqual(result, { code: 1, signal: null });
  assert.match(
    output,
    /Database migration or schema validation failed; API server will not start: .*ECONNREFUSED/,
  );
  assert.doesNotMatch(output, /postgres:\/\/migration:local/);
});