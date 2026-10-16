import { Router, type IRouter } from "express";
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

export function createResendSender(
  apiKey: string | undefined,
  request: typeof fetch = fetch,
): (payload: Record<string, unknown>) => Promise<void> {
  return async (payload) => {
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

    const response = await request("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Resend rejected email: ${response.status}`);
  };
}

const sendEmail = createResendSender(process.env.RESEND_API_KEY);

async function deliverSupportMessage(input: ContactInput): Promise<void> {
  await sendEmail({
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
  });
}

export function buildConfirmationEmail(email: string) {
  return {
    from: `OrthoTypikon <${CONTACT_EMAIL}>`,
    to: [email.trim()],
    subject: "We received your message to OrthoTypikon",
    text: "We received your message. Our team will review it and respond if needed.",
  };
}

async function deliverConfirmation(email: string): Promise<void> {
  await sendEmail(buildConfirmationEmail(email));
}

type ContactErrorCode = "support_delivery_failed" | "confirmation_delivery_failed";
type ContactError = { error: string; code?: ContactErrorCode };

export function createContactRouter(
  sendSupport: (input: ContactInput) => Promise<void> = deliverSupportMessage,
  sendConfirmation: (email: string) => Promise<void> = deliverConfirmation,
): IRouter {
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
      await sendSupport(parsed.data);
    } catch {
      req.log?.error("Contact support email delivery failed");
      const error: ContactError = {
        error: "We could not send your message. Please try again or email info@orthotypikon.org.",
        code: "support_delivery_failed",
      };
      res.status(502).json(error);
      return;
    }
    try {
      await sendConfirmation(parsed.data.email.trim());
    } catch {
      req.log?.error("Contact confirmation email delivery failed");
      const error: ContactError = {
        error: "Your message was delivered, but we could not send a confirmation email. Please do not submit the form again.",
        code: "confirmation_delivery_failed",
      };
      res.status(502).json(error);
      return;
    }
    res.status(202).json(SubmitContactMessageResponse.parse({ accepted: true }));
  });
  return router;
}

export default createContactRouter();
