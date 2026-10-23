import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import {
  setAuthTokenGetter,
  setBaseUrl,
} from "../../../lib/api-client-react/src/custom-fetch.ts";
import {
  submitContactMessage,
} from "../../../lib/api-client-react/src/generated/api.ts";

const require = createRequire(import.meta.url);
const {
  normalizeRuntimeDomain,
  verifyContactApiBundle,
} = require("../scripts/contact-api-config.js");

test("Android release config requires a reachable HTTPS API host", () => {
  assert.equal(
    normalizeRuntimeDomain("https://api.orthotypikon.org/"),
    "api.orthotypikon.org",
  );
  assert.throws(() => normalizeRuntimeDomain(undefined), /EXPO_PUBLIC_DOMAIN is required/);
  assert.throws(() => normalizeRuntimeDomain("http://api.example.org"), /HTTPS/);
  assert.throws(() => normalizeRuntimeDomain("localhost:3000"), /HTTPS/);
});

test("Android bundle verification requires the configured host and contact path", () => {
  const host = "api.orthotypikon.org";
  const validBundle = `setBaseUrl("https://${host}");post("/api/contact")`;

  assert.doesNotThrow(() => verifyContactApiBundle(validBundle, host));
  assert.throws(
    () => verifyContactApiBundle('setBaseUrl("");post("/api/contact")', host),
    /configured HTTPS API host/,
  );
  assert.throws(
    () => verifyContactApiBundle(`setBaseUrl("https://${host}");post("/api/messages")`, host),
    /contact API path/,
  );
});

test("generated contact request resolves to the configured HTTPS host and exact API path", async () => {
  const host = normalizeRuntimeDomain("api.orthotypikon.org");
  const originalFetch = globalThis.fetch;
  let requestedUrl;

  setBaseUrl(`https://${host}`);
  setAuthTokenGetter(null);
  globalThis.fetch = async (input) => {
    requestedUrl = typeof input === "string" ? input : input.url;
    return new Response('{"accepted":true}', {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await submitContactMessage({
      name: "Test User",
      email: "test@example.org",
      country: "US",
      message: "Configuration test only",
    });
  } finally {
    globalThis.fetch = originalFetch;
    setBaseUrl(null);
    setAuthTokenGetter(null);
  }

  assert.equal(requestedUrl, "https://api.orthotypikon.org/api/contact");
});
