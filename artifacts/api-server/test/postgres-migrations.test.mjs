import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { sql } from "drizzle-orm";
import { boolean, index, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import * as databaseSchema from "../../../lib/db/src/schema/index.ts";

const apiDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const workspaceRoot = path.resolve(apiDirectory, "../..");
const databaseDirectory = path.join(workspaceRoot, "lib/db");
const migrationJournal = JSON.parse(
  readFileSync(
    path.join(databaseDirectory, "drizzle/meta/_journal.json"),
    "utf8",
  ),
);
const migrationTimestamps = migrationJournal.entries.map((entry) => entry.when);

const expressionIndexProbe = pgTable(
  "expression_index_probe",
  {
    id: text("id").primaryKey(),
    details: text("details").notNull(),
    isActive: boolean("is_active").notNull(),
  },
  (table) => [
    index("expression_index_probe_lower_details_idx").on(
      sql`lower(${table.details})`,
    ),
    index("expression_index_probe_active_details_idx")
      .on(table.details)
      .where(sql`${table.isActive} = true`),
  ],
);

const customIndexOptionsProbe = pgTable(
  "custom_index_options_probe",
  {
    id: text("id").notNull(),
    details: text("details").notNull(),
  },
  (table) => [
    index("custom_index_options_probe_idx").on(
      table.details.desc().nullsFirst().op("text_pattern_ops"),
      table.id.asc().nullsFirst(),
    ).with({ fillfactor: 70 }),
  ],
);

const missingCustomTypeEnum = pgEnum("missing_custom_type_probe_enum", [
  "first",
  "second",
]);
const missingCustomTypeProbe = pgTable(
  "missing_custom_type_probe_table",
  {
    id: text("id").primaryKey(),
    status: missingCustomTypeEnum("status").notNull(),
  },
  (table) => [index("missing_custom_type_probe_idx").on(table.status)],
);

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout.trim();
}

function postgresEnvironment() {
  const environment = { ...process.env };
  for (const name of [
    "DATABASE_URL",
    "PGHOST",
    "PGHOSTADDR",
    "PGPORT",
    "PGUSER",
    "PGDATABASE",
    "PGPASSWORD",
    "PGSSLMODE",
    "PGOPTIONS",
  ]) {
    delete environment[name];
  }
  return environment;
}

async function availablePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

function psql(port, database, sql) {
  return runCommand(
    "psql",
    [
      "-h",
      "127.0.0.1",
      "-p",
      String(port),
      "-U",
      "postgres",
      "-d",
      database,
      "-v",
      "ON_ERROR_STOP=1",
      "-A",
      "-t",
      "-c",
      sql,
    ],
    { env: postgresEnvironment() },
  );
}

function createDatabase(port, database) {
  runCommand(
    "createdb",
    ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", database],
    { env: postgresEnvironment() },
  );
}

async function startApi(
  databaseUrl,
  distDirectory = path.join(apiDirectory, "dist"),
  requestedPort,
) {
  const port = requestedPort ?? (await availablePort());
  const child = spawn(
    process.execPath,
    ["--enable-source-maps", path.join(distDirectory, "index.mjs")],
    {
      cwd: path.dirname(distDirectory),
      env: {
        ...postgresEnvironment(),
        DATABASE_URL: databaseUrl,
        NODE_ENV: "production",
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => {
    output = (output + chunk).slice(-20_000);
  });
  child.stderr.setEncoding("utf8").on("data", (chunk) => {
    output = (output + chunk).slice(-20_000);
  });

  try {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        throw new Error(`API exited before startup completed:\n${output}`);
      }
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/healthz`, {
          signal: AbortSignal.timeout(500),
        });
        if (response.status === 200) {
          return child;
        }
      } catch {
        // The server is still starting or has not opened its port yet.
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(
      `API did not become healthy after its database migration:\n${output}`,
    );
  } catch (error) {
    await stopApi(child);
    throw error;
  }
}

async function stopApi(child) {
  if (child.exitCode === null && child.signalCode === null) {
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    await exited;
  }
}

function assertMigrationRecorded(
  port,
  database,
  expectedTimestamps = migrationTimestamps,
) {
  assert.ok(
    expectedTimestamps.length > 0,
    "the migration journal should contain migrations",
  );
  const applied = psql(
    port,
    database,
    `SELECT count(*) || ':' || count(*) FILTER (WHERE created_at = ANY(ARRAY[${expectedTimestamps.join(",")}]::bigint[]) AND length(hash) = 64) FROM drizzle.__drizzle_migrations`,
  );
  assert.equal(
    applied,
    `${expectedTimestamps.length}:${expectedTimestamps.length}`,
    "every migration version should be recorded exactly once",
  );
}

test("real PostgreSQL migrations preserve rows in fresh and pre-existing databases", async () => {
  const requiredBinaries = ["initdb", "pg_ctl", "createdb", "psql"];
  const missingBinaries = requiredBinaries.filter(
    (binary) => spawnSync(binary, ["--version"], { stdio: "ignore" }).error,
  );
  assert.deepEqual(
    missingBinaries,
    [],
    "PostgreSQL client and server binaries are required for this integration test",
  );
  const migrationYear = new Date().getUTCFullYear();
  const expectedMigrationCoverage =
    (Date.UTC(migrationYear + 1, 0, 1) -
      Date.UTC(migrationYear, 0, 1)) /
      (24 * 60 * 60 * 1000) +
    14;
  const migrationEndDate = `${migrationYear + 1}-01-14`;
  const preservedDailyDate = `${migrationYear}-12-30`;

  const temporaryDirectory = mkdtempSync(
    path.join(os.tmpdir(), "orthotypikon-pg-"),
  );
  const dataDirectory = path.join(temporaryDirectory, "data");
  const port = await availablePort();
  const environment = postgresEnvironment();

  try {
    runCommand(
      "initdb",
      [
        "-D",
        dataDirectory,
        "--auth=trust",
        "--username=postgres",
        "--no-locale",
        "-E",
        "UTF8",
      ],
      { env: environment },
    );
    runCommand(
      "pg_ctl",
      [
        "-D",
        dataDirectory,
        "-l",
        path.join(temporaryDirectory, "postgres.log"),
        "-o",
        `-F -p ${port} -h 127.0.0.1 -k ${temporaryDirectory}`,
        "-w",
        "start",
      ],
      { env: environment },
    );

    try {
      createDatabase(port, "fresh_upgrade");
      const freshDatabaseUrl = `postgres://postgres@127.0.0.1:${port}/fresh_upgrade`;
      const freshApiResults = await Promise.allSettled([
        startApi(freshDatabaseUrl),
        startApi(freshDatabaseUrl),
      ]);
      const freshApis = freshApiResults
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      try {
        const failedStartup = freshApiResults.find(
          (result) => result.status === "rejected",
        );
        if (failedStartup?.status === "rejected") throw failedStartup.reason;
        assertMigrationRecorded(port, "fresh_upgrade");
        assert.equal(
          psql(
            port,
            "fresh_upgrade",
            `SELECT count(*) FROM daily_content
             WHERE content_date >= '${migrationYear}-01-01'
               AND content_date <= '${migrationEndDate}'
               AND calendar_system = 'gregorian' AND locale = 'ar'`,
          ),
          String(expectedMigrationCoverage),
          "the startup data migration should add current-year daily defaults and the Julian year-end buffer",
        );
        assert.equal(
          psql(
            port,
            "fresh_upgrade",
            `SELECT verse_reference || ':' || reading_title || ':' || reading_reference || ':' || reading_duration_minutes || ':' || publication_status
             FROM daily_content
             WHERE content_date = '${migrationYear}-01-01'
               AND calendar_system = 'gregorian' AND locale = 'ar'`,
          ),
          "يوحنا ١٤:٢٧:إنجيل متى:الإصحاح الخامس:8:published",
          "the startup data migration should use the generic published defaults",
        );
      } finally {
        await Promise.all(freshApis.map(stopApi));
      }

      createDatabase(port, "existing_upgrade");
      const databaseUrl = `postgres://postgres@127.0.0.1:${port}/existing_upgrade`;

      // Build a complete repaired schema from the Drizzle model without creating migration history.
      runCommand(
        path.join(databaseDirectory, "node_modules/.bin/drizzle-kit"),
        ["push", "--config", "./drizzle.config.ts", "--force"],
        {
          cwd: databaseDirectory,
          env: { ...environment, DATABASE_URL: databaseUrl },
        },
      );
      assert.equal(
        psql(
          port,
          "existing_upgrade",
          "SELECT to_regclass('drizzle.__drizzle_migrations') IS NULL",
        ),
        "t",
        "the repaired-schema fixture must not have migration history before API startup",
      );

      psql(
        port,
        "existing_upgrade",
        `ALTER TABLE calendar_entry_saints
           DROP CONSTRAINT calendar_entry_saints_calendar_entry_id_saint_id_pk;
         ALTER TABLE calendar_entry_saints
           ADD CONSTRAINT calendar_entry_saints_pkey
           PRIMARY KEY (calendar_entry_id, saint_id);
         ALTER TABLE calendar_entry_saints
           DROP CONSTRAINT calendar_entry_saints_calendar_entry_id_calendar_entries_id_fk;
         ALTER TABLE calendar_entry_saints
           DROP CONSTRAINT calendar_entry_saints_saint_id_saints_id_fk;
         ALTER TABLE calendar_entry_saints
           ADD CONSTRAINT calendar_entry_saints_calendar_entry_id_fkey
           FOREIGN KEY (calendar_entry_id) REFERENCES calendar_entries (id)
           ON DELETE CASCADE ON UPDATE NO ACTION;
         ALTER TABLE calendar_entry_saints
           ADD CONSTRAINT calendar_entry_saints_saint_id_fkey
           FOREIGN KEY (saint_id) REFERENCES saints (id)
           ON DELETE CASCADE ON UPDATE NO ACTION;`,
      );

      psql(
        port,
        "existing_upgrade",
        `INSERT INTO saints (id, name, feast_month, feast_day, short_bio, audio_text, locale)
         VALUES ('fixture-saint', 'Saint Fixture', 2, 17, 'Existing saint bio must survive.', 'Existing audio text must survive.', 'en');
         INSERT INTO calendar_entries (
           id, gregorian_date, calendar_system, locale, publication_status
         ) VALUES (
           'fixture-calendar-entry-saint', '2026-09-29', 'gregorian', 'en', 'published'
         );
         INSERT INTO calendar_entry_saints (calendar_entry_id, saint_id)
         VALUES ('fixture-calendar-entry-saint', 'fixture-saint');
         INSERT INTO daily_content (id, content_date, verse_reference, verse_text, verse_author, locale)
         VALUES ('fixture-daily-content', '2026-09-29', 'John 1:1', 'Existing verse must survive.', 'Saint John', 'en');
         INSERT INTO daily_content (
           id, content_date, calendar_system, verse_reference, verse_text,
           verse_author, locale, publication_status
         ) VALUES (
           'fixture-daily-content-ar', '${preservedDailyDate}', 'gregorian',
           'Psalm 23:1', 'Existing reviewed verse must survive.', 'Editor', 'ar', 'draft'
         );`,
      );

      const existingApi = await startApi(databaseUrl);
      try {
        assertMigrationRecorded(port, "existing_upgrade");
        assert.equal(
          psql(
            port,
            "existing_upgrade",
            `SELECT string_agg(conname::text, ',' ORDER BY conname)
             FROM pg_constraint
             WHERE conrelid = 'public.calendar_entry_saints'::regclass
               AND contype IN ('p', 'f')`,
          ),
          "calendar_entry_saints_calendar_entry_id_calendar_entries_id_fk,calendar_entry_saints_calendar_entry_id_saint_id_pk,calendar_entry_saints_saint_id_saints_id_fk",
          "startup should normalize the legacy primary-key and foreign-key names",
        );
        assert.equal(
          psql(
            port,
            "existing_upgrade",
            `SELECT count(*)
             FROM calendar_entry_saints
             WHERE calendar_entry_id = 'fixture-calendar-entry-saint'
               AND saint_id = 'fixture-saint'`,
          ),
          "1",
          "normalizing constraints must preserve existing calendar-to-saint links",
        );
        assert.equal(
          psql(
            port,
            "existing_upgrade",
            `SELECT id || ':' || publication_status || ':' || verse_text
             FROM daily_content
             WHERE content_date = '${preservedDailyDate}'
               AND calendar_system = 'gregorian' AND locale = 'ar'`,
          ),
          "fixture-daily-content-ar:draft:Existing reviewed verse must survive.",
          "the startup data migration must leave existing editorial content and publication state unchanged",
        );
      } finally {
        await stopApi(existingApi);
      }
      const primaryKeyIndexOwnershipQuery = `SELECT constraint_data.conname || ':' || index_relation.relname
        FROM pg_constraint constraint_data
        JOIN pg_class index_relation ON index_relation.oid = constraint_data.conindid
        WHERE constraint_data.conrelid = 'public.saints'::regclass
          AND constraint_data.contype = 'p'`;
      const primaryKeyIndexOwnershipBefore = psql(
        port,
        "existing_upgrade",
        primaryKeyIndexOwnershipQuery,
      );
      assert.equal(
        primaryKeyIndexOwnershipBefore,
        "saints_pkey:saints_pkey",
        "the recovery fixture must use a constraint-owned primary-key index",
      );
      psql(
        port,
        "existing_upgrade",
        "REINDEX INDEX CONCURRENTLY public.saints_pkey",
      );
      assert.equal(
        psql(
          port,
          "existing_upgrade",
          primaryKeyIndexOwnershipQuery,
        ),
        primaryKeyIndexOwnershipBefore,
        "concurrent reindexing must preserve primary-key constraint ownership",
      );
      assert.equal(
        psql(
          port,
          "existing_upgrade",
          `SELECT count(*) FROM saints
           WHERE id = 'fixture-saint' AND short_bio = 'Existing saint bio must survive.'`,
        ),
        "1",
        "constraint-owned index recovery must preserve table rows",
      );

      psql(
        port,
        "existing_upgrade",
        `CREATE TABLE expression_index_probe (
           id text PRIMARY KEY,
           details text NOT NULL,
           is_active boolean NOT NULL
         );
         CREATE INDEX expression_index_probe_lower_details_idx
           ON expression_index_probe ((lower(details)));
         CREATE INDEX expression_index_probe_active_details_idx
            ON expression_index_probe (details) WHERE is_active = true;
         CREATE TABLE custom_index_options_probe (
           id text NOT NULL,
           details text NOT NULL
         );
         CREATE INDEX custom_index_options_probe_idx
           ON custom_index_options_probe (
             details text_pattern_ops DESC NULLS FIRST,
             id ASC NULLS FIRST
            ) WITH (fillfactor=70);`,
      );

      const schemaDiscoveryProbe = pgTable(
        "schema_discovery_probe",
        {
          id: text("id").primaryKey(),
          details: text("details").notNull(),
        },
        (table) => [
          index("schema_discovery_probe_details_idx").on(table.details),
        ],
      );
      const previousDatabaseUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = databaseUrl;
      let databasePool;
      let validationClient;
      let schemaDiscoveryError;
      let matchingIndexError;
      let alteredIndexOrderError;
      let alteredNullOrderingError;
      let alteredOperatorClassError;
      let alteredIndexStorageParametersError;
      let alteredIndexUniquenessError;
      let alteredIndexMethodError;
      let alteredExpressionError;
      let alteredPredicateError;
      let missingExpressionError;
      let missingCustomTypeError;
      try {
        const { pool } = await import("../../../lib/db/src/client.ts");
        const { validateDatabaseSchema } =
          await import("../../../lib/db/src/migrate.ts");
        assert.ok(pool, "the schema validation fixture needs a database pool");
        databasePool = pool;
        validationClient = await pool.connect();
        const schemaWithIndexProbes = {
          ...databaseSchema,
          expressionIndexProbe,
          customIndexOptionsProbe,
        };
        try {
          await validateDatabaseSchema(
            validationClient,
            schemaWithIndexProbes,
          );
        } catch (error) {
          matchingIndexError = error;
        }

        psql(
          port,
          "existing_upgrade",
          `DROP INDEX custom_index_options_probe_idx;
           CREATE INDEX custom_index_options_probe_idx
             ON custom_index_options_probe (
               details text_pattern_ops DESC NULLS FIRST,
               id ASC NULLS FIRST
             ) WITH (fillfactor=80);`,
        );
        try {
          await validateDatabaseSchema(validationClient, schemaWithIndexProbes);
        } catch (error) {
          alteredIndexStorageParametersError = error;
        }

        psql(
          port,
          "existing_upgrade",
          `DROP INDEX custom_index_options_probe_idx;
           CREATE INDEX custom_index_options_probe_idx
             ON custom_index_options_probe (
               details text_pattern_ops DESC NULLS FIRST,
               id ASC NULLS FIRST
             ) WITH (fillfactor=70);`,
        );

        psql(
          port,
          "existing_upgrade",
          `DROP INDEX custom_index_options_probe_idx;
           CREATE INDEX custom_index_options_probe_idx
             ON custom_index_options_probe (
               details text_pattern_ops ASC NULLS FIRST,
               id ASC NULLS FIRST
             );`,
        );
        try {
          await validateDatabaseSchema(validationClient, schemaWithIndexProbes);
        } catch (error) {
          alteredIndexOrderError = error;
        }

        psql(
          port,
          "existing_upgrade",
          `DROP INDEX custom_index_options_probe_idx;
           CREATE INDEX custom_index_options_probe_idx
             ON custom_index_options_probe (
               details text_pattern_ops DESC NULLS LAST,
               id ASC NULLS FIRST
             );`,
        );
        try {
          await validateDatabaseSchema(validationClient, schemaWithIndexProbes);
        } catch (error) {
          alteredNullOrderingError = error;
        }

        psql(
          port,
          "existing_upgrade",
          `DROP INDEX custom_index_options_probe_idx;
           CREATE INDEX custom_index_options_probe_idx
             ON custom_index_options_probe (
               details text_ops DESC NULLS FIRST,
               id ASC NULLS FIRST
             );`,
        );
        try {
          await validateDatabaseSchema(validationClient, schemaWithIndexProbes);
        } catch (error) {
          alteredOperatorClassError = error;
        }

        psql(
          port,
          "existing_upgrade",
          `DROP INDEX custom_index_options_probe_idx;
           CREATE INDEX custom_index_options_probe_idx
             ON custom_index_options_probe (
               details text_pattern_ops DESC NULLS FIRST,
               id ASC NULLS FIRST
             ) WITH (fillfactor=70);`,
        );

        psql(
          port,
          "existing_upgrade",
          `DROP INDEX saints_name_locale_unique;
           CREATE INDEX saints_name_locale_unique ON saints (name, locale);`,
        );
        try {
          await validateDatabaseSchema(validationClient, schemaWithIndexProbes);
        } catch (error) {
          alteredIndexUniquenessError = error;
        }
        psql(
          port,
          "existing_upgrade",
          `DROP INDEX saints_name_locale_unique;
           CREATE UNIQUE INDEX saints_name_locale_unique ON saints (name, locale);`,
        );

        psql(
          port,
          "existing_upgrade",
          `DROP INDEX expression_index_probe_active_details_idx;
           CREATE INDEX expression_index_probe_active_details_idx
             ON expression_index_probe USING hash (details) WHERE is_active = true;`,
        );
        try {
          await validateDatabaseSchema(validationClient, schemaWithIndexProbes);
        } catch (error) {
          alteredIndexMethodError = error;
        }
        psql(
          port,
          "existing_upgrade",
          `DROP INDEX expression_index_probe_active_details_idx;
           CREATE INDEX expression_index_probe_active_details_idx
             ON expression_index_probe (details) WHERE is_active = true;`,
        );

        psql(
          port,
          "existing_upgrade",
          `DROP INDEX expression_index_probe_lower_details_idx;
           CREATE INDEX expression_index_probe_lower_details_idx
             ON expression_index_probe ((upper(details)));`,
        );
        try {
          await validateDatabaseSchema(
            validationClient,
            schemaWithIndexProbes,
          );
        } catch (error) {
          alteredExpressionError = error;
        }

        psql(
          port,
          "existing_upgrade",
          `DROP INDEX expression_index_probe_lower_details_idx;
           CREATE INDEX expression_index_probe_lower_details_idx
             ON expression_index_probe ((lower(details)));
           DROP INDEX expression_index_probe_active_details_idx;
           CREATE INDEX expression_index_probe_active_details_idx
             ON expression_index_probe (details) WHERE is_active = false;`,
        );
        try {
          await validateDatabaseSchema(
            validationClient,
            schemaWithIndexProbes,
          );
        } catch (error) {
          alteredPredicateError = error;
        }

        psql(
          port,
          "existing_upgrade",
          `DROP INDEX expression_index_probe_active_details_idx;
           CREATE INDEX expression_index_probe_active_details_idx
             ON expression_index_probe (details) WHERE is_active = true;
           DROP INDEX expression_index_probe_lower_details_idx;`,
        );
        try {
          await validateDatabaseSchema(
            validationClient,
            schemaWithIndexProbes,
          );
        } catch (error) {
          missingExpressionError = error;
        }

        try {
          await validateDatabaseSchema(validationClient, {
            ...databaseSchema,
            schemaDiscoveryProbe,
          });
        } catch (error) {
          schemaDiscoveryError = error;
        }
        try {
          await validateDatabaseSchema(validationClient, {
            ...schemaWithIndexProbes,
            missingCustomTypeProbe,
          });
        } catch (error) {
          missingCustomTypeError = error;
        }
      } catch (error) {
        schemaDiscoveryError ??= error;
      } finally {
        validationClient?.release();
        await databasePool?.end();
        if (previousDatabaseUrl === undefined) {
          delete process.env.DATABASE_URL;
        } else {
          process.env.DATABASE_URL = previousDatabaseUrl;
        }
      }
      assert.equal(
        matchingIndexError,
        undefined,
        `matching expression, partial, and custom-option indexes should pass validation; got:\n${matchingIndexError}`,
      );
      for (const [error, scenario, expectedObject] of [
        [
          alteredIndexOrderError,
          "an altered index sort direction",
          "index public.custom_index_options_probe_idx on public.custom_index_options_probe",
        ],
        [
          alteredNullOrderingError,
          "altered index null ordering",
          "index public.custom_index_options_probe_idx on public.custom_index_options_probe",
        ],
        [
          alteredOperatorClassError,
          "an altered index operator class",
          "index public.custom_index_options_probe_idx on public.custom_index_options_probe",
        ],
        [
          alteredIndexStorageParametersError,
          "an altered index storage parameter",
          "index public.custom_index_options_probe_idx on public.custom_index_options_probe",
        ],
        [
          alteredIndexUniquenessError,
          "an altered index uniqueness setting",
          "index public.saints_name_locale_unique on public.saints",
        ],
        [
          alteredIndexMethodError,
          "an altered index search method",
          "index public.expression_index_probe_active_details_idx on public.expression_index_probe",
        ],
      ]) {
        assert.ok(error, `${scenario} must fail schema validation`);
        assert.ok(
          error.message.includes(expectedObject),
          `schema validation should report ${scenario}; got:\n${error.message}`,
        );
      }
      for (const [error, scenario] of [
        [alteredExpressionError, "an altered expression index"],
        [alteredPredicateError, "an altered partial-index predicate"],
        [missingExpressionError, "a missing expression index"],
      ]) {
        assert.ok(error, `${scenario} must fail schema validation`);
        assert.ok(
          error.message.includes("index public.expression_index_probe_"),
          `schema validation should report the mismatched index; got:\n${error.message}`,
        );
      }
      assert.ok(
        schemaDiscoveryError,
        "a newly exported Drizzle table must be checked during schema validation",
      );
      for (const object of [
        "table public.schema_discovery_probe",
        "column public.schema_discovery_probe.details",
        "index public.schema_discovery_probe_details_idx on public.schema_discovery_probe",
        "constraint public.schema_discovery_probe.schema_discovery_probe_pkey",
      ]) {
        assert.ok(
          schemaDiscoveryError.message.includes(object),
          `schema validation should report ${object}; got:\n${schemaDiscoveryError.message}`,
        );
      }
      assert.ok(
        missingCustomTypeError,
        "a missing custom type used by an expected index must fail schema validation",
      );
      assert.ok(
        missingCustomTypeError.message.includes(
          "enum type public.missing_custom_type_probe_enum",
        ),
        `schema validation should report the missing custom type; got:\n${missingCustomTypeError.message}`,
      );
      assert.ok(
        !/type .*missing_custom_type_probe_enum.* does not exist/i.test(
          missingCustomTypeError.message,
        ),
        `schema validation must not hide the missing type behind an index normalization error; got:\n${missingCustomTypeError.message}`,
      );

      assert.equal(
        psql(
          port,
          "existing_upgrade",
          `SELECT count(*) FROM saints
           WHERE id = 'fixture-saint' AND name = 'Saint Fixture'
             AND short_bio = 'Existing saint bio must survive.'
             AND audio_text = 'Existing audio text must survive.' AND locale = 'en'`,
        ),
        "1",
        "the existing saint row and its data should remain unchanged",
      );
      assert.equal(
        psql(
          port,
          "existing_upgrade",
          `SELECT count(*) FROM daily_content
           WHERE id = 'fixture-daily-content' AND content_date = '2026-09-29'
             AND verse_reference = 'John 1:1'
             AND verse_text = 'Existing verse must survive.' AND verse_author = 'Saint John'`,
        ),
        "1",
        "the existing daily content row and its data should remain unchanged",
      );

      psql(
        port,
        "existing_upgrade",
        `ALTER TABLE saints DROP CONSTRAINT saints_feast_day_valid;
         ALTER TABLE saints ADD CONSTRAINT saints_feast_day_valid
           CHECK (feast_day IS NULL OR (feast_day BETWEEN 1 AND 32));`,
      );
      let alteredCheckError;
      try {
        await startApi(databaseUrl);
      } catch (error) {
        alteredCheckError = error;
      }
      assert.ok(
        alteredCheckError,
        "an altered same-name check constraint must prevent API startup",
      );
      assert.ok(
        alteredCheckError.message.includes(
          "constraint public.saints.saints_feast_day_valid",
        ),
        `schema validation should report the altered check constraint; got:\n${alteredCheckError.message}`,
      );
      assert.equal(
        psql(
          port,
          "existing_upgrade",
          `SELECT count(*) FROM saints
           WHERE id = 'fixture-saint' AND feast_month = 2 AND feast_day = 17
             AND short_bio = 'Existing saint bio must survive.'
             AND audio_text = 'Existing audio text must survive.'`,
        ),
        "1",
        "schema validation must not modify existing rows when a check expression differs",
      );
      assert.equal(
        psql(
          port,
          "existing_upgrade",
          `SELECT pg_get_expr(conbin, conrelid) FROM pg_constraint
           WHERE conname = 'saints_feast_day_valid'`,
        ),
        "((feast_day IS NULL) OR ((feast_day >= 1) AND (feast_day <= 32)))",
        "schema validation must not repair a same-name altered check",
      );

      psql(
        port,
        "existing_upgrade",
        `ALTER TABLE saints DROP CONSTRAINT saints_feast_day_valid;
         ALTER TABLE saints ADD CONSTRAINT saints_feast_day_valid
           CHECK (feast_day IS NULL OR (feast_day BETWEEN 1 AND 31));`,
      );
      assert.equal(
        psql(
          port,
          "existing_upgrade",
          `SELECT pg_get_expr(conbin, conrelid) FROM pg_constraint
           WHERE conname = 'saints_feast_day_valid'`,
        ),
        "((feast_day IS NULL) OR ((feast_day >= 1) AND (feast_day <= 31)))",
        "the repaired check expression should match the expected feast-day rule",
      );
      const repairedConstraintApi = await startApi(databaseUrl);
      try {
        assertMigrationRecorded(port, "existing_upgrade");
      } finally {
        await stopApi(repairedConstraintApi);
      }

      psql(
        port,
        "existing_upgrade",
        `ALTER TABLE daily_content
         ADD CONSTRAINT daily_content_reject_english_fixture
         CHECK (locale <> 'en') NOT VALID`,
      );
      let unexpectedConstraintError;
      try {
        await startApi(databaseUrl);
      } catch (error) {
        unexpectedConstraintError = error;
      }
      assert.ok(
        unexpectedConstraintError,
        "an extra database constraint that rejects valid content must prevent API startup",
      );
      assert.ok(
        unexpectedConstraintError.message.includes(
          "unexpected constraint public.daily_content.daily_content_reject_english_fixture",
        ),
        `schema validation should report the extra constraint; got:\n${unexpectedConstraintError.message}`,
      );
      assert.equal(
        psql(
          port,
          "existing_upgrade",
          `SELECT count(*) FROM daily_content
           WHERE id = 'fixture-daily-content' AND locale = 'en'
             AND verse_text = 'Existing verse must survive.'`,
        ),
        "1",
        "schema validation must preserve rows that violate an unexpected constraint",
      );

      psql(
        port,
        "existing_upgrade",
        `ALTER TABLE saints DROP CONSTRAINT saints_feast_day_valid;
         INSERT INTO saints (id, name, feast_month, feast_day, short_bio, audio_text, locale)
         VALUES ('unvalidated-check-saint', 'Unvalidated Check Saint', 5, 32, 'The existing row violates its rule.', 'Its audio must be preserved.', 'en');
         ALTER TABLE saints ADD CONSTRAINT saints_feast_day_valid
           CHECK (feast_day IS NULL OR (feast_day BETWEEN 1 AND 31)) NOT VALID`,
      );
      let unvalidatedConstraintError;
      try {
        await startApi(databaseUrl);
      } catch (error) {
        unvalidatedConstraintError = error;
      }
      assert.ok(
        unvalidatedConstraintError,
        "an unvalidated constraint with existing violating rows must prevent API startup",
      );
      assert.ok(
        unvalidatedConstraintError.message.includes(
          "constraint public.saints.saints_feast_day_valid",
        ),
        `schema validation should report the unvalidated constraint; got:\n${unvalidatedConstraintError.message}`,
      );
      assert.equal(
        psql(
          port,
          "existing_upgrade",
          `SELECT count(*) FROM pg_constraint
           WHERE conname = 'saints_feast_day_valid' AND NOT convalidated`,
        ),
        "1",
        "schema validation must not validate or replace an unvalidated constraint",
      );
      assert.equal(
        psql(
          port,
          "existing_upgrade",
          `SELECT count(*) FROM saints
           WHERE id = 'unvalidated-check-saint' AND feast_day = 32
             AND short_bio = 'The existing row violates its rule.'`,
        ),
        "1",
        "schema validation must preserve existing rows that violate a database rule",
      );

      createDatabase(port, "unexpected_enum_label");
      const unexpectedEnumLabelUrl = `postgres://postgres@127.0.0.1:${port}/unexpected_enum_label`;
      runCommand(
        path.join(databaseDirectory, "node_modules/.bin/drizzle-kit"),
        ["push", "--config", "./drizzle.config.ts", "--force"],
        {
          cwd: databaseDirectory,
          env: { ...environment, DATABASE_URL: unexpectedEnumLabelUrl },
        },
      );
      const initialEnumApi = await startApi(unexpectedEnumLabelUrl);
      try {
        assertMigrationRecorded(port, "unexpected_enum_label");
      } finally {
        await stopApi(initialEnumApi);
      }
      psql(
        port,
        "unexpected_enum_label",
        `INSERT INTO saints (id, name, feast_month, feast_day, short_bio, audio_text, locale)
         VALUES ('enum-check-saint', 'Enum Check Saint', 5, 8, 'Enum fixture row must survive.', 'Enum fixture audio must survive.', 'en');
         ALTER TYPE publication_status ADD VALUE 'unrecognized_status';`,
      );
      const enumLabelsBeforeValidation = psql(
        port,
        "unexpected_enum_label",
        `SELECT array_agg(enum_data.enumlabel ORDER BY enum_data.enumsortorder)::text
         FROM pg_enum enum_data
         JOIN pg_type enum_type ON enum_type.oid = enum_data.enumtypid
         WHERE enum_type.typname = 'publication_status'`,
      );
      const enumFixtureRowBeforeValidation = psql(
        port,
        "unexpected_enum_label",
        `SELECT id || ':' || name || ':' || short_bio || ':' || audio_text || ':' || locale::text || ':' || publication_status::text
         FROM saints WHERE id = 'enum-check-saint'`,
      );
      let unexpectedEnumLabelError;
      try {
        await startApi(unexpectedEnumLabelUrl);
      } catch (error) {
        unexpectedEnumLabelError = error;
      }
      assert.ok(
        unexpectedEnumLabelError,
        "an unexpected database enum label must prevent API startup",
      );
      assert.ok(
        unexpectedEnumLabelError.message.includes(
          "unexpected enum label public.publication_status.unrecognized_status",
        ),
        `schema validation should report the unexpected enum label; got:\n${unexpectedEnumLabelError.message}`,
      );
      assert.equal(
        psql(
          port,
          "unexpected_enum_label",
          `SELECT array_agg(enum_data.enumlabel ORDER BY enum_data.enumsortorder)::text
           FROM pg_enum enum_data
           JOIN pg_type enum_type ON enum_type.oid = enum_data.enumtypid
           WHERE enum_type.typname = 'publication_status'`,
        ),
        enumLabelsBeforeValidation,
        "schema validation must not change enum labels",
      );
      assert.equal(
        psql(
          port,
          "unexpected_enum_label",
          `SELECT id || ':' || name || ':' || short_bio || ':' || audio_text || ':' || locale::text || ':' || publication_status::text
           FROM saints WHERE id = 'enum-check-saint'`,
        ),
        enumFixtureRowBeforeValidation,
        "schema validation must not modify existing rows",
      );
      assertMigrationRecorded(port, "unexpected_enum_label");

      createDatabase(port, "enum_order_mismatch");
      const enumOrderMismatchUrl = `postgres://postgres@127.0.0.1:${port}/enum_order_mismatch`;
      runCommand(
        path.join(databaseDirectory, "node_modules/.bin/drizzle-kit"),
        ["push", "--config", "./drizzle.config.ts", "--force"],
        {
          cwd: databaseDirectory,
          env: { ...environment, DATABASE_URL: enumOrderMismatchUrl },
        },
      );
      const initialEnumOrderApi = await startApi(enumOrderMismatchUrl);
      try {
        assertMigrationRecorded(port, "enum_order_mismatch");
      } finally {
        await stopApi(initialEnumOrderApi);
      }
      psql(
        port,
        "enum_order_mismatch",
        `ALTER TYPE publication_status RENAME VALUE 'published' TO 'temporary_status';
         ALTER TYPE publication_status RENAME VALUE 'archived' TO 'published';
         ALTER TYPE publication_status RENAME VALUE 'temporary_status' TO 'archived';
         INSERT INTO saints (id, name, feast_month, feast_day, short_bio, audio_text, locale, publication_status)
         VALUES ('enum-order-saint', 'Enum Order Saint', 5, 8, 'Enum order fixture row must survive.', 'Enum order fixture audio must survive.', 'en', 'published');`,
      );
      const enumOrderLabelsBeforeValidation = psql(
        port,
        "enum_order_mismatch",
        `SELECT array_agg(enum_data.enumlabel ORDER BY enum_data.enumsortorder)::text
         FROM pg_enum enum_data
         JOIN pg_type enum_type ON enum_type.oid = enum_data.enumtypid
         WHERE enum_type.typname = 'publication_status'`,
      );
      const enumOrderRowBeforeValidation = psql(
        port,
        "enum_order_mismatch",
        `SELECT id || ':' || publication_status::text
         FROM saints WHERE id = 'enum-order-saint'`,
      );
      let enumOrderMismatchError;
      try {
        await startApi(enumOrderMismatchUrl);
      } catch (error) {
        enumOrderMismatchError = error;
      }
      assert.ok(
        enumOrderMismatchError,
        "a database enum with reordered labels must prevent API startup",
      );
      assert.ok(
        enumOrderMismatchError.message.includes(
          "enum order public.publication_status expected [draft, published, archived] but found [draft, archived, published]",
        ),
        `schema validation should report enum order drift; got:\n${enumOrderMismatchError.message}`,
      );
      assert.equal(
        psql(
          port,
          "enum_order_mismatch",
          `SELECT array_agg(enum_data.enumlabel ORDER BY enum_data.enumsortorder)::text
           FROM pg_enum enum_data
           JOIN pg_type enum_type ON enum_type.oid = enum_data.enumtypid
           WHERE enum_type.typname = 'publication_status'`,
        ),
        enumOrderLabelsBeforeValidation,
        "schema validation must not change enum order",
      );
      assert.equal(
        psql(
          port,
          "enum_order_mismatch",
          `SELECT id || ':' || publication_status::text
           FROM saints WHERE id = 'enum-order-saint'`,
        ),
        enumOrderRowBeforeValidation,
        "schema validation must not modify existing rows",
      );
      assertMigrationRecorded(port, "enum_order_mismatch");

      createDatabase(port, "unusable_index");
      const unusableIndexUrl = `postgres://postgres@127.0.0.1:${port}/unusable_index`;
      runCommand(
        path.join(databaseDirectory, "node_modules/.bin/drizzle-kit"),
        ["push", "--config", "./drizzle.config.ts", "--force"],
        {
          cwd: databaseDirectory,
          env: { ...environment, DATABASE_URL: unusableIndexUrl },
        },
      );
      psql(port, "unusable_index", "DROP INDEX saints_name_locale_unique");
      psql(
        port,
        "unusable_index",
        `INSERT INTO saints (id, name, short_bio, audio_text, locale)
         VALUES
           ('duplicate-index-row-1', 'Concurrent Index Duplicate', 'Fixture bio 1', 'Fixture audio 1', 'en'),
           ('duplicate-index-row-2', 'Concurrent Index Duplicate', 'Fixture bio 2', 'Fixture audio 2', 'en')`,
      );
      let concurrentIndexBuildError;
      try {
        psql(
          port,
          "unusable_index",
          `CREATE UNIQUE INDEX CONCURRENTLY saints_name_locale_unique
           ON saints (name, locale)`,
        );
      } catch (error) {
        concurrentIndexBuildError = error;
      }
      assert.ok(
        concurrentIndexBuildError,
        "duplicate values should make the concurrent unique index build fail",
      );
      assert.match(
        concurrentIndexBuildError.message,
        /could not create unique index|duplicate key value/i,
        `the index fixture should fail because of duplicate rows; got:\n${concurrentIndexBuildError.message}`,
      );
      const unusableIndexStatus = `SELECT 'indisvalid=' || index_data.indisvalid::text
          || ', indisready=' || index_data.indisready::text
        FROM pg_index index_data
        JOIN pg_class index_relation ON index_relation.oid = index_data.indexrelid
        JOIN pg_namespace index_namespace ON index_namespace.oid = index_relation.relnamespace
        WHERE index_namespace.nspname = 'public'
          AND index_relation.relname = 'saints_name_locale_unique'`;
      const unusableIndexDefinition = `SELECT pg_get_indexdef(index_data.indexrelid)
        FROM pg_index index_data
        JOIN pg_class index_relation ON index_relation.oid = index_data.indexrelid
        JOIN pg_namespace index_namespace ON index_namespace.oid = index_relation.relnamespace
        WHERE index_namespace.nspname = 'public'
          AND index_relation.relname = 'saints_name_locale_unique'`;
      const unusableIndexStatusBeforeValidation = psql(
        port,
        "unusable_index",
        unusableIndexStatus,
      );
      const unusableIndexDefinitionBeforeValidation = psql(
        port,
        "unusable_index",
        unusableIndexDefinition,
      );
      assert.match(
        unusableIndexStatusBeforeValidation,
        /indisvalid=false|indisready=false/,
        "the failed concurrent build should leave the expected index unusable",
      );
      let unusableIndexStartupError;
      try {
        await startApi(unusableIndexUrl);
      } catch (error) {
        unusableIndexStartupError = error;
      }
      assert.ok(
        unusableIndexStartupError,
        "an unusable expected index must prevent API startup",
      );
      assert.ok(
        unusableIndexStartupError.message.includes(
          "index public.saints_name_locale_unique on public.saints",
        ),
        `schema validation should report the unusable index; got:\n${unusableIndexStartupError.message}`,
      );
      assert.ok(
        unusableIndexStartupError.message.includes(
          `(${unusableIndexStatusBeforeValidation})`,
        ),
        `schema validation should report the index status flags; got:\n${unusableIndexStartupError.message}`,
      );
      assert.equal(
        psql(port, "unusable_index", unusableIndexStatus),
        unusableIndexStatusBeforeValidation,
        "schema validation must leave the unusable index status flags unchanged",
      );
      assert.equal(
        psql(port, "unusable_index", unusableIndexDefinition),
        unusableIndexDefinitionBeforeValidation,
        "schema validation must not drop, rebuild, or otherwise replace an unusable index",
      );

      psql(
        port,
        "unusable_index",
        `DELETE FROM saints WHERE id = 'duplicate-index-row-2';
         DROP INDEX saints_name_locale_unique;
         CREATE UNIQUE INDEX saints_name_locale_unique
           ON saints (name, locale)`,
      );
      const repairedIndexStatus = psql(
        port,
        "unusable_index",
        unusableIndexStatus,
      );
      assert.equal(
        repairedIndexStatus,
        "indisvalid=true, indisready=true",
        "the repaired index should be valid and ready",
      );
      const repairedApi = await startApi(unusableIndexUrl);
      try {
        assertMigrationRecorded(port, "unusable_index");
      } finally {
        await stopApi(repairedApi);
      }

      createDatabase(port, "incomplete_schema");
      const incompleteSchemaUrl = `postgres://postgres@127.0.0.1:${port}/incomplete_schema`;
      runCommand(
        path.join(databaseDirectory, "node_modules/.bin/drizzle-kit"),
        ["push", "--config", "./drizzle.config.ts", "--force"],
        {
          cwd: databaseDirectory,
          env: { ...environment, DATABASE_URL: incompleteSchemaUrl },
        },
      );
      psql(
        port,
        "incomplete_schema",
        `INSERT INTO saints (id, name, feast_month, feast_day, short_bio, audio_text, locale)
         VALUES ('schema-check-saint', 'Schema Check Saint', 3, 14, 'Must remain present.', 'Must remain present too.', 'en');
         INSERT INTO daily_content (id, content_date, verse_reference, verse_text, verse_author, locale)
         VALUES ('schema-check-content', '2026-09-29', 'Psalm 1:1', 'Must remain present.', 'David', 'en');
         ALTER TABLE saints RENAME COLUMN audio_text TO archived_audio_text;
         DROP INDEX saints_browse_idx;
         CREATE INDEX saints_browse_idx ON saints (id);
          ALTER TABLE saints DROP CONSTRAINT saints_feast_day_valid;
         ALTER TYPE content_locale RENAME VALUE 'fr' TO 'legacy_fr';
         ALTER TABLE saints ALTER COLUMN short_bio TYPE character varying
           USING short_bio::character varying;
         ALTER TABLE saints ALTER COLUMN feast_day SET NOT NULL;
         ALTER TABLE saints ALTER COLUMN locale SET DEFAULT 'en'::content_locale;
         ALTER TABLE saints ALTER COLUMN publication_status DROP DEFAULT;
         ALTER TABLE saints ALTER COLUMN feast_month SET DEFAULT 1;`,
      );

      let startupError;
      try {
        await startApi(incompleteSchemaUrl);
      } catch (error) {
        startupError = error;
      }
      assert.ok(
        startupError,
        "an incomplete existing schema must prevent API startup",
      );
      for (const object of [
        "column public.saints.audio_text",
        "unexpected column public.saints.archived_audio_text",
        "column public.saints.short_bio has type character varying, expected text",
        "column public.saints.feast_day is NOT NULL, expected nullable",
        "column public.saints.locale has default 'en'::content_locale, expected 'ar'",
        "column public.saints.publication_status has default no default, expected 'published'",
        "column public.saints.feast_month has default 1, expected no default",
        "enum label public.content_locale.fr",
        "index public.saints_browse_idx on public.saints",
        "constraint public.saints.saints_feast_day_valid",
      ]) {
        assert.ok(
          startupError.message.includes(object),
          `schema validation should report ${object}; got:\n${startupError.message}`,
        );
      }
      assert.equal(
        psql(
          port,
          "incomplete_schema",
          `SELECT count(*) FROM saints
           WHERE id = 'schema-check-saint' AND archived_audio_text = 'Must remain present too.'
             AND short_bio = 'Must remain present.'
             AND feast_month = 3 AND feast_day = 14`,
        ),
        "1",
        "schema validation must not modify existing saint records",
      );
      assert.equal(
        psql(
          port,
          "incomplete_schema",
          `SELECT count(*) FROM daily_content
           WHERE id = 'schema-check-content' AND verse_text = 'Must remain present.'`,
        ),
        "1",
        "schema validation must not modify existing daily content records",
      );
      assert.equal(
        psql(
          port,
          "incomplete_schema",
          `SELECT data_type FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'saints' AND column_name = 'short_bio'`,
        ),
        "character varying",
        "schema validation must not repair an incompatible column type",
      );
      assert.equal(
        psql(
          port,
          "incomplete_schema",
          `SELECT is_nullable FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'saints' AND column_name = 'feast_day'`,
        ),
        "NO",
        "schema validation must not repair an incompatible nullability setting",
      );
      assert.equal(
        psql(
          port,
          "incomplete_schema",
          `SELECT column_default FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'saints' AND column_name = 'locale'`,
        ),
        "'en'::content_locale",
        "schema validation must not repair an incompatible default",
      );
      assert.equal(
        psql(
          port,
          "incomplete_schema",
          `SELECT column_default IS NULL FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'saints'
             AND column_name = 'publication_status'`,
        ),
        "t",
        "schema validation must not restore a missing default",
      );
      assert.equal(
        psql(
          port,
          "incomplete_schema",
          `SELECT column_default FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'saints'
             AND column_name = 'feast_month'`,
        ),
        "1",
        "schema validation must not remove an unexpected default",
      );

      createDatabase(port, "failed_upgrade");
      const failedUpgradeUrl = `postgres://postgres@127.0.0.1:${port}/failed_upgrade`;
      createDatabase(port, "failed_existing_upgrade");
      const failedExistingUpgradeUrl = `postgres://postgres@127.0.0.1:${port}/failed_existing_upgrade`;
      const fixtureDistDirectory = path.join(temporaryDirectory, "api-dist");
      cpSync(path.join(apiDirectory, "dist"), fixtureDistDirectory, {
        recursive: true,
      });

      const retryTimestamp = Math.max(...migrationTimestamps) + 1;
      const retryMigrationTag = "0001_retryable_upgrade";
      const retryMigrationPath = path.join(
        fixtureDistDirectory,
        "migrations",
        `${retryMigrationTag}.sql`,
      );
      const retryJournalPath = path.join(
        fixtureDistDirectory,
        "migrations",
        "meta",
        "_journal.json",
      );
      const fixtureJournal = {
        ...migrationJournal,
        entries: [
          ...migrationJournal.entries,
          {
            idx: migrationJournal.entries.length,
            version: migrationJournal.version,
            when: retryTimestamp,
            tag: retryMigrationTag,
            breakpoints: true,
          },
        ],
      };
      writeFileSync(
        retryJournalPath,
        `${JSON.stringify(fixtureJournal, null, 2)}\n`,
      );
      writeFileSync(
        retryMigrationPath,
        "CREATE TABLE migration_retry_probe (id integer PRIMARY KEY);\n--> statement-breakpoint\nSELECT 1 / 0;\n",
      );

      const existingUpgradeApi = await startApi(failedExistingUpgradeUrl);
      try {
        assertMigrationRecorded(port, "failed_existing_upgrade");
      } finally {
        await stopApi(existingUpgradeApi);
      }
      psql(
        port,
        "failed_existing_upgrade",
        `INSERT INTO saints (id, name, feast_month, feast_day, short_bio, audio_text, locale)
         VALUES ('failed-existing-saint', 'Failed Existing Saint', 2, 17, 'Existing data must survive a failed upgrade.', 'Existing audio must survive too.', 'en');
         INSERT INTO daily_content (id, content_date, verse_reference, verse_text, verse_author, locale)
         VALUES ('failed-existing-content', '2026-09-29', 'John 1:1', 'Existing content must survive.', 'Saint John', 'en');`,
      );

      let failedMigrationError;
      try {
        await startApi(failedUpgradeUrl, fixtureDistDirectory);
      } catch (error) {
        failedMigrationError = error;
      }
      assert.ok(
        failedMigrationError,
        "a SQL migration error must prevent API startup",
      );
      assert.match(
        failedMigrationError.message,
        /division by zero/i,
        `startup should report the SQL error; got:\n${failedMigrationError.message}`,
      );
      assert.equal(
        psql(
          port,
          "failed_upgrade",
          `SELECT count(*) FROM drizzle.__drizzle_migrations WHERE created_at = ${retryTimestamp}`,
        ),
        "0",
        "the failed migration version must not be recorded as applied",
      );
      assert.equal(
        psql(
          port,
          "failed_upgrade",
          "SELECT to_regclass('public.migration_retry_probe') IS NULL",
        ),
        "t",
        "the failed migration's earlier SQL statements must be rolled back",
      );

      let failedExistingMigrationError;
      try {
        await startApi(failedExistingUpgradeUrl, fixtureDistDirectory);
      } catch (error) {
        failedExistingMigrationError = error;
      }
      assert.ok(
        failedExistingMigrationError,
        "a failed upgrade must prevent startup when user data already exists",
      );
      assert.match(
        failedExistingMigrationError.message,
        /division by zero/i,
        `the existing database should report the failed SQL migration; got:\n${failedExistingMigrationError.message}`,
      );
      assertMigrationRecorded(port, "failed_existing_upgrade");
      assert.equal(
        psql(
          port,
          "failed_existing_upgrade",
          `SELECT count(*) FROM drizzle.__drizzle_migrations WHERE created_at = ${retryTimestamp}`,
        ),
        "0",
        "the failed version must not be recorded for an existing database",
      );
      assert.equal(
        psql(
          port,
          "failed_existing_upgrade",
          `SELECT count(*) FROM saints
           WHERE id = 'failed-existing-saint'
             AND short_bio = 'Existing data must survive a failed upgrade.'
             AND audio_text = 'Existing audio must survive too.'`,
        ),
        "1",
        "an unsuccessful upgrade must preserve existing user rows",
      );
      assert.equal(
        psql(
          port,
          "failed_existing_upgrade",
          `SELECT count(*) FROM daily_content
           WHERE id = 'failed-existing-content'
             AND verse_text = 'Existing content must survive.'`,
        ),
        "1",
        "an unsuccessful upgrade must preserve existing content rows",
      );

      writeFileSync(
        retryMigrationPath,
        "CREATE TABLE migration_retry_probe (id integer PRIMARY KEY);\n--> statement-breakpoint\nSELECT 1;\n",
      );
      const retriedApi = await startApi(failedUpgradeUrl, fixtureDistDirectory);
      try {
        assertMigrationRecorded(port, "failed_upgrade", [
          ...migrationTimestamps,
          retryTimestamp,
        ]);
      } finally {
        await stopApi(retriedApi);
      }
      const retriedExistingApi = await startApi(
        failedExistingUpgradeUrl,
        fixtureDistDirectory,
      );
      try {
        assertMigrationRecorded(port, "failed_existing_upgrade", [
          ...migrationTimestamps,
          retryTimestamp,
        ]);
      } finally {
        await stopApi(retriedExistingApi);
      }
      assert.equal(
        psql(
          port,
          "failed_upgrade",
          "SELECT to_regclass('public.migration_retry_probe') IS NOT NULL",
        ),
        "t",
        "the corrected migration should create its table on retry",
      );
      assert.equal(
        psql(
          port,
          "failed_existing_upgrade",
          `SELECT count(*) FROM saints
           WHERE id = 'failed-existing-saint'
             AND short_bio = 'Existing data must survive a failed upgrade.'`,
        ),
        "1",
        "reapplying a corrected migration must preserve existing user rows",
      );

      createDatabase(port, "daily_seed_coverage");
      const dailySeedDatabaseUrl = `postgres://postgres@127.0.0.1:${port}/daily_seed_coverage`;
      const dailySeedMigrationApi = await startApi(dailySeedDatabaseUrl);
      await stopApi(dailySeedMigrationApi);
      psql(port, "daily_seed_coverage", "DELETE FROM daily_content");
      const seedYear = new Date().getUTCFullYear();
      const curatedDate = `${seedYear}-12-30`;
      const generatedDate = `${seedYear}-12-31`;
      psql(
        port,
        "daily_seed_coverage",
        `INSERT INTO daily_content (
           id, content_date, calendar_system, verse_reference, verse_text,
           verse_author, locale, publication_status
         ) VALUES (
           'editorial-before-seed', '${curatedDate}', 'gregorian',
           'Psalm 23:1', 'Keep this reviewed verse.', 'Editor', 'ar', 'draft'
         )`,
      );
      runCommand(
        "pnpm",
        ["--filter", "@workspace/db", "run", "seed"],
        {
          env: {
            ...postgresEnvironment(),
            DATABASE_URL: dailySeedDatabaseUrl,
          },
        },
      );
      const expectedYearDays =
        (Date.UTC(seedYear + 1, 0, 1) - Date.UTC(seedYear, 0, 1)) /
        (24 * 60 * 60 * 1000);
      assert.equal(
        psql(
          port,
          "daily_seed_coverage",
          `SELECT count(*) FROM daily_content
           WHERE content_date >= '${seedYear}-01-01'
             AND content_date <= '${seedYear}-12-31'
             AND calendar_system = 'gregorian' AND locale = 'ar'`,
        ),
        String(expectedYearDays),
        "daily seeding must cover every date in the current year",
      );
      assert.equal(
        psql(
          port,
          "daily_seed_coverage",
          `SELECT id || ':' || publication_status || ':' || verse_text
           FROM daily_content WHERE content_date = '${curatedDate}'
             AND calendar_system = 'gregorian' AND locale = 'ar'`,
        ),
        "editorial-before-seed:draft:Keep this reviewed verse.",
        "daily seeding must preserve existing editorial content and publication status",
      );
      const dailySeedApiPort = await availablePort();
      const dailySeedApi = await startApi(
        dailySeedDatabaseUrl,
        undefined,
        dailySeedApiPort,
      );
      try {
        const response = await fetch(
          `http://127.0.0.1:${dailySeedApiPort}/api/daily?date=${generatedDate}&locale=ar`,
        );
        assert.equal(
          response.status,
          200,
          "the daily API must serve a generated date beyond the original sample rows",
        );
        const dailyContent = await response.json();
        assert.equal(dailyContent.date, generatedDate);
        assert.equal(dailyContent.canonicalDate, generatedDate);
        assert.equal(dailyContent.verse.reference, "يوحنا ١٤:٢٧");
        const easternYearEndResponse = await fetch(
          `http://127.0.0.1:${dailySeedApiPort}/api/daily?date=${seedYear}-12-31&calendarType=julian&locale=ar`,
        );
        assert.equal(
          easternYearEndResponse.status,
          200,
          "Julian year-end dates must remain available after Gregorian year conversion",
        );
        const easternYearEndContent = await easternYearEndResponse.json();
        assert.equal(easternYearEndContent.date, `${seedYear}-12-31`);
        assert.notEqual(
          easternYearEndContent.canonicalDate,
          easternYearEndContent.date,
          "a Julian request should return its converted Gregorian storage date",
        );
      } finally {
        await stopApi(dailySeedApi);
      }
    } finally {
      runCommand(
        "pg_ctl",
        ["-D", dataDirectory, "-m", "immediate", "-w", "stop"],
        {
          env: environment,
        },
      );
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
