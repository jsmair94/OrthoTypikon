import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import {
  buildConfirmationEmail,
  createContactRouter,
  createResendSender,
} from "../src/routes/contact.ts";

test("Resend sender uses the Railway API key for the email API request", async () => {
  let captured;
  const payload = { to: ["info@orthotypikon.org"], subject: "Test" };
  const sendEmail = createResendSender("railway-test-key", async (url, init) => {
    captured = { url: String(url), init };
    return new Response(null, { status: 202 });
  });

  await sendEmail(payload);

  assert.equal(captured.url, "https://api.resend.com/emails");
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.headers.Authorization, "Bearer railway-test-key");
  assert.deepEqual(JSON.parse(captured.init.body), payload);
});

test("Resend sender reports missing configuration and provider rejection", async () => {
  const missingKeySender = createResendSender(undefined, async () => {
    throw new Error("fetch should not run without an API key");
  });
  await assert.rejects(missingKeySender({}), /RESEND_API_KEY is not configured/);

  const rejectedSender = createResendSender("railway-test-key", async () =>
    new Response(null, { status: 401 }),
  );
  await assert.rejects(rejectedSender({}), /Resend rejected email: 401/);
});

test("confirmation email uses the requested language and contains no submitted message", () => {
  const confirmation = buildConfirmationEmail(" visitor@example.com ", "en");
  assert.deepEqual(confirmation, {
    from: "OrthoTypikon <info@orthotypikon.org>",
    to: ["visitor@example.com"],
    subject: "We received your message to OrthoTypikon",
    text: "We received your message. Our team will review it and respond if needed.",
  });
  assert.equal(JSON.stringify(confirmation).includes("private message"), false);

  assert.deepEqual(buildConfirmationEmail("visitor@example.com", "ar"), {
    from: "OrthoTypikon <info@orthotypikon.org>",
    to: ["visitor@example.com"],
    subject: "تلقينا رسالتك إلى OrthoTypikon",
    text: "وصلتنا رسالتك. سيراجع فريقنا رسالتك وسيرد عليك إذا لزم الأمر.",
  });
  assert.deepEqual(buildConfirmationEmail("visitor@example.com", "el"), {
    from: "OrthoTypikon <info@orthotypikon.org>",
    to: ["visitor@example.com"],
    subject: "Λάβαμε το μήνυμά σας προς το OrthoTypikon",
    text: "Λάβαμε το μήνυμά σας. Η ομάδα μας θα το εξετάσει και θα απαντήσει αν χρειάζεται.",
  });
});

test("confirmation email defaults to English for older clients", () => {
  assert.deepEqual(
    buildConfirmationEmail("visitor@example.com"),
    buildConfirmationEmail("visitor@example.com", "en"),
  );
});

test("contact endpoint validates submissions and sends confirmation only after support delivery", async () => {
  const supportSent = [];
  const confirmations = [];
  const app = express();
  app.use(express.json());
  app.set("trust proxy", true);
  app.use(createContactRouter(
    async (input) => {
      if (input.name === "Support delivery failure") throw new Error("provider unavailable");
      supportSent.push(input);
    },
    async (email, language) => {
      if (email === "confirmation-failure@example.com") throw new Error("provider unavailable");
      confirmations.push({ email, language });
    },
  ));
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
    assert.equal(supportSent.length, 0);
    assert.equal(confirmations.length, 0);

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
    assert.equal(supportSent.length, 1);
    assert.equal(supportSent[0].email, "visitor@example.com");
    assert.deepEqual(confirmations, [{ email: "visitor@example.com", language: "en" }]);

    for (const [language, ip] of [
      ["ar", "198.51.100.10"],
      ["el", "198.51.100.11"],
    ]) {
      const localizedResponse = await fetch(`${base}/contact`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": ip,
        },
        body: JSON.stringify({
          name: "Localized visitor",
          email: `${language}@example.com`,
          message: "Please contact me.",
          language,
        }),
      });
      assert.equal(localizedResponse.status, 202);
      assert.deepEqual(await localizedResponse.json(), { accepted: true });
    }
    assert.deepEqual(confirmations, [
      { email: "visitor@example.com", language: "en" },
      { email: "ar@example.com", language: "ar" },
      { email: "el@example.com", language: "el" },
    ]);

    const supportFailed = await fetch(`${base}/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Support delivery failure",
        email: "visitor@example.com",
        message: "Please contact me.",
      }),
    });
    assert.equal(supportFailed.status, 502);
    assert.deepEqual(await supportFailed.json(), {
      error: "We could not send your message. Please try again or email info@orthotypikon.org.",
      code: "support_delivery_failed",
    });
    assert.equal(confirmations.length, 3);

    const confirmationFailed = await fetch(`${base}/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Confirmation failure",
        email: "confirmation-failure@example.com",
        message: "This private message must not be included in the confirmation.",
      }),
    });
    assert.equal(confirmationFailed.status, 502);
    assert.deepEqual(await confirmationFailed.json(), {
      error: "Your message was delivered, but we could not send a confirmation email. Please do not submit the form again.",
      code: "confirmation_delivery_failed",
    });
    assert.equal(supportSent.length, 4);
    assert.deepEqual(confirmations, [
      { email: "visitor@example.com", language: "en" },
      { email: "ar@example.com", language: "ar" },
      { email: "el@example.com", language: "el" },
    ]);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
