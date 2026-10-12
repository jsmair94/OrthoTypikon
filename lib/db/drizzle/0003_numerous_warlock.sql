DO $$ BEGIN
  CREATE TYPE "public"."orthodox_place_category" AS ENUM('church', 'monastery', 'school');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."orthodox_place_report_status" AS ENUM('open', 'reviewed', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."orthodox_place_status" AS ENUM('active', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orthodox_place_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"details" text NOT NULL,
	"status" "orthodox_place_report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orthodox_places" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" "orthodox_place_category" NOT NULL,
	"jurisdiction" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"address" text NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text,
	"verification_details" text NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"status" "orthodox_place_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orthodox_places_latitude_valid" CHECK ("orthodox_places"."latitude" BETWEEN -90 AND 90),
	CONSTRAINT "orthodox_places_longitude_valid" CHECK ("orthodox_places"."longitude" BETWEEN -180 AND 180)
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "orthodox_place_reports" ADD CONSTRAINT "orthodox_place_reports_place_id_orthodox_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."orthodox_places"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orthodox_place_reports_status_created_idx" ON "orthodox_place_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orthodox_place_reports_place_idx" ON "orthodox_place_reports" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orthodox_places_status_category_idx" ON "orthodox_places" USING btree ("status","category");