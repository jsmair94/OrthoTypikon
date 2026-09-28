import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type RequestHandler, type Response } from "express";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
} from "drizzle-orm";
import {
  calendarEntriesTable,
  calendarEntrySaintsTable,
  dailyContentTable,
  db,
  fastingGuidanceTable,
  fastingRecipesTable,
  learningEntriesTable,
  prayerRequestsTable,
  saintsTable,
} from "@workspace/db";
import {
  ArchiveAdminCalendarEntryParams,
  ArchiveAdminDailyContentParams,
  ArchiveAdminFastingGuidanceParams,
  ArchiveAdminFastingRecipeParams,
  ArchiveAdminLearningEntryParams,
  ArchiveAdminSaintParams,
  ArchiveAdminCalendarEntryResponse,
  ArchiveAdminDailyContentResponse,
  ArchiveAdminFastingGuidanceResponse,
  ArchiveAdminFastingRecipeResponse,
  ArchiveAdminLearningEntryResponse,
  ArchiveAdminSaintResponse,
  CreateAdminFastingRecipeBody,
  CreateAdminFastingRecipeResponse,
  CreateAdminLearningEntryBody,
  CreateAdminLearningEntryResponse,
  CreateAdminSaintBody,
  CreateAdminSaintResponse,
  CreateAdminSessionBody,
  CreateAdminSessionResponse,
  GetAdminOverviewResponse,
  ListAdminCalendarEntriesQueryParams,
  ListAdminCalendarEntriesResponse,
  ListAdminDailyContentQueryParams,
  ListAdminDailyContentResponse,
  ListAdminFastingGuidanceQueryParams,
  ListAdminFastingGuidanceResponse,
  ListAdminFastingRecipesQueryParams,
  ListAdminFastingRecipesResponse,
  ListAdminLearningEntriesQueryParams,
  ListAdminLearningEntriesResponse,
  ListAdminPrayerRequestsResponse,
  ListAdminSaintsQueryParams,
  ListAdminSaintsResponse,
  ReviewAdminPrayerRequestBody,
  ReviewAdminPrayerRequestParams,
  ReviewAdminPrayerRequestResponse,
  UpdateAdminCalendarEntryBody,
  UpdateAdminCalendarEntryParams,
  UpdateAdminCalendarEntryResponse,
  UpdateAdminDailyContentBody,
  UpdateAdminDailyContentParams,
  UpdateAdminDailyContentResponse,
  UpdateAdminFastingGuidanceBody,
  UpdateAdminFastingGuidanceParams,
  UpdateAdminFastingGuidanceResponse,
  UpdateAdminFastingRecipeBody,
  UpdateAdminFastingRecipeParams,
  UpdateAdminFastingRecipeResponse,
  UpdateAdminLearningEntryBody,
  UpdateAdminLearningEntryParams,
  UpdateAdminLearningEntryResponse,
  UpdateAdminSaintBody,
  UpdateAdminSaintParams,
  UpdateAdminSaintResponse,
  UpsertAdminCalendarEntryBody,
  UpsertAdminCalendarEntryResponse,
  UpsertAdminDailyContentBody,
  UpsertAdminDailyContentResponse,
  UpsertAdminFastingGuidanceBody,
  UpsertAdminFastingGuidanceResponse,
} from "@workspace/api-zod";
import { DatabaseUnavailableError, invalidRequest, notFound } from "../lib/api-errors";

const router: IRouter = Router();
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_LOGIN_LIMIT = 8;
const adminKey = process.env.MODERATOR_KEY ?? "";
const sessionSecret = process.env.SESSION_SECRET ?? "";

type LoginBucket = { attempts: number; resetAt: number };
const loginBuckets = new Map<string, LoginBucket>();

function requireDatabase() {
  if (!db) throw new DatabaseUnavailableError();
  return db;
}

function constantTimeEqual(actual: string, expected: string) {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes);
}

function createAdminToken(expiresAt: number) {
  const payload = Buffer.from(JSON.stringify({ role: "admin", expiresAt })).toString("base64url");
  const signature = createHmac("sha256", sessionSecret)
    .update(`admin.${payload}`)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function isAdminTokenValid(token: string | undefined) {
  if (!token || !sessionSecret) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = createHmac("sha256", sessionSecret)
    .update(`admin.${payload}`)
    .digest("base64url");
  if (!constantTimeEqual(signature, expected)) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      role?: unknown;
      expiresAt?: unknown;
    };
    return decoded.role === "admin" &&
      typeof decoded.expiresAt === "number" &&
      Number.isFinite(decoded.expiresAt) &&
      decoded.expiresAt > Date.now();
  } catch {
    return false;
  }
}

function consumeLoginAttempt(ip: string, res: Response) {
  const now = Date.now();
  const current = loginBuckets.get(ip);
  const bucket = !current || current.resetAt <= now
    ? { attempts: 0, resetAt: now + ADMIN_LOGIN_WINDOW_MS }
    : current;
  bucket.attempts += 1;
  loginBuckets.set(ip, bucket);
  if (bucket.attempts <= ADMIN_LOGIN_LIMIT) return true;
  res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
  res.status(429).json({ message: "Too many administrator sign-in attempts. Try again later." });
  return false;
}

const requireAdmin: RequestHandler = (req, res, next) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!isAdminTokenValid(token)) {
    res.status(401).json({ message: "Administrator session is invalid or expired." });
    return;
  }
  next();
};

router.post("/admin/session", (req, res): void => {
  if (!consumeLoginAttempt(req.ip ?? "unknown", res)) return;
  const parsed = CreateAdminSessionBody.safeParse(req.body);
  if (!parsed.success) throw invalidRequest();
  if (!adminKey || !sessionSecret || !constantTimeEqual(parsed.data.key, adminKey)) {
    res.status(401).json({ message: "Administrator key is invalid." });
    return;
  }

  const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
  res.json(CreateAdminSessionResponse.parse({
    token: createAdminToken(expiresAt),
    expiresAt: new Date(expiresAt).toISOString(),
  }));
});

router.use("/admin", requireAdmin);

function timestamped<T extends { createdAt: Date; updatedAt: Date }>(row: T) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function pagination(page: number, limit: number, total: number) {
  return { page, limit, total, hasMore: page * limit < total };
}

function databaseDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

type StatusCountRow = { status: string; total: number };

function contentCounts(rows: StatusCountRow[]) {
  const countFor = (status: string) => rows.find((row) => row.status === status)?.total ?? 0;
  return {
    total: rows.reduce((sum, row) => sum + row.total, 0),
    published: countFor("published"),
    draft: countFor("draft"),
    archived: countFor("archived"),
  };
}

router.get("/admin/overview", async (_req, res): Promise<void> => {
  const database = requireDatabase();
  const [
    daily,
    calendar,
    saints,
    fasting,
    recipes,
    learning,
    pendingPrayerRequests,
    hiddenPrayerRequests,
  ] = await Promise.all([
    database.select({ status: dailyContentTable.publicationStatus, total: count() })
      .from(dailyContentTable).groupBy(dailyContentTable.publicationStatus),
    database.select({ status: calendarEntriesTable.publicationStatus, total: count() })
      .from(calendarEntriesTable).groupBy(calendarEntriesTable.publicationStatus),
    database.select({ status: saintsTable.publicationStatus, total: count() })
      .from(saintsTable).groupBy(saintsTable.publicationStatus),
    database.select({ status: fastingGuidanceTable.publicationStatus, total: count() })
      .from(fastingGuidanceTable).groupBy(fastingGuidanceTable.publicationStatus),
    database.select({ status: fastingRecipesTable.publicationStatus, total: count() })
      .from(fastingRecipesTable).groupBy(fastingRecipesTable.publicationStatus),
    database.select({ status: learningEntriesTable.publicationStatus, total: count() })
      .from(learningEntriesTable).groupBy(learningEntriesTable.publicationStatus),
    database.select({ total: count() }).from(prayerRequestsTable)
      .where(and(
        eq(prayerRequestsTable.visibility, "community"),
        eq(prayerRequestsTable.status, "pending"),
      )),
    database.select({ total: count() }).from(prayerRequestsTable)
      .where(and(
        eq(prayerRequestsTable.visibility, "community"),
        eq(prayerRequestsTable.status, "hidden"),
      )),
  ]);

  res.json(GetAdminOverviewResponse.parse({
    dailyContent: contentCounts(daily),
    calendarEntries: contentCounts(calendar),
    saints: contentCounts(saints),
    fastingGuidance: contentCounts(fasting),
    fastingRecipes: contentCounts(recipes),
    learningEntries: contentCounts(learning),
    prayerRequestsPending: pendingPrayerRequests[0]?.total ?? 0,
    prayerRequestsHidden: hiddenPrayerRequests[0]?.total ?? 0,
  }));
});

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: unknown }).code === "23505";
}

function sendConflict(res: Response, message: string) {
  res.status(409).json({ error: message, code: "INVALID_REQUEST" });
}

function prayerRequestOutput(row: typeof prayerRequestsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.nameVisibility === "anonymous" ? "Someone requested prayer" : row.name,
    ...(row.showCategory ? { category: row.category } : {}),
    visibility: row.visibility,
    nameVisibility: row.nameVisibility,
    showCategory: row.showCategory,
    showDuration: row.showDuration,
    ...(row.showDuration ? { durationDays: row.durationDays } : {}),
    status: row.status,
    ...(row.expiresAt ? { expiresAt: row.expiresAt.toISOString() } : {}),
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/admin/moderation/prayer-requests", async (_req, res): Promise<void> => {
  const rows = await requireDatabase()
    .select()
    .from(prayerRequestsTable)
    .where(and(
      eq(prayerRequestsTable.visibility, "community"),
      or(
        eq(prayerRequestsTable.status, "pending"),
        eq(prayerRequestsTable.status, "hidden"),
      ),
    ))
    .orderBy(desc(prayerRequestsTable.createdAt))
    .limit(100);
  res.json(ListAdminPrayerRequestsResponse.parse({
    requests: rows.map(prayerRequestOutput),
  }));
});

router.post("/admin/moderation/prayer-requests/:requestId/review", async (req, res): Promise<void> => {
  const params = ReviewAdminPrayerRequestParams.safeParse(req.params);
  const body = ReviewAdminPrayerRequestBody.safeParse(req.body);
  if (!params.success || !body.success) throw invalidRequest();

  const [updated] = await requireDatabase()
    .update(prayerRequestsTable)
    .set({ status: body.data.status, reviewedAt: new Date() })
    .where(and(
      eq(prayerRequestsTable.id, params.data.requestId),
      eq(prayerRequestsTable.visibility, "community"),
    ))
    .returning();
  if (!updated) throw notFound("Prayer request was not found.");
  res.json(ReviewAdminPrayerRequestResponse.parse(prayerRequestOutput(updated)));
});

router.get("/admin/daily-content", async (req, res): Promise<void> => {
  const parsed = ListAdminDailyContentQueryParams.safeParse(req.query);
  if (!parsed.success) throw invalidRequest();
  const { page, limit, locale, publicationStatus, search } = parsed.data;
  const pattern = search?.trim() ? `%${search.trim()}%` : undefined;
  const dateSearch = search && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(search)
    ? eq(dailyContentTable.contentDate, search)
    : undefined;
  const filter = and(
    locale ? eq(dailyContentTable.locale, locale) : undefined,
    publicationStatus
      ? eq(dailyContentTable.publicationStatus, publicationStatus)
      : undefined,
    pattern ? or(
      ilike(dailyContentTable.verseReference, pattern),
      ilike(dailyContentTable.verseText, pattern),
      ilike(dailyContentTable.verseAuthor, pattern),
      ilike(dailyContentTable.feastTitle, pattern),
      dateSearch,
    ) : undefined,
  );
  const database = requireDatabase();
  const [items, totals] = await Promise.all([
    database.select().from(dailyContentTable).where(filter)
      .orderBy(desc(dailyContentTable.contentDate), asc(dailyContentTable.locale))
      .limit(limit).offset((page - 1) * limit),
    database.select({ total: count() }).from(dailyContentTable).where(filter),
  ]);
  const total = totals[0]?.total ?? 0;
  res.json(ListAdminDailyContentResponse.parse({
    items: items.map(timestamped),
    pagination: pagination(page, limit, total),
  }));
});

router.post("/admin/daily-content", async (req, res): Promise<void> => {
  const parsed = UpsertAdminDailyContentBody.safeParse(req.body);
  if (!parsed.success) throw invalidRequest();
  const database = requireDatabase();
  const input = {
    ...parsed.data,
    contentDate: databaseDate(parsed.data.contentDate),
  };
  try {
    const [row] = await database.insert(dailyContentTable).values({
      id: randomUUID(),
      ...input,
    }).onConflictDoUpdate({
      target: [
        dailyContentTable.contentDate,
        dailyContentTable.calendarSystem,
        dailyContentTable.locale,
      ],
      set: { ...input, updatedAt: new Date() },
    }).returning();
    res.json(UpsertAdminDailyContentResponse.parse(timestamped(row)));
  } catch (error) {
    if (isUniqueViolation(error)) {
      sendConflict(res, "Daily content conflicts with an existing record.");
      return;
    }
    throw error;
  }
});

router.put("/admin/daily-content/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminDailyContentParams.safeParse(req.params);
  const body = UpdateAdminDailyContentBody.safeParse(req.body);
  if (!params.success || !body.success) throw invalidRequest();
  const input = {
    ...body.data,
    contentDate: databaseDate(body.data.contentDate),
  };
  try {
    const [row] = await requireDatabase().update(dailyContentTable)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(dailyContentTable.id, params.data.id))
      .returning();
    if (!row) throw notFound("Daily content was not found.");
    res.json(UpdateAdminDailyContentResponse.parse(timestamped(row)));
  } catch (error) {
    if (isUniqueViolation(error)) {
      sendConflict(res, "Daily content conflicts with an existing record.");
      return;
    }
    throw error;
  }
});

router.delete("/admin/daily-content/:id", async (req, res): Promise<void> => {
  const params = ArchiveAdminDailyContentParams.safeParse(req.params);
  if (!params.success) throw invalidRequest();
  const [row] = await requireDatabase().update(dailyContentTable)
    .set({ publicationStatus: "archived", updatedAt: new Date() })
    .where(eq(dailyContentTable.id, params.data.id))
    .returning({ id: dailyContentTable.id });
  if (!row) throw notFound("Daily content was not found.");
  res.status(204).send();
});

async function validateSaintIds(ids: string[]) {
  if (!ids.length) return;
  const uniqueIds = Array.from(new Set(ids));
  const found = await requireDatabase().select({ id: saintsTable.id })
    .from(saintsTable).where(inArray(saintsTable.id, uniqueIds));
  if (found.length !== uniqueIds.length) {
    throw invalidRequest("One or more selected saints do not exist.");
  }
}

async function saveCalendarEntry(
  input: typeof UpsertAdminCalendarEntryBody._output,
  id: string = randomUUID(),
) {
  const database = requireDatabase();
  const saintIds = Array.from(new Set(input.saintIds));
  await validateSaintIds(saintIds);
  return database.transaction(async (tx) => {
    const { saintIds: _saintIds, ...rawValues } = input;
    const values = {
      ...rawValues,
      gregorianDate: databaseDate(rawValues.gregorianDate),
    };
    const [entry] = await tx.insert(calendarEntriesTable).values({
      id,
      ...values,
    }).onConflictDoUpdate({
      target: [
        calendarEntriesTable.gregorianDate,
        calendarEntriesTable.calendarSystem,
        calendarEntriesTable.locale,
      ],
      set: { ...values, updatedAt: new Date() },
    }).returning();
    await tx.delete(calendarEntrySaintsTable)
      .where(eq(calendarEntrySaintsTable.calendarEntryId, entry.id));
    if (saintIds.length) {
      await tx.insert(calendarEntrySaintsTable).values(
        saintIds.map((saintId) => ({ calendarEntryId: entry.id, saintId })),
      ).onConflictDoNothing();
    }
    return { ...entry, saintIds };
  });
}

async function updateCalendarEntry(
  id: string,
  input: typeof UpsertAdminCalendarEntryBody._output,
) {
  const database = requireDatabase();
  const saintIds = Array.from(new Set(input.saintIds));
  await validateSaintIds(saintIds);
  return database.transaction(async (tx) => {
    const { saintIds: _saintIds, ...rawValues } = input;
    const [entry] = await tx.update(calendarEntriesTable).set({
      ...rawValues,
      gregorianDate: databaseDate(rawValues.gregorianDate),
      updatedAt: new Date(),
    }).where(eq(calendarEntriesTable.id, id)).returning();
    if (!entry) throw notFound("Calendar entry was not found.");
    await tx.delete(calendarEntrySaintsTable)
      .where(eq(calendarEntrySaintsTable.calendarEntryId, entry.id));
    if (saintIds.length) {
      await tx.insert(calendarEntrySaintsTable).values(
        saintIds.map((saintId) => ({ calendarEntryId: entry.id, saintId })),
      ).onConflictDoNothing();
    }
    return { ...entry, saintIds };
  });
}

async function calendarEntryWithSaintIds(
  entry: typeof calendarEntriesTable.$inferSelect,
) {
  const links = await requireDatabase().select({ saintId: calendarEntrySaintsTable.saintId })
    .from(calendarEntrySaintsTable)
    .where(eq(calendarEntrySaintsTable.calendarEntryId, entry.id));
  return { ...timestamped(entry), saintIds: links.map((link) => link.saintId) };
}

router.get("/admin/calendar-entries", async (req, res): Promise<void> => {
  const parsed = ListAdminCalendarEntriesQueryParams.safeParse(req.query);
  if (!parsed.success) throw invalidRequest();
  const { page, limit, locale, publicationStatus, search } = parsed.data;
  const pattern = search?.trim() ? `%${search.trim()}%` : undefined;
  const dateSearch = search && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(search)
    ? eq(calendarEntriesTable.gregorianDate, search)
    : undefined;
  const filter = and(
    locale ? eq(calendarEntriesTable.locale, locale) : undefined,
    publicationStatus
      ? eq(calendarEntriesTable.publicationStatus, publicationStatus)
      : undefined,
    pattern ? or(
      ilike(calendarEntriesTable.feastTitle, pattern),
      ilike(calendarEntriesTable.fastingTitle, pattern),
      ilike(calendarEntriesTable.liturgy, pattern),
      dateSearch,
    ) : undefined,
  );
  const database = requireDatabase();
  const [items, totals] = await Promise.all([
    database.select().from(calendarEntriesTable).where(filter)
      .orderBy(desc(calendarEntriesTable.gregorianDate), asc(calendarEntriesTable.locale))
      .limit(limit).offset((page - 1) * limit),
    database.select({ total: count() }).from(calendarEntriesTable).where(filter),
  ]);
  const total = totals[0]?.total ?? 0;
  const entries = await Promise.all(items.map(calendarEntryWithSaintIds));
  res.json(ListAdminCalendarEntriesResponse.parse({
    items: entries,
    pagination: pagination(page, limit, total),
  }));
});

router.post("/admin/calendar-entries", async (req, res): Promise<void> => {
  const parsed = UpsertAdminCalendarEntryBody.safeParse(req.body);
  if (!parsed.success) throw invalidRequest();
  try {
    const row = await saveCalendarEntry(parsed.data);
    res.json(UpsertAdminCalendarEntryResponse.parse({
      ...timestamped(row),
      saintIds: row.saintIds,
    }));
  } catch (error) {
    if (isUniqueViolation(error)) {
      sendConflict(res, "Calendar entry conflicts with an existing record.");
      return;
    }
    throw error;
  }
});

router.put("/admin/calendar-entries/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminCalendarEntryParams.safeParse(req.params);
  const body = UpdateAdminCalendarEntryBody.safeParse(req.body);
  if (!params.success || !body.success) throw invalidRequest();
  try {
    const row = await updateCalendarEntry(params.data.id, body.data);
    res.json(UpdateAdminCalendarEntryResponse.parse({
      ...timestamped(row),
      saintIds: row.saintIds,
    }));
  } catch (error) {
    if (isUniqueViolation(error)) {
      sendConflict(res, "Calendar entry conflicts with an existing record.");
      return;
    }
    throw error;
  }
});

router.delete("/admin/calendar-entries/:id", async (req, res): Promise<void> => {
  const params = ArchiveAdminCalendarEntryParams.safeParse(req.params);
  if (!params.success) throw invalidRequest();
  const [row] = await requireDatabase().update(calendarEntriesTable)
    .set({ publicationStatus: "archived", updatedAt: new Date() })
    .where(eq(calendarEntriesTable.id, params.data.id))
    .returning({ id: calendarEntriesTable.id });
  if (!row) throw notFound("Calendar entry was not found.");
  res.status(204).send();
});

router.get("/admin/saints", async (req, res): Promise<void> => {
  const parsed = ListAdminSaintsQueryParams.safeParse(req.query);
  if (!parsed.success) throw invalidRequest();
  const { page, limit, locale, publicationStatus, search } = parsed.data;
  const pattern = search?.trim() ? `%${search.trim()}%` : undefined;
  const filter = and(
    locale ? eq(saintsTable.locale, locale) : undefined,
    publicationStatus ? eq(saintsTable.publicationStatus, publicationStatus) : undefined,
    pattern ? or(
      ilike(saintsTable.name, pattern),
      ilike(saintsTable.shortBio, pattern),
      ilike(saintsTable.audioText, pattern),
    ) : undefined,
  );
  const database = requireDatabase();
  const [items, totals] = await Promise.all([
    database.select().from(saintsTable).where(filter)
      .orderBy(asc(saintsTable.name)).limit(limit).offset((page - 1) * limit),
    database.select({ total: count() }).from(saintsTable).where(filter),
  ]);
  const total = totals[0]?.total ?? 0;
  res.json(ListAdminSaintsResponse.parse({
    items: items.map(timestamped),
    pagination: pagination(page, limit, total),
  }));
});

router.post("/admin/saints", async (req, res): Promise<void> => {
  const parsed = CreateAdminSaintBody.safeParse(req.body);
  if (!parsed.success) throw invalidRequest();
  try {
    const [row] = await requireDatabase().insert(saintsTable)
      .values(parsed.data).returning();
    res.status(201).json(CreateAdminSaintResponse.parse(timestamped(row)));
  } catch (error) {
    if (isUniqueViolation(error)) {
      sendConflict(res, "A saint with this identifier or name already exists for that locale.");
      return;
    }
    throw error;
  }
});

router.put("/admin/saints/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminSaintParams.safeParse(req.params);
  const body = UpdateAdminSaintBody.safeParse(req.body);
  if (!params.success || !body.success) throw invalidRequest();
  try {
    const [row] = await requireDatabase().update(saintsTable)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(saintsTable.id, params.data.id))
      .returning();
    if (!row) throw notFound("Saint was not found.");
    res.json(UpdateAdminSaintResponse.parse(timestamped(row)));
  } catch (error) {
    if (isUniqueViolation(error)) {
      sendConflict(res, "A saint with this name already exists for that locale.");
      return;
    }
    throw error;
  }
});

router.delete("/admin/saints/:id", async (req, res): Promise<void> => {
  const params = ArchiveAdminSaintParams.safeParse(req.params);
  if (!params.success) throw invalidRequest();
  const [row] = await requireDatabase().update(saintsTable)
    .set({ publicationStatus: "archived", updatedAt: new Date() })
    .where(eq(saintsTable.id, params.data.id))
    .returning({ id: saintsTable.id });
  if (!row) throw notFound("Saint was not found.");
  res.status(204).send();
});

router.get("/admin/fasting-guidance", async (req, res): Promise<void> => {
  const parsed = ListAdminFastingGuidanceQueryParams.safeParse(req.query);
  if (!parsed.success) throw invalidRequest();
  const { page, limit, locale, publicationStatus, search } = parsed.data;
  const pattern = search?.trim() ? `%${search.trim()}%` : undefined;
  const dateSearch = search && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(search)
    ? eq(fastingGuidanceTable.contentDate, search)
    : undefined;
  const filter = and(
    locale ? eq(fastingGuidanceTable.locale, locale) : undefined,
    publicationStatus
      ? eq(fastingGuidanceTable.publicationStatus, publicationStatus)
      : undefined,
    pattern ? or(
      ilike(fastingGuidanceTable.title, pattern),
      ilike(fastingGuidanceTable.description, pattern),
      dateSearch,
    ) : undefined,
  );
  const database = requireDatabase();
  const [items, totals] = await Promise.all([
    database.select().from(fastingGuidanceTable).where(filter)
      .orderBy(desc(fastingGuidanceTable.contentDate), asc(fastingGuidanceTable.locale))
      .limit(limit).offset((page - 1) * limit),
    database.select({ total: count() }).from(fastingGuidanceTable).where(filter),
  ]);
  const total = totals[0]?.total ?? 0;
  res.json(ListAdminFastingGuidanceResponse.parse({
    items: items.map(timestamped),
    pagination: pagination(page, limit, total),
  }));
});

router.post("/admin/fasting-guidance", async (req, res): Promise<void> => {
  const parsed = UpsertAdminFastingGuidanceBody.safeParse(req.body);
  if (!parsed.success) throw invalidRequest();
  const input = {
    ...parsed.data,
    contentDate: databaseDate(parsed.data.contentDate),
  };
  try {
    const [row] = await requireDatabase().insert(fastingGuidanceTable).values({
      id: randomUUID(),
      ...input,
    }).onConflictDoUpdate({
      target: [
        fastingGuidanceTable.contentDate,
        fastingGuidanceTable.calendarSystem,
        fastingGuidanceTable.locale,
      ],
      set: { ...input, updatedAt: new Date() },
    }).returning();
    res.json(UpsertAdminFastingGuidanceResponse.parse(timestamped(row)));
  } catch (error) {
    if (isUniqueViolation(error)) {
      sendConflict(res, "Fasting guidance conflicts with an existing record.");
      return;
    }
    throw error;
  }
});

router.put("/admin/fasting-guidance/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminFastingGuidanceParams.safeParse(req.params);
  const body = UpdateAdminFastingGuidanceBody.safeParse(req.body);
  if (!params.success || !body.success) throw invalidRequest();
  const input = {
    ...body.data,
    contentDate: databaseDate(body.data.contentDate),
  };
  try {
    const [row] = await requireDatabase().update(fastingGuidanceTable)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(fastingGuidanceTable.id, params.data.id))
      .returning();
    if (!row) throw notFound("Fasting guidance was not found.");
    res.json(UpdateAdminFastingGuidanceResponse.parse(timestamped(row)));
  } catch (error) {
    if (isUniqueViolation(error)) {
      sendConflict(res, "Fasting guidance conflicts with an existing record.");
      return;
    }
    throw error;
  }
});

router.delete("/admin/fasting-guidance/:id", async (req, res): Promise<void> => {
  const params = ArchiveAdminFastingGuidanceParams.safeParse(req.params);
  if (!params.success) throw invalidRequest();
  const [row] = await requireDatabase().update(fastingGuidanceTable)
    .set({ publicationStatus: "archived", updatedAt: new Date() })
    .where(eq(fastingGuidanceTable.id, params.data.id))
    .returning({ id: fastingGuidanceTable.id });
  if (!row) throw notFound("Fasting guidance was not found.");
  res.status(204).send();
});

router.get("/admin/fasting-recipes", async (req, res): Promise<void> => {
  const parsed = ListAdminFastingRecipesQueryParams.safeParse(req.query);
  if (!parsed.success) throw invalidRequest();
  const { page, limit, locale, publicationStatus, search } = parsed.data;
  const pattern = search?.trim() ? `%${search.trim()}%` : undefined;
  const filter = and(
    locale ? eq(fastingRecipesTable.locale, locale) : undefined,
    publicationStatus ? eq(fastingRecipesTable.publicationStatus, publicationStatus) : undefined,
    pattern ? or(
      ilike(fastingRecipesTable.title, pattern),
      ilike(fastingRecipesTable.subtitle, pattern),
      ilike(fastingRecipesTable.time, pattern),
    ) : undefined,
  );
  const database = requireDatabase();
  const [items, totals] = await Promise.all([
    database.select().from(fastingRecipesTable).where(filter)
      .orderBy(asc(fastingRecipesTable.title)).limit(limit).offset((page - 1) * limit),
    database.select({ total: count() }).from(fastingRecipesTable).where(filter),
  ]);
  const total = totals[0]?.total ?? 0;
  res.json(ListAdminFastingRecipesResponse.parse({
    items: items.map(timestamped),
    pagination: pagination(page, limit, total),
  }));
});

router.post("/admin/fasting-recipes", async (req, res): Promise<void> => {
  const parsed = CreateAdminFastingRecipeBody.safeParse(req.body);
  if (!parsed.success) throw invalidRequest();
  const [row] = await requireDatabase().insert(fastingRecipesTable)
    .values({ id: randomUUID(), ...parsed.data }).returning();
  res.status(201).json(CreateAdminFastingRecipeResponse.parse(timestamped(row)));
});

router.put("/admin/fasting-recipes/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminFastingRecipeParams.safeParse(req.params);
  const body = UpdateAdminFastingRecipeBody.safeParse(req.body);
  if (!params.success || !body.success) throw invalidRequest();
  const [row] = await requireDatabase().update(fastingRecipesTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(fastingRecipesTable.id, params.data.id))
    .returning();
  if (!row) throw notFound("Fasting recipe was not found.");
  res.json(UpdateAdminFastingRecipeResponse.parse(timestamped(row)));
});

router.delete("/admin/fasting-recipes/:id", async (req, res): Promise<void> => {
  const params = ArchiveAdminFastingRecipeParams.safeParse(req.params);
  if (!params.success) throw invalidRequest();
  const [row] = await requireDatabase().update(fastingRecipesTable)
    .set({ publicationStatus: "archived", updatedAt: new Date() })
    .where(eq(fastingRecipesTable.id, params.data.id))
    .returning({ id: fastingRecipesTable.id });
  if (!row) throw notFound("Fasting recipe was not found.");
  res.status(204).send();
});

router.get("/admin/learning-entries", async (req, res): Promise<void> => {
  const parsed = ListAdminLearningEntriesQueryParams.safeParse(req.query);
  if (!parsed.success) throw invalidRequest();
  const { page, limit, locale, publicationStatus, search } = parsed.data;
  const pattern = search?.trim() ? `%${search.trim()}%` : undefined;
  const filter = and(
    locale ? eq(learningEntriesTable.locale, locale) : undefined,
    publicationStatus ? eq(learningEntriesTable.publicationStatus, publicationStatus) : undefined,
    pattern ? or(
      ilike(learningEntriesTable.title, pattern),
      ilike(learningEntriesTable.alternate, pattern),
      ilike(learningEntriesTable.definition, pattern),
    ) : undefined,
  );
  const database = requireDatabase();
  const [items, totals] = await Promise.all([
    database.select().from(learningEntriesTable).where(filter)
      .orderBy(asc(learningEntriesTable.title)).limit(limit).offset((page - 1) * limit),
    database.select({ total: count() }).from(learningEntriesTable).where(filter),
  ]);
  const total = totals[0]?.total ?? 0;
  res.json(ListAdminLearningEntriesResponse.parse({
    items: items.map(timestamped),
    pagination: pagination(page, limit, total),
  }));
});

router.post("/admin/learning-entries", async (req, res): Promise<void> => {
  const parsed = CreateAdminLearningEntryBody.safeParse(req.body);
  if (!parsed.success) throw invalidRequest();
  try {
    const [row] = await requireDatabase().insert(learningEntriesTable)
      .values({ id: randomUUID(), ...parsed.data }).returning();
    res.status(201).json(CreateAdminLearningEntryResponse.parse(timestamped(row)));
  } catch (error) {
    if (isUniqueViolation(error)) {
      sendConflict(res, "A learning entry with this title already exists for that locale.");
      return;
    }
    throw error;
  }
});

router.put("/admin/learning-entries/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminLearningEntryParams.safeParse(req.params);
  const body = UpdateAdminLearningEntryBody.safeParse(req.body);
  if (!params.success || !body.success) throw invalidRequest();
  try {
    const [row] = await requireDatabase().update(learningEntriesTable)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(learningEntriesTable.id, params.data.id))
      .returning();
    if (!row) throw notFound("Learning entry was not found.");
    res.json(UpdateAdminLearningEntryResponse.parse(timestamped(row)));
  } catch (error) {
    if (isUniqueViolation(error)) {
      sendConflict(res, "A learning entry with this title already exists for that locale.");
      return;
    }
    throw error;
  }
});

router.delete("/admin/learning-entries/:id", async (req, res): Promise<void> => {
  const params = ArchiveAdminLearningEntryParams.safeParse(req.params);
  if (!params.success) throw invalidRequest();
  const [row] = await requireDatabase().update(learningEntriesTable)
    .set({ publicationStatus: "archived", updatedAt: new Date() })
    .where(eq(learningEntriesTable.id, params.data.id))
    .returning({ id: learningEntriesTable.id });
  if (!row) throw notFound("Learning entry was not found.");
  res.status(204).send();
});

export default router;