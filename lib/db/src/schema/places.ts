import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  check,
  doublePrecision,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";

export const orthodoxPlaceCategoryEnum = pgEnum("orthodox_place_category", [
  "church",
  "monastery",
  "school",
]);

export const orthodoxPlaceStatusEnum = pgEnum("orthodox_place_status", [
  "active",
  "retired",
]);

export const orthodoxPlaceReportStatusEnum = pgEnum("orthodox_place_report_status", [
  "open",
  "reviewed",
  "resolved",
]);

export const orthodoxPlacesTable = pgTable(
  "orthodox_places",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: orthodoxPlaceCategoryEnum("category").notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    address: text("address").notNull(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url"),
    verificationDetails: text("verification_details").notNull(),
    isVerified: boolean("is_verified").notNull().default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    status: orthodoxPlaceStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("orthodox_places_status_category_idx").on(table.status, table.category),
    check(
      "orthodox_places_latitude_valid",
      sql`${table.latitude} BETWEEN -90 AND 90`,
    ),
    check(
      "orthodox_places_longitude_valid",
      sql`${table.longitude} BETWEEN -180 AND 180`,
    ),
  ],
);

export const orthodoxPlaceReportsTable = pgTable(
  "orthodox_place_reports",
  {
    id: text("id").primaryKey(),
    placeId: text("place_id")
      .notNull()
      .references(() => orthodoxPlacesTable.id, { onDelete: "restrict" }),
    details: text("details").notNull(),
    status: orthodoxPlaceReportStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [
    index("orthodox_place_reports_status_created_idx").on(table.status, table.createdAt),
    index("orthodox_place_reports_place_idx").on(table.placeId),
  ],
);

export const insertOrthodoxPlaceSchema = createInsertSchema(orthodoxPlacesTable);
export const insertOrthodoxPlaceReportSchema = createInsertSchema(orthodoxPlaceReportsTable);

export type InsertOrthodoxPlace = z.infer<typeof insertOrthodoxPlaceSchema>;
export type InsertOrthodoxPlaceReport = z.infer<typeof insertOrthodoxPlaceReportSchema>;
export type OrthodoxPlace = typeof orthodoxPlacesTable.$inferSelect;
export type OrthodoxPlaceReport = typeof orthodoxPlaceReportsTable.$inferSelect;