import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import express from "express";

import { createManagedContentRouter } from "../src/routes/managed-content.ts";

const sampleAbout = {
  ar: { aboutBody: "نص تعريفي عربي جديد" },
  en: { aboutBody: "Updated English About copy" },
  el: { aboutBody: "Νέο ελληνικό κείμενο" },
};

function createTestApp() {
  let savedRecord = null;
  const app = express();
  app.use(express.json());
  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/admin/") &&
        req.header("authorization") !== "Bearer test-admin-session") {
      res.status(401).json({ message: "Administrator session is invalid or expired." });
      return;
    }
    next();
  });
  app.use("/api", createManagedContentRouter({
    async get(key) {
      return key === "about" ? savedRecord : null;
    },
    async save(key, content) {
      savedRecord = { content, updatedAt: new Date("2026-10-21T12:00:00Z") };
      return savedRecord;
    },
  }));
  return app;
}

test("the admin About editor save is readable from the public endpoint after reload", async () => {
  const adminSource = await readFile(
    new URL("../../orthotypikon-admin/src/App.tsx", import.meta.url),
    "utf8",
  );
  assert.match(adminSource, /fetch\(`\/api\/admin\/managed-content\/\$\{kind\}`/);
  assert.match(adminSource, /method: 'PUT'/);
  assert.match(adminSource, /body: JSON\.stringify\(\{ content \}\)/);
  assert.match(adminSource, /setValue\(JSON\.stringify\(result\.content \?\? defaultContent/);

  const app = createTestApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const headers = {
    authorization: "Bearer test-admin-session",
    "content-type": "application/json",
  };

  try {
    const emptyAdminRead = await fetch(`${base}/admin/managed-content/about`, { headers });
    assert.equal(emptyAdminRead.status, 200);
    assert.deepEqual(await emptyAdminRead.json(), { content: null, updatedAt: null });

    const saved = await fetch(`${base}/admin/managed-content/about`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ content: sampleAbout }),
    });
    assert.equal(saved.status, 200);
    assert.deepEqual((await saved.json()).content, sampleAbout);

    // A new public request represents a client reload and must receive the persisted value.
    const publicReload = await fetch(`${base}/content/about`);
    assert.equal(publicReload.status, 200);
    assert.deepEqual(await publicReload.json(), { content: sampleAbout });

    const adminReload = await fetch(`${base}/admin/managed-content/about`, { headers });
    assert.deepEqual((await adminReload.json()).content, sampleAbout);

    const invalid = await fetch(`${base}/admin/managed-content/about`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ content: { ar: sampleAbout.ar, en: sampleAbout.en } }),
    });
    assert.equal(invalid.status, 400);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
  }
});

test("public About content is unavailable when no record has been saved", async () => {
  const server = createTestApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/content/about`);
    assert.equal(response.status, 404);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
  }
});
