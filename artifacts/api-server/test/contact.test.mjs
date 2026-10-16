import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createContactRouter } from "../src/routes/contact.ts";

test("contact endpoint validates submissions and hands accepted messages to delivery", async () => {
  const sent = [];
  const app = express();
  app.use(express.json());
  app.use(createContactRouter(async (input) => {
    if (input.name === "Delivery failure") throw new Error("provider unavailable");
    sent.push(input);
  }));
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const invalid = await fetch(`${base}/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "", email: "bad", message: "" }),
    });
    assert.equal(invalid.status, 400);
    assert.equal(sent.length, 0);

    const response = await fetch(`${base}/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Test visitor",
        email: "visitor@example.com",
        country: "US",
        phone: "+1 555 0100",
        message: "Please contact me.",
      }),
    });
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), { accepted: true });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].email, "visitor@example.com");

    const failed = await fetch(`${base}/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Delivery failure",
        email: "visitor@example.com",
        message: "Please contact me.",
      }),
    });
    assert.equal(failed.status, 502);
    assert.equal((await failed.json()).error.includes("could not send"), true);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
