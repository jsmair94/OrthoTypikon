-- Older databases used PostgreSQL's default names for this table's primary
-- key and foreign keys. Normalize those names without changing row contents or
-- removing any rule unless an equivalent, validated Drizzle constraint exists.
DO $$
DECLARE
  target_table regclass := to_regclass('public.calendar_entry_saints');
  existing_primary_key_name text;
  existing_primary_key_columns text[];
  expected_primary_key_columns text[] := ARRAY['calendar_entry_id', 'saint_id'];
  legacy_fk_name text;
  expected_fk_name text;
  legacy_fk pg_constraint%ROWTYPE;
  expected_fk pg_constraint%ROWTYPE;
BEGIN
  IF target_table IS NULL THEN
    RAISE EXCEPTION 'Cannot normalize constraints: public.calendar_entry_saints does not exist';
  END IF;

  SELECT
    constraint_data.conname::text,
    ARRAY(
      SELECT attribute.attname::text
      FROM unnest(constraint_data.conkey) WITH ORDINALITY AS key(attnum, position)
      JOIN pg_attribute attribute
        ON attribute.attrelid = constraint_data.conrelid
        AND attribute.attnum = key.attnum
      ORDER BY key.position
    )
  INTO existing_primary_key_name, existing_primary_key_columns
  FROM pg_constraint constraint_data
  WHERE constraint_data.conrelid = target_table
    AND constraint_data.contype = 'p';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot normalize constraints: no primary key exists on public.calendar_entry_saints';
  END IF;

  IF existing_primary_key_columns IS DISTINCT FROM expected_primary_key_columns THEN
    RAISE EXCEPTION
      'Refusing to rename primary key % on public.calendar_entry_saints: found columns %, expected %',
      existing_primary_key_name,
      existing_primary_key_columns,
      expected_primary_key_columns;
  END IF;

  IF existing_primary_key_name <> 'calendar_entry_saints_calendar_entry_id_saint_id_pk' THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = target_table
        AND conname = 'calendar_entry_saints_calendar_entry_id_saint_id_pk'
    ) THEN
      RAISE EXCEPTION
        'Cannot rename primary key %: target constraint name calendar_entry_saints_calendar_entry_id_saint_id_pk is already in use',
        existing_primary_key_name;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.calendar_entry_saints RENAME CONSTRAINT %I TO %I',
      existing_primary_key_name,
      'calendar_entry_saints_calendar_entry_id_saint_id_pk'
    );
  END IF;

  FOR legacy_fk_name, expected_fk_name IN
    SELECT names.legacy_name, names.expected_name
    FROM (
      VALUES
        (
          'calendar_entry_saints_calendar_entry_id_fkey',
          'calendar_entry_saints_calendar_entry_id_calendar_entries_id_fk'
        ),
        (
          'calendar_entry_saints_saint_id_fkey',
          'calendar_entry_saints_saint_id_saints_id_fk'
        )
    ) AS names(legacy_name, expected_name)
  LOOP
    SELECT *
    INTO legacy_fk
    FROM pg_constraint
    WHERE conrelid = target_table
      AND conname = legacy_fk_name
      AND contype = 'f';

    IF FOUND THEN
      SELECT *
      INTO expected_fk
      FROM pg_constraint
      WHERE conrelid = target_table
        AND conname = expected_fk_name
        AND contype = 'f';

      IF NOT FOUND THEN
        RAISE EXCEPTION
          'Refusing to drop legacy constraint %: expected constraint % is missing',
          legacy_fk_name,
          expected_fk_name;
      END IF;

      IF legacy_fk.conkey IS DISTINCT FROM expected_fk.conkey
        OR legacy_fk.confrelid IS DISTINCT FROM expected_fk.confrelid
        OR legacy_fk.confkey IS DISTINCT FROM expected_fk.confkey
        OR legacy_fk.confdeltype IS DISTINCT FROM expected_fk.confdeltype
        OR legacy_fk.confupdtype IS DISTINCT FROM expected_fk.confupdtype
        OR legacy_fk.confmatchtype IS DISTINCT FROM expected_fk.confmatchtype
        OR legacy_fk.condeferrable IS DISTINCT FROM expected_fk.condeferrable
        OR legacy_fk.condeferred IS DISTINCT FROM expected_fk.condeferred
        OR NOT legacy_fk.convalidated
        OR NOT expected_fk.convalidated
      THEN
        RAISE EXCEPTION
          'Refusing to drop legacy constraint %: it is not an exact, validated duplicate of %',
          legacy_fk_name,
          expected_fk_name;
      END IF;

      EXECUTE format(
        'ALTER TABLE public.calendar_entry_saints DROP CONSTRAINT %I',
        legacy_fk_name
      );
    END IF;
  END LOOP;
END $$;