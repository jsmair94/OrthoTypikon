import { boolean, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export * from "./content";

export const prayerRequestsTable = pgTable("prayer_requests", {
  id: text("id").primaryKey(),
  ownerSubject: text("owner_subject").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  visibility: text("visibility").notNull(),
  nameVisibility: text("name_visibility").notNull(),
  showCategory: boolean("show_category").notNull().default(true),
  showDuration: boolean("show_duration").notNull().default(true),
  durationDays: integer("duration_days").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const prayerReportsTable = pgTable("prayer_reports", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull(),
  reporterSubject: text("reporter_subject").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("prayer_reports_request_reporter_unique").on(table.requestId, table.reporterSubject),
]);

export type PrayerRequest = typeof prayerRequestsTable.$inferSelect;
