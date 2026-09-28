import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";

export const localeEnum = pgEnum("content_locale", ["ar", "en", "fr"]);
export const calendarSystemEnum = pgEnum("calendar_system", ["gregorian", "julian"]);
export const publicationStatusEnum = pgEnum("publication_status", [
  "draft",
  "published",
  "archived",
]);
export const fastLevelEnum = pgEnum("fast_level", ["strict", "oil", "fish", "none"]);
export const learningCategoryEnum = pgEnum("learning_category", [
  "audio",
  "icon",
  "dictionary",
]);

const contentColumns = {
  locale: localeEnum("locale").notNull().default("ar"),
  publicationStatus: publicationStatusEnum("publication_status")
    .notNull()
    .default("published"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const dailyContentTable = pgTable(
  "daily_content",
  {
    id: text("id").primaryKey(),
    contentDate: date("content_date", { mode: "string" }).notNull(),
    calendarSystem: calendarSystemEnum("calendar_system").notNull().default("gregorian"),
    verseReference: text("verse_reference").notNull(),
    verseText: text("verse_text").notNull(),
    verseAuthor: text("verse_author").notNull(),
    feastTitle: text("feast_title"),
    feastDescription: text("feast_description"),
    readingTitle: text("reading_title"),
    readingReference: text("reading_reference"),
    readingDurationMinutes: integer("reading_duration_minutes"),
    ...contentColumns,
  },
  (table) => [
    uniqueIndex("daily_content_date_locale_unique").on(
      table.contentDate,
      table.calendarSystem,
      table.locale,
    ),
    index("daily_content_lookup_idx").on(
      table.contentDate,
      table.calendarSystem,
      table.locale,
      table.publicationStatus,
    ),
    check(
      "daily_content_reading_duration_positive",
      sql`${table.readingDurationMinutes} IS NULL OR ${table.readingDurationMinutes} > 0`,
    ),
  ],
);

export const calendarEntriesTable = pgTable(
  "calendar_entries",
  {
    id: text("id").primaryKey(),
    gregorianDate: date("gregorian_date", { mode: "string" }).notNull(),
    calendarSystem: calendarSystemEnum("calendar_system").notNull().default("gregorian"),
    feastTitle: text("feast_title"),
    fastingTitle: text("fasting_title"),
    liturgy: text("liturgy"),
    color: text("color"),
    ...contentColumns,
  },
  (table) => [
    uniqueIndex("calendar_entries_date_locale_unique").on(
      table.gregorianDate,
      table.calendarSystem,
      table.locale,
    ),
    index("calendar_entries_date_lookup_idx").on(
      table.gregorianDate,
      table.calendarSystem,
      table.locale,
      table.publicationStatus,
    ),
  ],
);

export const saintsTable = pgTable(
  "saints",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    feastMonth: integer("feast_month"),
    feastDay: integer("feast_day"),
    shortBio: text("short_bio").notNull(),
    audioText: text("audio_text").notNull(),
    ...contentColumns,
  },
  (table) => [
    uniqueIndex("saints_name_locale_unique").on(table.name, table.locale),
    index("saints_feast_date_lookup_idx").on(
      table.feastMonth,
      table.feastDay,
      table.locale,
      table.publicationStatus,
    ),
    index("saints_browse_idx").on(
      table.locale,
      table.publicationStatus,
      table.name,
    ),
    check(
      "saints_feast_month_valid",
      sql`${table.feastMonth} IS NULL OR (${table.feastMonth} BETWEEN 1 AND 12)`,
    ),
    check(
      "saints_feast_day_valid",
      sql`${table.feastDay} IS NULL OR (${table.feastDay} BETWEEN 1 AND 31)`,
    ),
  ],
);

export const calendarEntrySaintsTable = pgTable(
  "calendar_entry_saints",
  {
    calendarEntryId: text("calendar_entry_id")
      .notNull()
      .references(() => calendarEntriesTable.id, { onDelete: "cascade" }),
    saintId: text("saint_id")
      .notNull()
      .references(() => saintsTable.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.calendarEntryId, table.saintId] }),
    index("calendar_entry_saints_saint_idx").on(table.saintId),
  ],
);

export const fastingGuidanceTable = pgTable(
  "fasting_guidance",
  {
    id: text("id").primaryKey(),
    contentDate: date("content_date", { mode: "string" }).notNull(),
    calendarSystem: calendarSystemEnum("calendar_system").notNull().default("gregorian"),
    level: fastLevelEnum("level").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    note: text("note"),
    ...contentColumns,
  },
  (table) => [
    uniqueIndex("fasting_guidance_date_locale_unique").on(
      table.contentDate,
      table.calendarSystem,
      table.locale,
    ),
    index("fasting_guidance_lookup_idx").on(
      table.contentDate,
      table.calendarSystem,
      table.locale,
      table.publicationStatus,
    ),
  ],
);

export const fastingRecipesTable = pgTable(
  "fasting_recipes",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull(),
    time: text("time").notNull(),
    level: fastLevelEnum("level").notNull(),
    ingredients: text("ingredients").array().notNull(),
    steps: text("steps").array().notNull(),
    ...contentColumns,
  },
  (table) => [
    index("fasting_recipes_level_lookup_idx").on(
      table.level,
      table.locale,
      table.publicationStatus,
    ),
  ],
);

export const learningEntriesTable = pgTable(
  "learning_entries",
  {
    id: text("id").primaryKey(),
    category: learningCategoryEnum("category").notNull(),
    title: text("title").notNull(),
    alternate: text("alternate"),
    pronunciation: text("pronunciation"),
    definition: text("definition").notNull(),
    body: text("body"),
    ...contentColumns,
  },
  (table) => [
    uniqueIndex("learning_entries_title_locale_unique").on(table.title, table.locale),
    index("learning_entries_browse_idx").on(
      table.locale,
      table.publicationStatus,
      table.category,
      table.title,
    ),
  ],
);

export const insertDailyContentSchema = createInsertSchema(dailyContentTable);
export const insertCalendarEntrySchema = createInsertSchema(calendarEntriesTable);
export const insertSaintSchema = createInsertSchema(saintsTable);
export const insertCalendarEntrySaintSchema = createInsertSchema(calendarEntrySaintsTable);
export const insertFastingGuidanceSchema = createInsertSchema(fastingGuidanceTable);
export const insertFastingRecipeSchema = createInsertSchema(fastingRecipesTable);
export const insertLearningEntrySchema = createInsertSchema(learningEntriesTable);

export type InsertDailyContent = z.infer<typeof insertDailyContentSchema>;
export type InsertCalendarEntry = z.infer<typeof insertCalendarEntrySchema>;
export type InsertSaint = z.infer<typeof insertSaintSchema>;
export type InsertCalendarEntrySaint = z.infer<typeof insertCalendarEntrySaintSchema>;
export type InsertFastingGuidance = z.infer<typeof insertFastingGuidanceSchema>;
export type InsertFastingRecipe = z.infer<typeof insertFastingRecipeSchema>;
export type InsertLearningEntry = z.infer<typeof insertLearningEntrySchema>;

export type DailyContent = typeof dailyContentTable.$inferSelect;
export type CalendarEntry = typeof calendarEntriesTable.$inferSelect;
export type Saint = typeof saintsTable.$inferSelect;
export type FastingGuidance = typeof fastingGuidanceTable.$inferSelect;
export type FastingRecipe = typeof fastingRecipesTable.$inferSelect;
export type LearningEntry = typeof learningEntriesTable.$inferSelect;