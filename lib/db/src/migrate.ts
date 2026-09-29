import { SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { PgDialect, getTableConfig } from "drizzle-orm/pg-core";
import type { PoolClient } from "pg";
import * as schema from "./schema";
import { collectDatabaseEnums, collectDatabaseTables } from "./schema/enums";
import { pool } from "./client";

type DatabaseDefault =
  | { kind: "literal"; value: string | number | boolean | null }
  | { kind: "expression"; value: string };

type ExpectedCheck = {
  schema_name: string;
  table_name: string;
  constraint_name: string;
  expression: string;
  columns: { name: string; type: string }[];
};

type ExpectedIndexKey =
  | {
      kind: "column";
      value: string;
      order: "asc" | "desc";
      nulls: "first" | "last";
      opClass?: string;
    }
  | { kind: "expression"; value: string };

type ExpectedIndex = {
  schema_name: string;
  table_name: string;
  index_name: string;
  is_unique: boolean;
  method: string;
  columns: ExpectedIndexKey[];
  predicate: string | null;
  storage_parameters: Record<string, unknown>;
  table_columns: {
    name: string;
    type: string;
    type_schema: string | null;
  }[];
};

const postgresDialect = new PgDialect();

function getDatabaseDefault(
  value: unknown,
  tableName: string,
  columnName: string,
): DatabaseDefault | null {
  if (value === undefined) return null;
  if (value instanceof SQL) {
    const query = postgresDialect.sqlToQuery(value);
    if (query.params.length > 0) {
      throw new Error(
        `Cannot validate parameterized default for ${tableName}.${columnName}.`,
      );
    }
    return { kind: "expression", value: query.sql };
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return { kind: "literal", value };
  }
  throw new Error(
    `Cannot validate unsupported database default for ${tableName}.${columnName}.`,
  );
}

function getExpectedSchema(schemaModule: object = schema) {
  const tables = collectDatabaseTables(schemaModule).map((table) =>
    getTableConfig(table),
  );
  const databaseEnums = collectDatabaseEnums(schemaModule);
  const enumSchemas = new Map(
    databaseEnums.map(
      (enumType) => [enumType.enumName, enumType.schema ?? "public"] as const,
    ),
  );
  const tableObjects = tables.map((table) => ({
    schema_name: table.schema ?? "public",
    table_name: table.name,
  }));
  const columns = tables.flatMap((table) =>
    table.columns.map((column) => {
      const columnType = column.getSQLType();
      return {
        schema_name: table.schema ?? "public",
        table_name: table.name,
        column_name: column.name,
        column_type: columnType,
        type_schema: enumSchemas.get(columnType) ?? null,
        not_null: column.notNull,
        database_default: getDatabaseDefault(
          column.default,
          table.name,
          column.name,
        ),
      };
    }),
  );
  const enums = databaseEnums.map((enumType) => ({
    schema_name: enumType.schema ?? "public",
    enum_name: enumType.enumName,
    enum_labels: enumType.enumValues,
  }));
  const indexes: ExpectedIndex[] = tables.flatMap((table) =>
    table.indexes.map((index) => {
      const indexName = index.config.name;
      if (!indexName) {
        throw new Error(
          `Cannot validate unnamed index on ${table.schema ?? "public"}.${table.name}.`,
        );
      }
      const columns = index.config.columns.map((column) => {
        if (column instanceof SQL) {
          const query = postgresDialect.sqlToQuery(column.inlineParams());
          if (query.params.length > 0) {
            throw new Error(
              `Cannot validate parameterized expression in index ${indexName}.`,
            );
          }
          return { kind: "expression" as const, value: query.sql };
        }
        if (!("name" in column) || typeof column.name !== "string") {
          throw new Error(
            `Cannot validate unsupported index key in ${indexName}.`,
          );
        }
        const indexConfig =
          "indexConfig" in column ? column.indexConfig : undefined;
        return {
          kind: "column" as const,
          value: column.name,
          order: indexConfig?.order ?? "asc",
          nulls: indexConfig?.nulls ?? "last",
          opClass: indexConfig?.opClass,
        };
      });
      let predicate: string | null = null;
      if (index.config.where) {
        const query = postgresDialect.sqlToQuery(
          index.config.where.inlineParams(),
        );
        if (query.params.length > 0) {
          throw new Error(
            `Cannot validate parameterized predicate for index ${indexName}.`,
          );
        }
        predicate = query.sql;
      }
      return {
        schema_name: table.schema ?? "public",
        table_name: table.name,
        index_name: indexName,
        is_unique: index.config.unique,
        method: index.config.method ?? "btree",
        columns,
        predicate,
        storage_parameters: index.config.with ?? {},
        table_columns: table.columns.map((column) => {
          const columnType = column.getSQLType();
          return {
            name: column.name,
            type: columnType,
            type_schema: enumSchemas.get(columnType) ?? null,
          };
        }),
      };
    }),
  );
  const constraints = tables.flatMap((table) => {
    const schemaName = table.schema ?? "public";
    const columnPrimaryKeys = table.columns
      .filter((column) => column.primary)
      .map((column) => ({
        schema_name: schemaName,
        table_name: table.name,
        constraint_name: `${table.name}_pkey`,
        constraint_type: "p",
        columns: [column.name],
      }));
    const primaryKeys = table.primaryKeys.map((key) => ({
      schema_name: schemaName,
      table_name: table.name,
      constraint_name: key.getName(),
      constraint_type: "p",
      columns: key.columns.map((column) => column.name),
    }));
    const foreignKeys = table.foreignKeys.map((key) => {
      const reference = key.reference();
      return {
        schema_name: schemaName,
        table_name: table.name,
        constraint_name: key.getName(),
        constraint_type: "f",
        columns: reference.columns.map((column) => column.name),
        referenced_schema:
          getTableConfig(reference.foreignTable).schema ?? "public",
        referenced_table: getTableConfig(reference.foreignTable).name,
        referenced_columns: reference.foreignColumns.map(
          (column) => column.name,
        ),
        on_delete: actionToPostgresCode(key.onDelete),
        on_update: actionToPostgresCode(key.onUpdate),
      };
    });
    const checks = table.checks.map((check) => ({
      schema_name: schemaName,
      table_name: table.name,
      constraint_name: check.name,
      constraint_type: "c",
      columns: [],
      check_expression: null,
    }));
    const uniqueConstraints = table.uniqueConstraints.map((constraint) => ({
      schema_name: schemaName,
      table_name: table.name,
      constraint_name: constraint.getName(),
      constraint_type: "u",
      columns: constraint.columns.map((column) => column.name),
    }));
    return [
      ...columnPrimaryKeys,
      ...primaryKeys,
      ...foreignKeys,
      ...checks,
      ...uniqueConstraints,
    ];
  });

  const expectedChecks: ExpectedCheck[] = tables.flatMap((table) =>
    table.checks.map((check) => {
      const query = postgresDialect.sqlToQuery(check.value);
      if (query.params.length > 0) {
        throw new Error(
          `Cannot validate parameterized check constraint ${table.name}.${check.name}.`,
        );
      }
      const expression = query.sql;
      const columns = table.columns
        .filter((column) =>
          expression.includes(
            `${quoteIdentifier(table.name)}.${quoteIdentifier(column.name)}`,
          ),
        )
        .map((column) => ({
          name: column.name,
          type: column.getSQLType(),
        }));
      return {
        schema_name: table.schema ?? "public",
        table_name: table.name,
        constraint_name: check.name,
        expression,
        columns,
      };
    }),
  );

  return { tableObjects, columns, enums, indexes, constraints, expectedChecks };
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function quoteQualifiedIdentifier(identifier: string): string {
  return identifier.split(".").map(quoteIdentifier).join(".");
}

async function getCanonicalExpectedIndexes(
  client: PoolClient,
  expectedIndexes: ExpectedIndex[],
): Promise<
  Map<
    string,
    {
      columns: string[];
      predicate: string | null;
      storage_parameters: string[];
    }
  >
> {
  const indexesByTable = new Map<string, ExpectedIndex[]>();
  for (const index of expectedIndexes) {
    const tableKey = `${index.schema_name}.${index.table_name}`;
    const indexes = indexesByTable.get(tableKey) ?? [];
    indexes.push(index);
    indexesByTable.set(tableKey, indexes);
  }

  const canonicalIndexes = new Map<
    string,
    {
      columns: string[];
      predicate: string | null;
      storage_parameters: string[];
    }
  >();
  for (const indexes of indexesByTable.values()) {
    const firstIndex = indexes[0];
    const tableName = firstIndex.table_name;
    const temporaryTable = quoteIdentifier(tableName);
    const columnDefinitions = new Map<
      string,
      { type: string; type_schema: string | null }
    >();
    for (const index of indexes) {
      for (const column of index.table_columns) {
        columnDefinitions.set(column.name, {
          type: column.type,
          type_schema: column.type_schema,
        });
      }
    }

    try {
      const definitions = [...columnDefinitions].map(([name, column]) => {
        const type = column.type_schema
          ? `${quoteIdentifier(column.type_schema)}.${quoteIdentifier(column.type)}`
          : column.type;
        return `${quoteIdentifier(name)} ${type}`;
      });
      await client.query(
        `CREATE TEMP TABLE ${temporaryTable} (${definitions.join(", ")})`,
      );

      for (const index of indexes) {
        const indexKeys = index.columns
          .map((column) => {
            if (column.kind === "expression") return `(${column.value})`;
            const opClass = column.opClass
              ? ` ${quoteQualifiedIdentifier(column.opClass)}`
              : "";
            return `${quoteIdentifier(column.value)}${opClass} ${column.order.toUpperCase()} NULLS ${column.nulls.toUpperCase()}`;
          })
          .join(", ");
        const unique = index.is_unique ? "UNIQUE " : "";
        const method = quoteIdentifier(index.method);
        const storageParameters = formatIndexStorageParameters(
          index.index_name,
          index.storage_parameters,
        );
        const predicate = index.predicate ? ` WHERE ${index.predicate}` : "";
        await client.query(
          `CREATE ${unique}INDEX ${quoteIdentifier(index.index_name)}
           ON pg_temp.${temporaryTable} USING ${method} (${indexKeys})${storageParameters}${predicate}`,
        );
      }

      const result = await client.query<{
        index_name: string;
        columns: string[];
        predicate: string | null;
        storage_parameters: string[] | null;
      }>(
        `SELECT
           index_relation.relname AS index_name,
           ARRAY(
             SELECT jsonb_build_array(
               pg_get_indexdef(index_data.indexrelid, key.position, true),
               operator_class_namespace.nspname,
               operator_class.opcname,
               (index_data.indoption[key.position - 1] & 1) <> 0,
               (index_data.indoption[key.position - 1] & 2) <> 0
             )::text
             FROM generate_series(1, index_data.indnkeyatts) AS key(position)
             JOIN pg_opclass operator_class
               ON operator_class.oid = index_data.indclass[key.position - 1]
             JOIN pg_namespace operator_class_namespace
               ON operator_class_namespace.oid = operator_class.opcnamespace
             ORDER BY key.position
            )::text[] AS columns,
           pg_get_expr(index_data.indpred, index_data.indrelid) AS predicate,
           COALESCE(
             (
               SELECT array_agg(option ORDER BY option)
               FROM unnest(index_relation.reloptions) AS option
             ),
             ARRAY[]::text[]
           ) AS storage_parameters
         FROM pg_index index_data
         JOIN pg_class index_relation
           ON index_relation.oid = index_data.indexrelid
         WHERE index_data.indrelid = (
           SELECT relation.oid
           FROM pg_class relation
           WHERE relation.relnamespace = pg_my_temp_schema()
             AND relation.relname = $1
         )`,
        [tableName],
      );
      for (const row of result.rows) {
        canonicalIndexes.set(
          `${firstIndex.schema_name}.${tableName}.${row.index_name}`,
          {
            columns: row.columns,
            predicate: row.predicate,
            storage_parameters: row.storage_parameters ?? [],
          },
        );
      }
      if (result.rows.length !== indexes.length) {
        throw new Error(
          `Could not normalize expected indexes for ${firstIndex.schema_name}.${tableName}.`,
        );
      }
    } finally {
      await client.query(`DROP TABLE IF EXISTS pg_temp.${temporaryTable}`);
    }
  }
  return canonicalIndexes;
}

function formatIndexStorageParameters(
  indexName: string,
  storageParameters: Record<string, unknown>,
): string {
  const entries = Object.entries(storageParameters);
  if (entries.length === 0) return "";

  const formattedEntries = entries.map(([name, value]) => {
    if (!/^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(name)) {
      throw new Error(
        `Cannot validate unsupported storage parameter ${name} for index ${indexName}.`,
      );
    }
    if (
      (typeof value !== "number" || !Number.isFinite(value)) &&
      typeof value !== "boolean" &&
      !(typeof value === "string" && /^[A-Za-z0-9_.$+-]+$/.test(value))
    ) {
      throw new Error(
        `Cannot validate unsupported value for storage parameter ${name} on index ${indexName}.`,
      );
    }
    return `${name}=${value}`;
  });

  return ` WITH (${formattedEntries.join(", ")})`;
}

async function getCanonicalExpectedChecks(
  client: PoolClient,
  expectedChecks: ExpectedCheck[],
): Promise<Map<string, string>> {
  const checksByTable = new Map<string, ExpectedCheck[]>();
  for (const check of expectedChecks) {
    const tableKey = `${check.schema_name}.${check.table_name}`;
    const checks = checksByTable.get(tableKey) ?? [];
    checks.push(check);
    checksByTable.set(tableKey, checks);
  }

  const canonicalChecks = new Map<string, string>();
  const temporaryTables: string[] = [];
  try {
    for (const checks of checksByTable.values()) {
      const tableName = checks[0].table_name;
      const columns = new Map<string, string>();
      for (const check of checks) {
        for (const column of check.columns) {
          columns.set(column.name, column.type);
        }
      }

      const temporaryTableName = tableName;
      temporaryTables.push(temporaryTableName);
      const definitions = [
        ...[...columns].map(
          ([name, type]) => `${quoteIdentifier(name)} ${type}`,
        ),
        ...checks.map(
          (check) =>
            `CONSTRAINT ${quoteIdentifier(check.constraint_name)} CHECK (${check.expression})`,
        ),
      ];
      await client.query(
        `CREATE TEMP TABLE ${quoteIdentifier(temporaryTableName)} (${definitions.join(", ")})`,
      );

      const result = await client.query<{
        constraint_name: string;
        expression: string;
      }>(
        `SELECT constraint_data.conname AS constraint_name,
                pg_get_expr(constraint_data.conbin, constraint_data.conrelid) AS expression
         FROM pg_constraint constraint_data
         WHERE constraint_data.conrelid = $1::regclass
           AND constraint_data.contype = 'c'`,
        [`pg_temp.${temporaryTableName}`],
      );
      for (const row of result.rows) {
        canonicalChecks.set(
          `${checks[0].schema_name}.${tableName}.${row.constraint_name}`,
          row.expression,
        );
      }

      if (result.rows.length !== checks.length) {
        throw new Error(
          `Could not normalize expected check constraints for ${checks[0].schema_name}.${tableName}.`,
        );
      }
    }
  } finally {
    for (const tableName of temporaryTables.reverse()) {
      await client.query(
        `DROP TABLE IF EXISTS pg_temp.${quoteIdentifier(tableName)}`,
      );
    }
  }

  return canonicalChecks;
}

function actionToPostgresCode(action: string | undefined): string {
  switch (action ?? "no action") {
    case "cascade":
      return "c";
    case "restrict":
      return "r";
    case "set null":
      return "n";
    case "set default":
      return "d";
    case "no action":
      return "a";
    default:
      throw new Error(`Unsupported foreign key action: ${action}`);
  }
}

function stripOuterParentheses(expression: string): string {
  let result = expression.trim();
  while (result.startsWith("(") && result.endsWith(")")) {
    let depth = 0;
    let inString = false;
    let wrapsExpression = true;
    for (let index = 0; index < result.length; index += 1) {
      const character = result[index];
      if (character === "'") {
        if (inString && result[index + 1] === "'") {
          index += 1;
          continue;
        }
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (character === "(") depth += 1;
      if (character === ")") {
        depth -= 1;
        if (depth === 0 && index < result.length - 1) {
          wrapsExpression = false;
          break;
        }
      }
    }
    if (!wrapsExpression || depth !== 0 || inString) break;
    result = result.slice(1, -1).trim();
  }
  return result;
}

function getPostgresStringLiteral(expression: string): string | undefined {
  const match = stripOuterParentheses(expression).match(
    /^'((?:[^']|'')*)'(?:\s*::[\s\S]+)?$/,
  );
  return match?.[1].replace(/''/g, "'");
}

function normalizeDefaultExpression(expression: string): string {
  const stripped = stripOuterParentheses(expression);
  const normalized = stripped.toLowerCase().replace(/\s+/g, " ").trim();
  if (
    /^(now\(\)|current_timestamp(?:\(\s*\d+\s*\))?|transaction_timestamp\(\))$/.test(
      normalized,
    )
  ) {
    return "now()";
  }

  let result = "";
  let quote: "'" | '"' | null = null;
  let pendingSpace = false;
  for (let index = 0; index < stripped.length; index += 1) {
    const character = stripped[index];
    if (quote !== null) {
      result += character;
      if (character === quote) {
        if (stripped[index + 1] === quote) {
          result += stripped[index + 1];
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (/\s/.test(character)) {
      pendingSpace = true;
      continue;
    }
    if (pendingSpace && result.length > 0) result += " ";
    pendingSpace = false;
    if (character === "'" || character === '"') {
      quote = character;
      result += character;
    } else {
      result += character.toLowerCase();
    }
  }
  return result;
}

function databaseDefaultMatches(
  actual: string,
  expected: DatabaseDefault,
): boolean {
  if (expected.kind === "expression") {
    return (
      normalizeDefaultExpression(actual) ===
      normalizeDefaultExpression(expected.value)
    );
  }

  const normalized = stripOuterParentheses(actual).trim().toLowerCase();
  if (expected.value === null) return normalized === "null";
  if (typeof expected.value === "string") {
    return getPostgresStringLiteral(actual) === expected.value;
  }
  if (typeof expected.value === "boolean") {
    const booleanValue = normalized.match(
      /^(true|false)(?:\s*::[\s\S]+)?$/,
    )?.[1];
    if (booleanValue) return (booleanValue === "true") === expected.value;
    const stringValue = getPostgresStringLiteral(actual)?.toLowerCase();
    if (stringValue === "t" || stringValue === "true") {
      return expected.value;
    }
    if (stringValue === "f" || stringValue === "false") {
      return !expected.value;
    }
    return false;
  }

  const numericValue = normalized.match(
    /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:\s*::[\s\S]+)?$/,
  )?.[1];
  return numericValue !== undefined && Number(numericValue) === expected.value;
}

function describeExpectedDatabaseDefault(expected: DatabaseDefault): string {
  if (expected.kind === "expression") return expected.value;
  if (typeof expected.value === "string") {
    return `'${expected.value.replace(/'/g, "''")}'`;
  }
  return String(expected.value);
}

export async function validateDatabaseSchema(
  client: PoolClient,
  schemaModule: object = schema,
): Promise<void> {
  const expected = getExpectedSchema(schemaModule);
  const missingObjects: string[] = [];

  const missingTables = await client.query<{ object: string }>(
    `WITH expected AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb)
         AS item(schema_name text, table_name text)
     )
     SELECT 'table ' || expected.schema_name || '.' || expected.table_name AS object
     FROM expected
     LEFT JOIN pg_namespace namespace
       ON namespace.nspname = expected.schema_name
     LEFT JOIN pg_class relation
       ON relation.relnamespace = namespace.oid
       AND relation.relname = expected.table_name
       AND relation.relkind IN ('r', 'p')
     WHERE relation.oid IS NULL`,
    [JSON.stringify(expected.tableObjects)],
  );
  missingObjects.push(...missingTables.rows.map((row) => row.object));

  const columnDefinitions = await client.query<{
    schema_name: string;
    table_name: string;
    column_name: string;
    column_type: string;
    type_schema: string | null;
    not_null: boolean;
    database_default: DatabaseDefault | null;
    actual_type: string | null;
    actual_type_schema: string | null;
    actual_not_null: boolean | null;
    actual_default: string | null;
  }>(
    `WITH expected AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb)
         AS item(
           schema_name text,
           table_name text,
           column_name text,
           column_type text,
           type_schema text,
           not_null boolean,
           database_default jsonb
         )
     )
     SELECT
       expected.schema_name,
       expected.table_name,
       expected.column_name,
       expected.column_type,
       expected.type_schema,
       expected.not_null,
       expected.database_default,
       format_type(actual_column.atttypid, actual_column.atttypmod) AS actual_type,
       actual_type_namespace.nspname AS actual_type_schema,
       actual_column.attnotnull AS actual_not_null,
       pg_get_expr(default_data.adbin, default_data.adrelid) AS actual_default
     FROM expected
     LEFT JOIN pg_namespace table_namespace
       ON table_namespace.nspname = expected.schema_name
     LEFT JOIN pg_class table_relation
       ON table_relation.relnamespace = table_namespace.oid
       AND table_relation.relname = expected.table_name
       AND table_relation.relkind IN ('r', 'p')
     LEFT JOIN pg_attribute actual_column
       ON actual_column.attrelid = table_relation.oid
       AND actual_column.attname = expected.column_name
       AND actual_column.attnum > 0
       AND NOT actual_column.attisdropped
     LEFT JOIN pg_type actual_type
       ON actual_type.oid = actual_column.atttypid
     LEFT JOIN pg_namespace actual_type_namespace
       ON actual_type_namespace.oid = actual_type.typnamespace
     LEFT JOIN pg_attrdef default_data
       ON default_data.adrelid = actual_column.attrelid
       AND default_data.adnum = actual_column.attnum`,
    [JSON.stringify(expected.columns)],
  );
  for (const column of columnDefinitions.rows) {
    const object = `column ${column.schema_name}.${column.table_name}.${column.column_name}`;
    if (column.actual_type === null) {
      missingObjects.push(object);
      continue;
    }

    const mismatches: string[] = [];
    if (
      column.actual_type !== column.column_type ||
      (column.type_schema !== null &&
        column.actual_type_schema !== column.type_schema)
    ) {
      const actualType =
        column.type_schema !== null && column.actual_type_schema !== null
          ? `${column.actual_type_schema}.${column.actual_type}`
          : column.actual_type;
      const expectedType =
        column.type_schema !== null
          ? `${column.type_schema}.${column.column_type}`
          : column.column_type;
      mismatches.push(`has type ${actualType}, expected ${expectedType}`);
    }
    if (column.actual_not_null !== column.not_null) {
      mismatches.push(
        `is ${column.actual_not_null ? "NOT NULL" : "nullable"}, expected ${
          column.not_null ? "NOT NULL" : "nullable"
        }`,
      );
    }

    if (column.database_default === null) {
      if (column.actual_default !== null) {
        mismatches.push(
          `has default ${column.actual_default}, expected no default`,
        );
      }
    } else if (
      column.actual_default === null ||
      !databaseDefaultMatches(column.actual_default, column.database_default)
    ) {
      mismatches.push(
        `has default ${column.actual_default ?? "no default"}, expected ${describeExpectedDatabaseDefault(
          column.database_default,
        )}`,
      );
    }

    if (mismatches.length > 0) {
      missingObjects.push(`${object} ${mismatches.join("; ")}`);
    }
  }

  const unexpectedColumns = await client.query<{ object: string }>(
    `WITH expected_tables AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb)
         AS item(schema_name text, table_name text)
     ),
     expected_columns AS (
       SELECT * FROM jsonb_to_recordset($2::jsonb)
         AS item(schema_name text, table_name text, column_name text)
     )
     SELECT
       'unexpected column ' || expected_tables.schema_name || '.'
       || expected_tables.table_name || '.' || actual_column.attname AS object
     FROM expected_tables
     JOIN pg_namespace table_namespace
       ON table_namespace.nspname = expected_tables.schema_name
     JOIN pg_class table_relation
       ON table_relation.relnamespace = table_namespace.oid
       AND table_relation.relname = expected_tables.table_name
       AND table_relation.relkind IN ('r', 'p')
     JOIN pg_attribute actual_column
       ON actual_column.attrelid = table_relation.oid
       AND actual_column.attnum > 0
       AND NOT actual_column.attisdropped
     LEFT JOIN expected_columns
       ON expected_columns.schema_name = expected_tables.schema_name
       AND expected_columns.table_name = expected_tables.table_name
       AND expected_columns.column_name = actual_column.attname
     WHERE expected_columns.column_name IS NULL`,
    [JSON.stringify(expected.tableObjects), JSON.stringify(expected.columns)],
  );
  missingObjects.push(...unexpectedColumns.rows.map((row) => row.object));

  const missingEnumLabels = await client.query<{ object: string }>(
    `WITH expected AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb)
         AS item(schema_name text, enum_name text, enum_labels text[])
     )
     SELECT 'enum label ' || expected.schema_name || '.' || expected.enum_name || '.' || label.value AS object
     FROM expected
     CROSS JOIN LATERAL unnest(expected.enum_labels) AS label(value)
     LEFT JOIN pg_namespace namespace
       ON namespace.nspname = expected.schema_name
     LEFT JOIN pg_type enum_type
       ON enum_type.typnamespace = namespace.oid
       AND enum_type.typname = expected.enum_name
       AND enum_type.typtype = 'e'
     LEFT JOIN pg_enum actual
       ON actual.enumtypid = enum_type.oid
       AND actual.enumlabel = label.value
     WHERE actual.oid IS NULL`,
    [JSON.stringify(expected.enums)],
  );
  missingObjects.push(...missingEnumLabels.rows.map((row) => row.object));

  const missingEnumTypes = await client.query<{
    schema_name: string;
    enum_name: string;
  }>(
    `WITH expected AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb)
         AS item(schema_name text, enum_name text, enum_labels text[])
     )
     SELECT expected.schema_name, expected.enum_name
     FROM expected
     LEFT JOIN pg_namespace namespace
       ON namespace.nspname = expected.schema_name
     LEFT JOIN pg_type enum_type
       ON enum_type.typnamespace = namespace.oid
       AND enum_type.typname = expected.enum_name
       AND enum_type.typtype = 'e'
     WHERE enum_type.oid IS NULL`,
    [JSON.stringify(expected.enums)],
  );
  missingObjects.push(
    ...missingEnumTypes.rows.map(
      (row) => `enum type ${row.schema_name}.${row.enum_name}`,
    ),
  );
  const missingEnumTypeNames = new Set(
    missingEnumTypes.rows.map((row) => `${row.schema_name}.${row.enum_name}`),
  );

  const unexpectedEnumLabels = await client.query<{ object: string }>(
    `WITH expected AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb)
         AS item(schema_name text, enum_name text, enum_labels text[])
     )
     SELECT 'unexpected enum label ' || expected.schema_name || '.' || expected.enum_name || '.' || actual.enumlabel AS object
     FROM expected
     JOIN pg_namespace namespace
       ON namespace.nspname = expected.schema_name
     JOIN pg_type enum_type
       ON enum_type.typnamespace = namespace.oid
       AND enum_type.typname = expected.enum_name
       AND enum_type.typtype = 'e'
     JOIN pg_enum actual
       ON actual.enumtypid = enum_type.oid
     LEFT JOIN LATERAL unnest(expected.enum_labels) AS label(value)
       ON label.value = actual.enumlabel
     WHERE label.value IS NULL`,
    [JSON.stringify(expected.enums)],
  );
  missingObjects.push(...unexpectedEnumLabels.rows.map((row) => row.object));

  const reorderedEnums = await client.query<{ object: string }>(
    `WITH expected AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb)
         AS item(schema_name text, enum_name text, enum_labels text[])
     ),
     actual AS (
       SELECT
         namespace.nspname AS schema_name,
         enum_type.typname AS enum_name,
         array_agg(enum_data.enumlabel::text ORDER BY enum_data.enumsortorder) AS enum_labels
       FROM pg_namespace namespace
       JOIN pg_type enum_type
         ON enum_type.typnamespace = namespace.oid
         AND enum_type.typtype = 'e'
       JOIN pg_enum enum_data ON enum_data.enumtypid = enum_type.oid
       GROUP BY namespace.nspname, enum_type.typname
     )
     SELECT
       'enum order ' || expected.schema_name || '.' || expected.enum_name
       || ' expected [' || array_to_string(expected.enum_labels, ', ')
       || '] but found [' || array_to_string(actual.enum_labels, ', ') || ']' AS object
     FROM expected
     JOIN actual
       ON actual.schema_name = expected.schema_name
       AND actual.enum_name = expected.enum_name
     WHERE actual.enum_labels IS DISTINCT FROM expected.enum_labels
       AND cardinality(actual.enum_labels) = cardinality(expected.enum_labels)
       AND NOT EXISTS (
         SELECT 1
         FROM unnest(expected.enum_labels) AS expected_label(value)
         WHERE NOT (expected_label.value = ANY(actual.enum_labels))
       )`,
    [JSON.stringify(expected.enums)],
  );
  missingObjects.push(...reorderedEnums.rows.map((row) => row.object));

  const indexesWithAvailableTypes = expected.indexes.filter(
    (index) =>
      !index.table_columns.some(
        (column) =>
          column.type_schema !== null &&
          missingEnumTypeNames.has(`${column.type_schema}.${column.type}`),
      ),
  );
  const canonicalIndexes = await getCanonicalExpectedIndexes(
    client,
    indexesWithAvailableTypes,
  );
  const expectedIndexes = indexesWithAvailableTypes.map((index) => {
    const canonical = canonicalIndexes.get(
      `${index.schema_name}.${index.table_name}.${index.index_name}`,
    );
    if (!canonical) {
      throw new Error(
        `Could not normalize expected index ${index.schema_name}.${index.index_name}.`,
      );
    }
    return {
      schema_name: index.schema_name,
      table_name: index.table_name,
      index_name: index.index_name,
      is_unique: index.is_unique,
      method: index.method,
      columns: canonical.columns,
      predicate: canonical.predicate,
      storage_parameters: canonical.storage_parameters,
    };
  });
  const missingIndexes = await client.query<{ object: string }>(
    `WITH expected AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb)
         AS item(
           schema_name text,
           table_name text,
           index_name text,
           is_unique boolean,
           method text,
            columns text[],
           predicate text,
           storage_parameters text[]
         )
     ),
     actual AS (
       SELECT
         table_namespace.nspname AS schema_name,
         index_relation.relname AS index_name,
         table_relation.relname AS table_name,
         index_data.indisunique AS is_unique,
         access_method.amname AS method,
          index_data.indisvalid AS is_valid,
          index_data.indisready AS is_ready,
          index_data.indisvalid AND index_data.indisready AS is_usable,
         COALESCE(
           (
             SELECT array_agg(option ORDER BY option)
             FROM unnest(index_relation.reloptions) AS option
           ),
           ARRAY[]::text[]
         ) AS storage_parameters,
         ARRAY(
            SELECT jsonb_build_array(
              pg_get_indexdef(index_data.indexrelid, key.position, true),
              operator_class_namespace.nspname,
              operator_class.opcname,
              (index_data.indoption[key.position - 1] & 1) <> 0,
              (index_data.indoption[key.position - 1] & 2) <> 0
            )::text
           FROM generate_series(1, index_data.indnkeyatts) AS key(position)
            JOIN pg_opclass operator_class
              ON operator_class.oid = index_data.indclass[key.position - 1]
            JOIN pg_namespace operator_class_namespace
              ON operator_class_namespace.oid = operator_class.opcnamespace
           ORDER BY key.position
          )::text[] AS columns,
         pg_get_expr(index_data.indpred, index_data.indrelid) AS predicate
       FROM pg_index index_data
       JOIN pg_class index_relation ON index_relation.oid = index_data.indexrelid
       JOIN pg_class table_relation ON table_relation.oid = index_data.indrelid
       JOIN pg_namespace table_namespace ON table_namespace.oid = table_relation.relnamespace
       JOIN pg_am access_method ON access_method.oid = index_relation.relam
     )
     SELECT 'index ' || expected.schema_name || '.' || expected.index_name
        || ' on ' || expected.schema_name || '.' || expected.table_name
        || CASE
             WHEN actual.index_name IS NOT NULL AND NOT actual.is_usable
             THEN ' (indisvalid=' || actual.is_valid::text
               || ', indisready=' || actual.is_ready::text || ')'
             ELSE ''
           END AS object
     FROM expected
     LEFT JOIN actual
       ON actual.schema_name = expected.schema_name
       AND actual.index_name = expected.index_name
       AND actual.table_name = expected.table_name
     WHERE actual.index_name IS NULL
       OR actual.is_unique IS DISTINCT FROM expected.is_unique
        OR actual.method IS DISTINCT FROM expected.method
        OR actual.storage_parameters IS DISTINCT FROM expected.storage_parameters
       OR actual.columns IS DISTINCT FROM expected.columns
       OR actual.predicate IS DISTINCT FROM expected.predicate
       OR NOT actual.is_usable`,
    [JSON.stringify(expectedIndexes)],
  );
  missingObjects.push(...missingIndexes.rows.map((row) => row.object));

  const canonicalChecks = await getCanonicalExpectedChecks(
    client,
    expected.expectedChecks,
  );
  const expectedConstraints = expected.constraints.map((constraint) => ({
    ...constraint,
    check_expression:
      constraint.constraint_type === "c"
        ? (canonicalChecks.get(
            `${constraint.schema_name}.${constraint.table_name}.${constraint.constraint_name}`,
          ) ?? null)
        : null,
  }));
  const missingConstraints = await client.query<{ object: string }>(
    `WITH expected AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb)
         AS item(
           schema_name text,
           table_name text,
           constraint_name text,
           constraint_type text,
           columns text[],
           referenced_schema text,
           referenced_table text,
           referenced_columns text[],
           on_delete text,
           on_update text,
           check_expression text
         )
     ),
     actual AS (
       SELECT
         table_namespace.nspname AS schema_name,
         table_relation.relname AS table_name,
         constraint_data.conname AS constraint_name,
         constraint_data.contype::text AS constraint_type,
          constraint_data.convalidated,
          pg_get_expr(constraint_data.conbin, constraint_data.conrelid) AS check_expression,
         ARRAY(
           SELECT attribute.attname
           FROM unnest(constraint_data.conkey) WITH ORDINALITY AS key(attnum, position)
           JOIN pg_attribute attribute
             ON attribute.attrelid = constraint_data.conrelid
             AND attribute.attnum = key.attnum
           ORDER BY key.position
         )::text[] AS columns,
         referenced_namespace.nspname AS referenced_schema,
         referenced_relation.relname AS referenced_table,
         ARRAY(
           SELECT attribute.attname
           FROM unnest(constraint_data.confkey) WITH ORDINALITY AS key(attnum, position)
           JOIN pg_attribute attribute
             ON attribute.attrelid = constraint_data.confrelid
             AND attribute.attnum = key.attnum
           ORDER BY key.position
         )::text[] AS referenced_columns,
         constraint_data.confdeltype::text AS on_delete,
         constraint_data.confupdtype::text AS on_update
       FROM pg_constraint constraint_data
       JOIN pg_class table_relation ON table_relation.oid = constraint_data.conrelid
       JOIN pg_namespace table_namespace ON table_namespace.oid = table_relation.relnamespace
       LEFT JOIN pg_class referenced_relation ON referenced_relation.oid = constraint_data.confrelid
       LEFT JOIN pg_namespace referenced_namespace ON referenced_namespace.oid = referenced_relation.relnamespace
        -- PostgreSQL 18 exposes column-level NOT NULL rules in pg_constraint;
        -- nullability is checked separately from Drizzle table constraints.
        WHERE constraint_data.contype <> 'n'
     )
     SELECT 'constraint ' || expected.schema_name || '.' || expected.table_name || '.' || expected.constraint_name AS object
     FROM expected
     LEFT JOIN actual
       ON actual.schema_name = expected.schema_name
       AND actual.table_name = expected.table_name
       AND actual.constraint_name = expected.constraint_name
       AND actual.constraint_type = expected.constraint_type
     WHERE actual.constraint_name IS NULL
       OR NOT actual.convalidated
       OR (
         expected.constraint_type IN ('p', 'u', 'f')
         AND actual.columns IS DISTINCT FROM expected.columns
       )
       OR (
         expected.constraint_type = 'f'
         AND (
           actual.referenced_schema IS DISTINCT FROM expected.referenced_schema
           OR actual.referenced_table IS DISTINCT FROM expected.referenced_table
           OR actual.referenced_columns IS DISTINCT FROM expected.referenced_columns
           OR actual.on_delete IS DISTINCT FROM expected.on_delete
           OR actual.on_update IS DISTINCT FROM expected.on_update
         )
        )
        OR (
          expected.constraint_type = 'c'
          AND actual.check_expression IS DISTINCT FROM expected.check_expression
        )`,
    [JSON.stringify(expectedConstraints)],
  );
  missingObjects.push(...missingConstraints.rows.map((row) => row.object));

  const unexpectedConstraints = await client.query<{ object: string }>(
    `WITH expected_tables AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb)
         AS item(schema_name text, table_name text)
     ),
     expected_constraints AS (
       SELECT * FROM jsonb_to_recordset($2::jsonb)
         AS item(schema_name text, table_name text, constraint_name text)
     ),
     actual_constraints AS (
       SELECT
         table_namespace.nspname AS schema_name,
         table_relation.relname AS table_name,
         constraint_data.conname AS constraint_name
       FROM pg_constraint constraint_data
       JOIN pg_class table_relation
         ON table_relation.oid = constraint_data.conrelid
       JOIN pg_namespace table_namespace
         ON table_namespace.oid = table_relation.relnamespace
        -- Keep NOT NULL catalog entries out of the table-level rule check.
        WHERE constraint_data.contype <> 'n'
     )
     SELECT
       'unexpected constraint ' || actual_constraints.schema_name || '.'
       || actual_constraints.table_name || '.' || actual_constraints.constraint_name AS object
     FROM actual_constraints
     JOIN expected_tables
       ON expected_tables.schema_name = actual_constraints.schema_name
       AND expected_tables.table_name = actual_constraints.table_name
     LEFT JOIN expected_constraints
       ON expected_constraints.schema_name = actual_constraints.schema_name
       AND expected_constraints.table_name = actual_constraints.table_name
       AND expected_constraints.constraint_name = actual_constraints.constraint_name
     WHERE expected_constraints.constraint_name IS NULL`,
    [JSON.stringify(expected.tableObjects), JSON.stringify(expectedConstraints)],
  );
  missingObjects.push(...unexpectedConstraints.rows.map((row) => row.object));

  if (missingObjects.length > 0) {
    throw new Error(
      `Database schema validation failed. Missing or incompatible database objects:\n${missingObjects
        .map((object) => ` - ${object}`)
        .join("\n")}`,
    );
  }
}

export async function applyDatabaseMigrations(
  migrationsFolder: string,
): Promise<void> {
  if (!pool) {
    throw new Error("Cannot run database migrations without DATABASE_URL.");
  }

  const client = await pool.connect();
  let lockAcquired = false;

  try {
    await client.query(
      "SELECT pg_advisory_lock(hashtext(current_database()), hashtext('orthotypikon-drizzle-migrations'))",
    );
    lockAcquired = true;
    await migrate(drizzle(client, { schema }), { migrationsFolder });
    await validateDatabaseSchema(client);
  } finally {
    try {
      if (lockAcquired) {
        await client.query(
          "SELECT pg_advisory_unlock(hashtext(current_database()), hashtext('orthotypikon-drizzle-migrations'))",
        );
      }
    } finally {
      client.release();
    }
  }
}
