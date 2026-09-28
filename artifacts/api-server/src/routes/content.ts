import { Router, type IRouter } from "express";
import {
  GetCalendarByDateParams,
  GetCalendarByDateQueryParams,
  GetCalendarByDateResponse,
  GetDailyContentQueryParams,
  GetDailyContentResponse,
  GetFastingByDateParams,
  GetFastingByDateQueryParams,
  GetFastingByDateResponse,
  GetSaintParams,
  GetSaintQueryParams,
  GetSaintResponse,
  ListCalendarByMonthQueryParams,
  ListCalendarByMonthResponse,
  ListLearningEntriesQueryParams,
  ListLearningEntriesResponse,
  ListSaintsQueryParams,
  ListSaintsResponse,
} from "@workspace/api-zod";
import { invalidRequest, notFound } from "../lib/api-errors";
import {
  isValidCalendarDate,
  isValidMonth,
  type CalendarType,
} from "../lib/dates";
import {
  getCalendarByDate,
  getDailyContent,
  getFastingByDate,
  getSaint,
  listCalendarByMonth,
  listLearningEntries,
  listSaints,
  type Locale,
} from "../services/content";
import { createSynaxarionHomepageRouter } from "./synaxarion-homepage";

const router: IRouter = Router();

router.use(createSynaxarionHomepageRouter());

function defaults(query: { locale?: Locale; calendarType?: CalendarType }) {
  return {
    locale: query.locale ?? "ar",
    calendarType: query.calendarType ?? "gregorian",
  } as const;
}

function requireValidDate(date: string, calendarType: CalendarType) {
  if (!isValidCalendarDate(date, calendarType)) {
    throw invalidRequest("Date must be a real calendar date in YYYY-MM-DD format.");
  }
}

router.get("/daily", async (req, res): Promise<void> => {
  const parsed = GetDailyContentQueryParams.safeParse(req.query);
  if (!parsed.success) throw invalidRequest();
  const { locale, calendarType } = defaults(parsed.data);
  const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);
  requireValidDate(date, calendarType);
  const content = await getDailyContent(date, locale, calendarType);
  if (!content) throw notFound("Daily content was not found.");
  res.json(GetDailyContentResponse.parse(content));
});

router.get("/calendar", async (req, res): Promise<void> => {
  const parsed = ListCalendarByMonthQueryParams.safeParse(req.query);
  if (!parsed.success) throw invalidRequest();
  const { locale, calendarType } = defaults(parsed.data);
  if (!isValidMonth(parsed.data.month)) {
    throw invalidRequest("Month must be in YYYY-MM format.");
  }
  const entries = await listCalendarByMonth(
    parsed.data.month,
    locale,
    calendarType,
  );
  res.json(ListCalendarByMonthResponse.parse(entries));
});

router.get("/calendar/:date", async (req, res): Promise<void> => {
  const params = GetCalendarByDateParams.safeParse(req.params);
  const query = GetCalendarByDateQueryParams.safeParse(req.query);
  if (!params.success || !query.success) throw invalidRequest();
  const { locale, calendarType } = defaults(query.data);
  requireValidDate(params.data.date, calendarType);
  const entry = await getCalendarByDate(
    params.data.date,
    locale,
    calendarType,
  );
  if (!entry) throw notFound("Calendar entry was not found.");
  res.json(GetCalendarByDateResponse.parse(entry));
});

router.get("/fasting/:date", async (req, res): Promise<void> => {
  const params = GetFastingByDateParams.safeParse(req.params);
  const query = GetFastingByDateQueryParams.safeParse(req.query);
  if (!params.success || !query.success) throw invalidRequest();
  const { locale, calendarType } = defaults(query.data);
  requireValidDate(params.data.date, calendarType);
  const guidance = await getFastingByDate(
    params.data.date,
    locale,
    calendarType,
  );
  if (!guidance) throw notFound("Fasting guidance was not found.");
  res.json(GetFastingByDateResponse.parse(guidance));
});

router.get("/saints", async (req, res): Promise<void> => {
  const parsed = ListSaintsQueryParams.safeParse(req.query);
  if (!parsed.success) throw invalidRequest();
  const result = await listSaints({
    locale: parsed.data.locale ?? "ar",
    page: parsed.data.page,
    limit: parsed.data.limit,
    search: parsed.data.search,
  });
  res.json(ListSaintsResponse.parse(result));
});

router.get("/saints/:id", async (req, res): Promise<void> => {
  const params = GetSaintParams.safeParse(req.params);
  const query = GetSaintQueryParams.safeParse(req.query);
  if (!params.success || !query.success) throw invalidRequest();
  const saint = await getSaint(params.data.id, query.data.locale ?? "ar");
  if (!saint) throw notFound("Saint was not found.");
  res.json(GetSaintResponse.parse(saint));
});

router.get("/learning", async (req, res): Promise<void> => {
  const parsed = ListLearningEntriesQueryParams.safeParse(req.query);
  if (!parsed.success) throw invalidRequest();
  const result = await listLearningEntries({
    locale: parsed.data.locale ?? "ar",
    page: parsed.data.page,
    limit: parsed.data.limit,
    search: parsed.data.search,
    category: parsed.data.category,
  });
  res.json(ListLearningEntriesResponse.parse(result));
});

export default router;
