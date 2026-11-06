import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export * from "./content";
export * from "./places";

export const managedContentTable = pgTable("managed_content", {
  key: text("key").primaryKey(),
  content: jsonb("content").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
