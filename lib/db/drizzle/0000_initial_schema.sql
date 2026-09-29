DO $$ BEGIN
  CREATE TYPE "public"."calendar_system" AS ENUM('gregorian', 'julian');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."fast_level" AS ENUM('strict', 'oil', 'fish', 'none');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."learning_category" AS ENUM('audio', 'icon', 'dictionary');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."content_locale" AS ENUM('ar', 'en', 'fr');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."publication_status" AS ENUM('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prayer_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"reporter_subject" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prayer_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_subject" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"visibility" text NOT NULL,
	"name_visibility" text NOT NULL,
	"show_category" boolean DEFAULT true NOT NULL,
	"show_duration" boolean DEFAULT true NOT NULL,
	"duration_days" integer NOT NULL,
	"expires_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"gregorian_date" date NOT NULL,
	"calendar_system" "calendar_system" DEFAULT 'gregorian' NOT NULL,
	"feast_title" text,
	"fasting_title" text,
	"liturgy" text,
	"color" text,
	"locale" "content_locale" DEFAULT 'ar' NOT NULL,
	"publication_status" "publication_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_entry_saints" (
	"calendar_entry_id" text NOT NULL,
	"saint_id" text NOT NULL,
	CONSTRAINT "calendar_entry_saints_calendar_entry_id_saint_id_pk" PRIMARY KEY("calendar_entry_id","saint_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_content" (
	"id" text PRIMARY KEY NOT NULL,
	"content_date" date NOT NULL,
	"calendar_system" "calendar_system" DEFAULT 'gregorian' NOT NULL,
	"verse_reference" text NOT NULL,
	"verse_text" text NOT NULL,
	"verse_author" text NOT NULL,
	"feast_title" text,
	"feast_description" text,
	"reading_title" text,
	"reading_reference" text,
	"reading_duration_minutes" integer,
	"locale" "content_locale" DEFAULT 'ar' NOT NULL,
	"publication_status" "publication_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_content_reading_duration_positive" CHECK ("daily_content"."reading_duration_minutes" IS NULL OR "daily_content"."reading_duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fasting_guidance" (
	"id" text PRIMARY KEY NOT NULL,
	"content_date" date NOT NULL,
	"calendar_system" "calendar_system" DEFAULT 'gregorian' NOT NULL,
	"level" "fast_level" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"note" text,
	"locale" "content_locale" DEFAULT 'ar' NOT NULL,
	"publication_status" "publication_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fasting_recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subtitle" text NOT NULL,
	"time" text NOT NULL,
	"level" "fast_level" NOT NULL,
	"ingredients" text[] NOT NULL,
	"steps" text[] NOT NULL,
	"locale" "content_locale" DEFAULT 'ar' NOT NULL,
	"publication_status" "publication_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"category" "learning_category" NOT NULL,
	"title" text NOT NULL,
	"alternate" text,
	"pronunciation" text,
	"definition" text NOT NULL,
	"body" text,
	"locale" "content_locale" DEFAULT 'ar' NOT NULL,
	"publication_status" "publication_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saints" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"feast_month" integer,
	"feast_day" integer,
	"short_bio" text NOT NULL,
	"audio_text" text NOT NULL,
	"locale" "content_locale" DEFAULT 'ar' NOT NULL,
	"publication_status" "publication_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saints_feast_month_valid" CHECK ("saints"."feast_month" IS NULL OR ("saints"."feast_month" BETWEEN 1 AND 12)),
	CONSTRAINT "saints_feast_day_valid" CHECK ("saints"."feast_day" IS NULL OR ("saints"."feast_day" BETWEEN 1 AND 31))
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'calendar_entry_saints_calendar_entry_id_calendar_entries_id_fk'
      AND conrelid = 'public.calendar_entry_saints'::regclass
  ) THEN
    ALTER TABLE "calendar_entry_saints"
      ADD CONSTRAINT "calendar_entry_saints_calendar_entry_id_calendar_entries_id_fk"
      FOREIGN KEY ("calendar_entry_id") REFERENCES "public"."calendar_entries"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'calendar_entry_saints_saint_id_saints_id_fk'
      AND conrelid = 'public.calendar_entry_saints'::regclass
  ) THEN
    ALTER TABLE "calendar_entry_saints"
      ADD CONSTRAINT "calendar_entry_saints_saint_id_saints_id_fk"
      FOREIGN KEY ("saint_id") REFERENCES "public"."saints"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "prayer_reports_request_reporter_unique" ON "prayer_reports" USING btree ("request_id","reporter_subject");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_entries_date_locale_unique" ON "calendar_entries" USING btree ("gregorian_date","calendar_system","locale");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_entries_date_lookup_idx" ON "calendar_entries" USING btree ("gregorian_date","calendar_system","locale","publication_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_entry_saints_saint_idx" ON "calendar_entry_saints" USING btree ("saint_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "daily_content_date_locale_unique" ON "daily_content" USING btree ("content_date","calendar_system","locale");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_content_lookup_idx" ON "daily_content" USING btree ("content_date","calendar_system","locale","publication_status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fasting_guidance_date_locale_unique" ON "fasting_guidance" USING btree ("content_date","calendar_system","locale");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fasting_guidance_lookup_idx" ON "fasting_guidance" USING btree ("content_date","calendar_system","locale","publication_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fasting_recipes_level_lookup_idx" ON "fasting_recipes" USING btree ("level","locale","publication_status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learning_entries_title_locale_unique" ON "learning_entries" USING btree ("title","locale");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_entries_browse_idx" ON "learning_entries" USING btree ("locale","publication_status","category","title");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "saints_name_locale_unique" ON "saints" USING btree ("name","locale");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saints_feast_date_lookup_idx" ON "saints" USING btree ("feast_month","feast_day","locale","publication_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saints_browse_idx" ON "saints" USING btree ("locale","publication_status","name");