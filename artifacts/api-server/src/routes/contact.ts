import { Router, type IRouter } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { z } from "zod";
import {
  SubmitContactMessageBody,
  SubmitContactMessageResponse,
} from "@workspace/api-zod";

const CONTACT_EMAIL = "info@orthotypikon.org";
const MAX_PER_HOUR = 5;
const WINDOW_MS = 60 * 60 * 1000;
const buckets = new Map<string, { count: number; resetAt: number }>();
type ContactInput = z.infer<typeof SubmitContactMessageBody>;

async function deliver(input: ContactInput): Promise<void> {
  const connectors = new ReplitConnectors();
  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `OrthoTypikon <${CONTACT_EMAIL}>`,
      to: [CONTACT_EMAIL],
      reply_to: input.email.trim(),
      subject: "New OrthoTypikon contact message",
      text: [
        `Name: ${input.name.trim()}`,
        `Email: ${input.email.trim()}`,
        input.country ? `Country: ${input.country.trim()}` : "",
        input.phone ? `Phone: ${input.phone.trim()}` : "",
        "",
        input.message.trim(),
      ].filter(Boolean).join("\n"),
    }),
  });
  if (!response.ok) throw new Error(`Resend rejected message: ${response.status}`);
}

export function createContactRouter(send: (input: ContactInput) => Promise<void> = deliver): IRouter {
  const router: IRouter = Router();
  router.post("/contact", async (req, res): Promise<void> => {
    const now = Date.now();
    if (buckets.size > 10_000) {
      for (const [key, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(key);
      }
    }
    const ip = req.ip ?? "unknown";
    const current = buckets.get(ip);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + WINDOW_MS }
      : current;
    bucket.count += 1;
    buckets.set(ip, bucket);
    if (bucket.count > MAX_PER_HOUR) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ error: "Too many messages. Please try again later." });
      return;
    }
    const parsed = SubmitContactMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Please check the form and try again." });
      return;
    }
    try {
      await send(parsed.data);
      res.status(202).json(SubmitContactMessageResponse.parse({ accepted: true }));
    } catch {
      req.log?.error("Contact email delivery failed");
      res.status(502).json({ error: "We could not send your message. Please try again or email info@orthotypikon.org." });
    }
  });
  return router;
}

export default createContactRouter();
