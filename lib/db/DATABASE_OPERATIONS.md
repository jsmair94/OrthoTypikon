# Database operations: failed index builds

Use this procedure when API startup reports an expected index, for example
`index public.saints_name_locale_unique on public.saints`, with
`indisvalid=false` or `indisready=false`.

The API applies any pending tracked migrations before validating the schema.
Schema validation does not repair or otherwise change persistent database
objects. It reads the existing schema and may create temporary objects in its
database session to normalize expected definitions. Keep the API from
repeatedly restarting while you inspect and repair the reported index.

## 1. Inspect the exact index

Connect to the affected database with `psql` and substitute the schema and index
name from the startup error:

```sql
SELECT
  index_namespace.nspname AS index_schema,
  index_relation.relname AS index_name,
  table_namespace.nspname AS table_schema,
  table_relation.relname AS table_name,
  index_data.indisvalid,
  index_data.indisready,
  index_data.indisunique,
  access_method.amname AS method,
  pg_get_indexdef(index_data.indexrelid) AS definition
FROM pg_index AS index_data
JOIN pg_class AS index_relation
  ON index_relation.oid = index_data.indexrelid
JOIN pg_namespace AS index_namespace
  ON index_namespace.oid = index_relation.relnamespace
JOIN pg_class AS table_relation
  ON table_relation.oid = index_data.indrelid
JOIN pg_namespace AS table_namespace
  ON table_namespace.oid = table_relation.relnamespace
JOIN pg_am AS access_method
  ON access_method.oid = index_relation.relam
WHERE index_namespace.nspname = 'public'
  AND index_relation.relname = 'saints_name_locale_unique';
```

Use the reported schema rather than assuming `public`. No returned row means
the index is missing or its name/schema differs; multiple rows mean you must
identify the exact one on the reported table before changing anything.

Check whether a table constraint owns the index before considering a drop:

```sql
SELECT table_namespace.nspname AS table_schema,
       table_relation.relname AS table_name,
       constraint_data.conname AS constraint_name,
       CASE constraint_data.contype
         WHEN 'p' THEN 'PRIMARY KEY'
         WHEN 'u' THEN 'UNIQUE'
         WHEN 'x' THEN 'EXCLUSION'
       END AS constraint_type
FROM pg_constraint AS constraint_data
JOIN pg_class AS table_relation
  ON table_relation.oid = constraint_data.conrelid
JOIN pg_namespace AS table_namespace
  ON table_namespace.oid = table_relation.relnamespace
WHERE constraint_data.conindid = 'public.saints_name_locale_unique'::regclass
  AND constraint_data.contype IN ('p', 'u', 'x');
```

Replace the qualified name in the `regclass` value with the reported index.
Here, `p`, `u`, and `x` mean primary key, unique, and exclusion constraint.
`indisunique = true` alone does not mean an index is constraint-owned.
Drizzle's `uniqueIndex(...)` declarations, including this guide's
`saints_name_locale_unique` example, create standalone indexes; primary-key
declarations create constraint-owned indexes.

If this returns a row, do not drop the index directly and never use `CASCADE`.
Use the constraint-owned recovery steps below. If it returns no rows, the
standalone-index procedure later in this guide may apply.

## 2. Choose the recovery action

- If both flags are `true`, the index is valid and ready. Do not rebuild it
  solely because startup failed. Compare its `definition`, method, uniqueness,
  key order, operator classes, predicate, and storage options with the Drizzle
  schema in `lib/db/src/schema` and the tracked SQL in `lib/db/drizzle`.
  Correct only the confirmed mismatch, using a tracked migration when the
  intended schema needs to change.
- If either flag is `false`, do not treat the index as usable and do not restart
  the API yet. A failed concurrent build can leave an invalid index behind.
  Resolve the original cause first. For a failed unique index, inspect duplicate
  key values before rebuilding. For example, the expected keys for
  `saints_name_locale_unique` are `(name, locale)`:

  ```sql
  SELECT name, locale, count(*)
  FROM public.saints
  GROUP BY name, locale
  HAVING count(*) > 1;
  ```

  Review any data correction separately; do not delete or merge rows just to
  make an index build pass.
- If either usability flag is `false` and the ownership query reports a
  `PRIMARY KEY` or `UNIQUE` constraint whose index definition matches the
  intended schema, rebuild its index without dropping or disabling the
  constraint. Prefer concurrent reindexing:

  ```sql
  REINDEX INDEX CONCURRENTLY
    public.calendar_entry_saints_calendar_entry_id_saint_id_pk;
  ```

  Substitute the exact index relation found by the inspection and ownership
  queries; do not assume its name is always the constraint name. PostgreSQL
  builds a replacement and transfers the constraint to it as part of the
  operation, so uniqueness or primary-key enforcement remains in place. Run
  this as a standalone command, not inside a transaction. Keep the API stopped
  until the verification query below confirms both flags are `true`.

  If concurrent reindexing is unavailable, schedule a write-blocking maintenance
  window and use the same command without `CONCURRENTLY`:

  ```sql
  REINDEX INDEX
    public.calendar_entry_saints_calendar_entry_id_saint_id_pk;
  ```

  A regular `REINDEX INDEX` blocks writes to the table until it completes, but
  allows reads and preserves the constraint. If reindexing fails, keep the API
  stopped, inspect the reported error and index state again, and do not drop the
  constraint-owned index.

  Reindexing preserves the existing index definition; it does not correct a
  definition that differs from the intended schema. Do not run these reindex
  commands for a definition mismatch. For a planned definition change, use a
  reviewed, tracked migration. Where PostgreSQL's
  `ADD ... USING INDEX` rules apply, the migration can build a valid replacement
  unique index first, then replace the constraint in one transaction by
  dropping and re-adding the same `UNIQUE` or `PRIMARY KEY` constraint using that
  index. Preserve the exact key columns and unique/null semantics, keep primary
  key columns `NOT NULL`, and include any dependent foreign keys in the reviewed
  migration. Never commit between removing and restoring the constraint, and
  never use `CASCADE`. The replacement index must be a plain, non-partial btree
  with default sort ordering; PostgreSQL does not support this attachment form
  on partitioned tables.
- If the ownership query reports an `EXCLUSION` constraint and either flag is
  `false`, do not use `CONCURRENTLY`. Schedule a write-blocking maintenance
  window and run `REINDEX INDEX` against the exact index. PostgreSQL does not
  support concurrent reindexing for exclusion-constraint indexes; do not drop
  the constraint-owned index.
- If the index is confirmed to be a standalone index (the constraint query
  returned no rows), remove the unusable index and recreate the exact expected
  definition. For the `saints_name_locale_unique` example, after resolving any
  duplicate values:

  ```sql
  DROP INDEX CONCURRENTLY IF EXISTS public.saints_name_locale_unique;
  CREATE UNIQUE INDEX CONCURRENTLY saints_name_locale_unique
    ON public.saints USING btree (name, locale);
  ```

  Run these as separate, autocommitted statements; concurrent index operations
  cannot run inside a transaction block. Use the actual expected definition for
  the reported index, not this example. If concurrent creation fails again,
  inspect the new flags and error before proceeding. `IF NOT EXISTS` alone is
  not a repair: it can leave an existing invalid or mismatched same-name index
  untouched.

For a missing index, create the exact expected index after confirming there is
no conflicting same-name object. For an index with valid flags but an
unexpected definition, do not drop it until the discrepancy and any constraint
ownership are understood.

## 3. Verify before restarting the API

Run the inspection query again. Confirm it returns exactly the expected index
on the expected table, both `indisvalid` and `indisready` are `true`, and
`pg_get_indexdef` matches the expected definition in the schema and tracked
migration. For the example above, PostgreSQL should report a unique btree index
on `public.saints (name, locale)`.

Only then restart the API. Startup performs schema validation again; if it
still reports an index problem, keep the API stopped and inspect the exact
object named by the new error rather than repeating a blind rebuild. Do not use
`drizzle-kit push` against production; make intended schema changes through
tracked migrations.

PostgreSQL references: [REINDEX](https://www.postgresql.org/docs/current/sql-reindex.html)
and [ALTER TABLE: add a constraint using an index](https://www.postgresql.org/docs/current/sql-altertable.html#SQL-ALTERTABLE-DESC-ADD-TABLE-CONSTRAINT-USING-INDEX).

Use the PostgreSQL documentation version matching the database's major release.