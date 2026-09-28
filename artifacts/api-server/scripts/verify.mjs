import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const baseUrl = process.env.API_VERIFY_BASE_URL ?? "http://localhost:80/api";

async function read(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { accept: "application/json" },
  });
  const body = await response.json();
  return { response, body };
}

async function verifyRunningApi() {
  const health = await read("/healthz");
  assert.equal(health.response.status, 200);
  assert.deepEqual(health.body, { status: "ok" });

  const daily = await read("/daily?date=2026-08-25&locale=ar");
  assert.equal(daily.response.status, 200);
  assert.equal(daily.body.canonicalDate, "2026-08-25");
  assert.ok(daily.body.verse.text);
  assert.ok(Array.isArray(daily.body.saints));

  const synaxarion = await read("/synaxarion/homepage");
  assert.equal(synaxarion.response.status, 200);
  assert.ok(synaxarion.body.dateLabel);
  assert.ok(synaxarion.body.commemorations);
  assert.ok(synaxarion.body.saintImageUrl);
  assert.ok(synaxarion.body.verse.text);
  assert.ok(synaxarion.body.gospelUrl);
  assert.ok(synaxarion.body.calendarUrl);

  const julian = await read(
    "/calendar/2026-08-12?calendarType=julian&locale=ar",
  );
  assert.equal(julian.response.status, 200);
  assert.equal(julian.body.date, "2026-08-12");
  assert.equal(julian.body.canonicalDate, "2026-08-25");

  const month = await read(
    "/calendar?month=2026-08&calendarType=gregorian&locale=ar",
  );
  assert.equal(month.response.status, 200);
  assert.ok(month.body.length >= 3);

  const fasting = await read("/fasting/2026-08-06?locale=ar");
  assert.equal(fasting.response.status, 200);
  assert.equal(fasting.body.level, "fish");
  assert.ok(fasting.body.recipes.length > 0);

  const saints = await read("/saints?search=مريم&limit=10");
  assert.equal(saints.response.status, 200);
  assert.ok(saints.body.items.length > 0);

  const learning = await read("/learning?category=dictionary&search=ليتورجيا");
  assert.equal(learning.response.status, 200);
  assert.ok(learning.body.items.length > 0);

  const invalidDate = await read("/calendar/2026-02-30");
  assert.equal(invalidDate.response.status, 400);
  assert.equal(invalidDate.body.code, "INVALID_REQUEST");

  const invalidLocale = await read("/saints?locale=xx");
  assert.equal(invalidLocale.response.status, 400);
  assert.equal(invalidLocale.body.code, "INVALID_REQUEST");

  const missing = await read("/saints/not-a-real-saint");
  assert.equal(missing.response.status, 404);
  assert.equal(missing.body.code, "NOT_FOUND");

  const malformed = await fetch(`${baseUrl}/saints`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).code, "INVALID_REQUEST");
}

async function waitForTemporaryServer(port) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/healthz`);
      if (response.ok) return;
    } catch {
      // The temporary process has not bound its port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Temporary no-database server did not start.");
}

async function verifyNoDatabaseBoundary() {
  const port = 8099;
  const environment = { ...process.env, PORT: String(port), NODE_ENV: "production" };
  delete environment.DATABASE_URL;
  delete environment.PGHOST;
  delete environment.PGPORT;
  delete environment.PGUSER;
  delete environment.PGPASSWORD;
  delete environment.PGDATABASE;

  const child = spawn(
    process.execPath,
    ["--enable-source-maps", "./dist/index.mjs"],
    { cwd: new URL("..", import.meta.url), env: environment, stdio: "ignore" },
  );

  try {
    await waitForTemporaryServer(port);
    const health = await fetch(`http://127.0.0.1:${port}/api/healthz`);
    assert.equal(health.status, 200);
    const content = await fetch(
      `http://127.0.0.1:${port}/api/daily?date=2026-08-25`,
    );
    assert.equal(content.status, 503);
    assert.equal((await content.json()).code, "DATABASE_UNAVAILABLE");
  } finally {
    child.kill("SIGTERM");
  }
}

await verifyRunningApi();
await verifyNoDatabaseBoundary();