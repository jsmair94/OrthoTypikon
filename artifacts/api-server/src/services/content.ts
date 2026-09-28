import {
  calendarEntriesTable,
  calendarEntrySaintsTable,
  dailyContentTable,
  db,
  fastingGuidanceTable,
  fastingRecipesTable,
  learningEntriesTable,
  saintsTable,
} from "@workspace/db";
import {
  and,
  asc,
  count,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  or,
} from "drizzle-orm";
import { DatabaseUnavailableError } from "../lib/api-errors";
import {
  fromCanonicalDate,
  monthBounds,
  toCanonicalDate,
  type CalendarType,
} from "../lib/dates";

export type Locale = "ar" | "en" | "fr";

async function queryDatabase<T>(
  operation: (database: NonNullable<typeof db>) => Promise<T>,
): Promise<T> {
  const database = db;
  if (!database) throw new DatabaseUnavailableError();
  try {
    return await operation(database);
  } catch (cause) {
    if (cause instanceof DatabaseUnavailableError) throw cause;
    throw new DatabaseUnavailableError({ cause });
  }
}

function saintSummary(row: {
  id: string;
  name: string;
  shortBio: string;
}) {
  return { id: row.id, name: row.name, shortBio: row.shortBio };
}

async function saintsForCalendarEntries(
  database: NonNullable<typeof db>,
  entryIds: string[],
) {
  const grouped = new Map<string, ReturnType<typeof saintSummary>[]>();
  if (!entryIds.length) return grouped;
  const rows = await database
    .select({
      calendarEntryId: calendarEntrySaintsTable.calendarEntryId,
      id: saintsTable.id,
      name: saintsTable.name,
      shortBio: saintsTable.shortBio,
    })
    .from(calendarEntrySaintsTable)
    .innerJoin(saintsTable, eq(calendarEntrySaintsTable.saintId, saintsTable.id))
    .where(
      and(
        inArray(calendarEntrySaintsTable.calendarEntryId, entryIds),
        eq(saintsTable.publicationStatus, "published"),
      ),
    )
    .orderBy(asc(saintsTable.name));
  for (const row of rows) {
    const list = grouped.get(row.calendarEntryId) ?? [];
    list.push(saintSummary(row));
    grouped.set(row.calendarEntryId, list);
  }
  return grouped;
}

function calendarResponse(
  entry: typeof calendarEntriesTable.$inferSelect,
  saints: ReturnType<typeof saintSummary>[],
  calendarType: CalendarType,
) {
  return {
    id: entry.id,
    date: fromCanonicalDate(entry.gregorianDate, calendarType),
    canonicalDate: entry.gregorianDate,
    calendarType,
    locale: entry.locale,
    feast: entry.feastTitle
      ? { title: entry.feastTitle, description: null }
      : null,
    fastingTitle: entry.fastingTitle,
    liturgy: entry.liturgy,
    color: entry.color,
    saints,
  };
}

export function getCalendarByDate(
  requestedDate: string,
  locale: Locale,
  calendarType: CalendarType,
) {
  const canonicalDate = toCanonicalDate(requestedDate, calendarType);
  return queryDatabase(async (database) => {
    const [entry] = await database
      .select()
      .from(calendarEntriesTable)
      .where(
        and(
          eq(calendarEntriesTable.gregorianDate, canonicalDate),
          eq(calendarEntriesTable.calendarSystem, "gregorian"),
          eq(calendarEntriesTable.locale, locale),
          eq(calendarEntriesTable.publicationStatus, "published"),
        ),
      )
      .limit(1);
    if (!entry) return null;
    const saints = await saintsForCalendarEntries(database, [entry.id]);
    return calendarResponse(entry, saints.get(entry.id) ?? [], calendarType);
  });
}

export function listCalendarByMonth(
  month: string,
  locale: Locale,
  calendarType: CalendarType,
) {
  const { start, end } = monthBounds(month, calendarType);
  return queryDatabase(async (database) => {
    const entries = await database
      .select()
      .from(calendarEntriesTable)
      .where(
        and(
          gte(calendarEntriesTable.gregorianDate, start),
          lt(calendarEntriesTable.gregorianDate, end),
          eq(calendarEntriesTable.calendarSystem, "gregorian"),
          eq(calendarEntriesTable.locale, locale),
          eq(calendarEntriesTable.publicationStatus, "published"),
        ),
      )
      .orderBy(asc(calendarEntriesTable.gregorianDate));
    const saints = await saintsForCalendarEntries(
      database,
      entries.map((entry) => entry.id),
    );
    return entries.map((entry) =>
      calendarResponse(entry, saints.get(entry.id) ?? [], calendarType),
    );
  });
}

export function getDailyContent(
  requestedDate: string,
  locale: Locale,
  calendarType: CalendarType,
) {
  const canonicalDate = toCanonicalDate(requestedDate, calendarType);
  return queryDatabase(async (database) => {
    const [daily] = await database
      .select()
      .from(dailyContentTable)
      .where(
        and(
          eq(dailyContentTable.contentDate, canonicalDate),
          eq(dailyContentTable.calendarSystem, "gregorian"),
          eq(dailyContentTable.locale, locale),
          eq(dailyContentTable.publicationStatus, "published"),
        ),
      )
      .limit(1);
    if (!daily) return null;

    const [calendar] = await database
      .select()
      .from(calendarEntriesTable)
      .where(
        and(
          eq(calendarEntriesTable.gregorianDate, canonicalDate),
          eq(calendarEntriesTable.calendarSystem, "gregorian"),
          eq(calendarEntriesTable.locale, locale),
          eq(calendarEntriesTable.publicationStatus, "published"),
        ),
      )
      .limit(1);
    const [fasting] = await database
      .select()
      .from(fastingGuidanceTable)
      .where(
        and(
          eq(fastingGuidanceTable.contentDate, canonicalDate),
          eq(fastingGuidanceTable.calendarSystem, "gregorian"),
          eq(fastingGuidanceTable.locale, locale),
          eq(fastingGuidanceTable.publicationStatus, "published"),
        ),
      )
      .limit(1);
    const groupedSaints = calendar
      ? await saintsForCalendarEntries(database, [calendar.id])
      : new Map();
    const feastTitle = daily.feastTitle ?? calendar?.feastTitle ?? null;
    return {
      date: requestedDate,
      canonicalDate,
      calendarType,
      locale,
      verse: {
        reference: daily.verseReference,
        text: daily.verseText,
        author: daily.verseAuthor,
      },
      feast: feastTitle
        ? {
            title: feastTitle,
            description: daily.feastDescription,
          }
        : null,
      saints: calendar ? groupedSaints.get(calendar.id) ?? [] : [],
      fasting: fasting ? { level: fasting.level, title: fasting.title } : null,
      relatedReading: daily.readingTitle
        ? {
            title: daily.readingTitle,
            reference: daily.readingReference,
            durationMinutes: daily.readingDurationMinutes,
          }
        : null,
    };
  });
}

export function getFastingByDate(
  requestedDate: string,
  locale: Locale,
  calendarType: CalendarType,
) {
  const canonicalDate = toCanonicalDate(requestedDate, calendarType);
  return queryDatabase(async (database) => {
    const [guidance] = await database
      .select()
      .from(fastingGuidanceTable)
      .where(
        and(
          eq(fastingGuidanceTable.contentDate, canonicalDate),
          eq(fastingGuidanceTable.calendarSystem, "gregorian"),
          eq(fastingGuidanceTable.locale, locale),
          eq(fastingGuidanceTable.publicationStatus, "published"),
        ),
      )
      .limit(1);
    if (!guidance) return null;

    const recipeLevels =
      guidance.level === "none"
        ? (["strict", "oil", "fish"] as const)
        : guidance.level === "oil"
          ? (["strict", "oil"] as const)
          : guidance.level === "fish"
            ? (["strict", "oil", "fish"] as const)
            : (["strict"] as const);
    const recipes = await database
      .select({
        id: fastingRecipesTable.id,
        title: fastingRecipesTable.title,
        subtitle: fastingRecipesTable.subtitle,
        time: fastingRecipesTable.time,
        level: fastingRecipesTable.level,
        ingredients: fastingRecipesTable.ingredients,
        steps: fastingRecipesTable.steps,
      })
      .from(fastingRecipesTable)
      .where(
        and(
          inArray(fastingRecipesTable.level, recipeLevels),
          eq(fastingRecipesTable.locale, locale),
          eq(fastingRecipesTable.publicationStatus, "published"),
        ),
      )
      .orderBy(asc(fastingRecipesTable.id));
    return {
      date: requestedDate,
      canonicalDate,
      calendarType,
      locale,
      level: guidance.level,
      title: guidance.title,
      description: guidance.description,
      note: guidance.note,
      recipes,
    };
  });
}

export function listSaints(input: {
  locale: Locale;
  page: number;
  limit: number;
  search?: string;
}) {
  return queryDatabase(async (database) => {
    const filter = and(
      eq(saintsTable.locale, input.locale),
      eq(saintsTable.publicationStatus, "published"),
      input.search ? ilike(saintsTable.name, `%${input.search}%`) : undefined,
    );
    const [items, totals] = await Promise.all([
      database
        .select({
          id: saintsTable.id,
          name: saintsTable.name,
          shortBio: saintsTable.shortBio,
        })
        .from(saintsTable)
        .where(filter)
        .orderBy(asc(saintsTable.name))
        .limit(input.limit)
        .offset((input.page - 1) * input.limit),
      database.select({ total: count() }).from(saintsTable).where(filter),
    ]);
    const total = totals[0]?.total ?? 0;
    return {
      items,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        hasMore: input.page * input.limit < total,
      },
    };
  });
}

export function getSaint(id: string, locale: Locale) {
  return queryDatabase(async (database) => {
    const [saint] = await database
      .select()
      .from(saintsTable)
      .where(
        and(
          eq(saintsTable.id, id),
          eq(saintsTable.locale, locale),
          eq(saintsTable.publicationStatus, "published"),
        ),
      )
      .limit(1);
    if (!saint) return null;
    const feastDate =
      saint.feastMonth && saint.feastDay
        ? `${String(saint.feastMonth).padStart(2, "0")}-${String(saint.feastDay).padStart(2, "0")}`
        : null;
    return {
      ...saintSummary(saint),
      feastDate,
      audioText: saint.audioText,
    };
  });
}

export function listLearningEntries(input: {
  locale: Locale;
  page: number;
  limit: number;
  search?: string;
  category?: "audio" | "icon" | "dictionary";
}) {
  return queryDatabase(async (database) => {
    const searchFilter = input.search
      ? or(
          ilike(learningEntriesTable.title, `%${input.search}%`),
          ilike(learningEntriesTable.alternate, `%${input.search}%`),
          ilike(learningEntriesTable.definition, `%${input.search}%`),
        )
      : undefined;
    const filter = and(
      eq(learningEntriesTable.locale, input.locale),
      eq(learningEntriesTable.publicationStatus, "published"),
      input.category
        ? eq(learningEntriesTable.category, input.category)
        : undefined,
      searchFilter,
    );
    const [items, totals] = await Promise.all([
      database
        .select({
          id: learningEntriesTable.id,
          category: learningEntriesTable.category,
          title: learningEntriesTable.title,
          alternate: learningEntriesTable.alternate,
          pronunciation: learningEntriesTable.pronunciation,
          definition: learningEntriesTable.definition,
          body: learningEntriesTable.body,
        })
        .from(learningEntriesTable)
        .where(filter)
        .orderBy(asc(learningEntriesTable.title))
        .limit(input.limit)
        .offset((input.page - 1) * input.limit),
      database
        .select({ total: count() })
        .from(learningEntriesTable)
        .where(filter),
    ]);
    const total = totals[0]?.total ?? 0;
    return {
      items,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        hasMore: input.page * input.limit < total,
      },
    };
  });
}