import { Router, type IRouter, type Request, type Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { db, prayerReportsTable, prayerRequestsTable } from "@workspace/db";
import {
  CreatePrayerRequestBody,
  CreatePrayerSessionBody,
  ReportPrayerRequestBody,
  ReviewPrayerRequestBody,
} from "@workspace/api-zod";
import { DatabaseUnavailableError } from "../lib/api-errors";

const router: IRouter = Router();
const SESSION_TTL_DAYS = 30;
const sessionSecret = process.env.SESSION_SECRET ?? "";
if (!sessionSecret) throw new Error("SESSION_SECRET must be set for prayer community sessions");
const moderatorKey = process.env.MODERATOR_KEY ?? "";
if (!moderatorKey) throw new Error("MODERATOR_KEY must be set for pastoral moderation");

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

function requireDatabase() {
  if (!db) throw new DatabaseUnavailableError();
  return db;
}

function consumeRateLimit(key: string, maximum: number, windowMs: number, res: Response) {
  const now = Date.now();
  const current = rateBuckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (bucket.count <= maximum) return true;
  res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
  res.status(429).json({ message: "تم تجاوز الحد المسموح مؤقتًا. حاول لاحقًا." });
  return false;
}

type SubjectRequest = Request & { prayerSubject?: string };

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function sessionToken(subject: string) {
  const payload = `${subject}.${Date.now() + SESSION_TTL_DAYS * 86400000}`;
  const signature = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  return `${encode(payload)}.${signature}`;
}

function subjectFromToken(token: string | undefined) {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const [subject, expiry] = payload.split(".");
    const expected = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
    if (!subject || !expiry || Number(expiry) < Date.now()) return null;
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    return subject;
  } catch {
    return null;
  }
}

function requireSession(req: SubjectRequest, res: Response) {
  const header = req.header("authorization");
  const subject = subjectFromToken(header?.startsWith("Bearer ") ? header.slice(7) : undefined);
  if (!subject) {
    res.status(401).json({ message: "جلسة الصلاة غير صالحة أو منتهية." });
    return null;
  }
  req.prayerSubject = subject;
  return subject;
}

function requireModerator(req: Request, res: Response) {
  if (req.header("x-moderation-key") !== moderatorKey) {
    res.status(401).json({ message: "صلاحية الإشراف مطلوبة." });
    return false;
  }
  return true;
}

function output(row: typeof prayerRequestsTable.$inferSelect, includePrivate = false) {
  const isPrivate = row.visibility === "private" && !includePrivate;
  const canSeePrivateFields = includePrivate || !isPrivate;
  return {
    id: row.id,
    name: row.nameVisibility === "anonymous" || isPrivate ? "شخص طلب الصلاة" : row.name,
    category: canSeePrivateFields && row.showCategory ? row.category : undefined,
    visibility: row.visibility,
    nameVisibility: row.nameVisibility,
    showCategory: row.showCategory,
    showDuration: row.showDuration,
    durationDays: canSeePrivateFields && row.showDuration ? row.durationDays : undefined,
    status: row.status,
    expiresAt: row.expiresAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

router.post("/prayer-community/session", async (req, res, next) => {
  try {
    if (!consumeRateLimit(`session:${req.ip}`, 10, 60 * 60 * 1000, res)) return;
    const { installationId } = CreatePrayerSessionBody.parse(req.body);
    res.json({
      token: sessionToken(installationId),
      expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 86400000).toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/prayer-community/requests", async (req: SubjectRequest, res, next) => {
  try {
    const subject = requireSession(req, res);
    if (!subject) return;
    const scope = req.query.scope === "mine" ? "mine" : "community";
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 50);
    const now = new Date();
    const rows = scope === "mine"
      ? await requireDatabase().select().from(prayerRequestsTable).where(eq(prayerRequestsTable.ownerSubject, subject)).orderBy(desc(prayerRequestsTable.createdAt)).limit(limit)
      : await requireDatabase().select().from(prayerRequestsTable).where(and(
          eq(prayerRequestsTable.status, "approved"),
          eq(prayerRequestsTable.visibility, "community"),
          or(isNull(prayerRequestsTable.expiresAt), gt(prayerRequestsTable.expiresAt, now)),
        )).orderBy(desc(prayerRequestsTable.createdAt)).limit(limit);
    res.json({ requests: rows.map((row) => output(row, scope === "mine" && row.ownerSubject === subject)) });
  } catch (error) {
    next(error);
  }
});

router.post("/prayer-community/requests", async (req: SubjectRequest, res, next) => {
  try {
    const subject = requireSession(req, res);
    if (!subject) return;
    if (!consumeRateLimit(`submit:${subject}`, 5, 60 * 60 * 1000, res)) return;
    const input = CreatePrayerRequestBody.parse(req.body);
    const now = new Date();
    const row = {
      id: crypto.randomUUID(),
      ownerSubject: subject,
      name: input.name.trim(),
      category: input.category,
      visibility: input.visibility,
      nameVisibility: input.nameVisibility,
      showCategory: input.showCategory,
      showDuration: input.showDuration,
      durationDays: input.durationDays,
      expiresAt: new Date(now.getTime() + input.durationDays * 86400000),
      status: input.visibility === "private" ? "approved" : "pending",
      createdAt: now,
    };
    const [created] = await requireDatabase().insert(prayerRequestsTable).values(row).returning();
    res.status(201).json(output(created, true));
  } catch (error) {
    next(error);
  }
});

router.delete("/prayer-community/requests/:requestId", async (req: SubjectRequest, res, next) => {
  try {
    const subject = requireSession(req, res);
    if (!subject) return;
    const requestId = String(req.params.requestId);
    const result = await requireDatabase().update(prayerRequestsTable).set({ status: "removed" }).where(and(
      eq(prayerRequestsTable.id, requestId),
      eq(prayerRequestsTable.ownerSubject, subject),
    )).returning({ id: prayerRequestsTable.id });
    if (!result.length) {
      res.status(404).json({ message: "طلب الصلاة غير موجود." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post("/prayer-community/requests/:requestId/report", async (req: SubjectRequest, res, next) => {
  try {
    const subject = requireSession(req, res);
    if (!subject) return;
    if (!consumeRateLimit(`report:${subject}`, 20, 60 * 60 * 1000, res)) return;
    const { reason } = ReportPrayerRequestBody.parse(req.body);
    const requestId = String(req.params.requestId);
    const [request] = await requireDatabase().select().from(prayerRequestsTable).where(eq(prayerRequestsTable.id, requestId)).limit(1);
    if (!request || request.ownerSubject === subject || request.status === "removed") {
      res.status(404).json({ message: "طلب الصلاة غير موجود." });
      return;
    }
    await requireDatabase().transaction(async (tx) => {
      const inserted = await tx.insert(prayerReportsTable).values({
        id: crypto.randomUUID(),
        requestId: request.id,
        reporterSubject: subject,
        reason: reason.trim(),
      }).onConflictDoNothing().returning({ id: prayerReportsTable.id });
      if (!inserted.length) return;
      const reports = await tx.select({ id: prayerReportsTable.id }).from(prayerReportsTable).where(eq(prayerReportsTable.requestId, request.id));
      if (reports.length >= 3) {
        await tx.update(prayerRequestsTable).set({ status: "hidden" }).where(and(
          eq(prayerRequestsTable.id, request.id),
          eq(prayerRequestsTable.status, "approved"),
        ));
      }
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/moderation/prayer-requests", async (req, res, next) => {
  try {
    if (!requireModerator(req, res)) return;
    const rows = await requireDatabase().select().from(prayerRequestsTable).where(and(
      eq(prayerRequestsTable.visibility, "community"),
      or(eq(prayerRequestsTable.status, "pending"), eq(prayerRequestsTable.status, "hidden")),
    )).orderBy(desc(prayerRequestsTable.createdAt)).limit(100);
    res.json({ requests: rows.map((row) => output(row, true)) });
  } catch (error) {
    next(error);
  }
});

router.post("/moderation/prayer-requests/:requestId/review", async (req, res, next) => {
  try {
    if (!requireModerator(req, res)) return;
    const { status } = ReviewPrayerRequestBody.parse(req.body);
    const requestId = String(req.params.requestId);
    const [updated] = await requireDatabase().update(prayerRequestsTable).set({ status, reviewedAt: new Date() }).where(and(
      eq(prayerRequestsTable.id, requestId),
      eq(prayerRequestsTable.visibility, "community"),
    )).returning();
    if (!updated) {
      res.status(404).json({ message: "طلب الصلاة غير موجود." });
      return;
    }
    res.json(output(updated, true));
  } catch (error) {
    next(error);
  }
});

export default router;