import {
  getTableConfig,
  PgTable,
  type AnyPgTable,
} from "drizzle-orm/pg-core";

type DatabaseEnum = {
  enumName: string;
  enumValues: string[];
  schema: string | undefined;
};

function isDatabaseEnum(value: unknown): value is DatabaseEnum {
  if (typeof value !== "function") return false;

  const candidate = value as {
    enumName?: unknown;
    enumValues?: unknown;
    schema?: unknown;
  };
  return (
    typeof candidate.enumName === "string" &&
    Array.isArray(candidate.enumValues) &&
    candidate.enumValues.every((label) => typeof label === "string") &&
    (candidate.schema === undefined || typeof candidate.schema === "string")
  );
}

function isDatabaseTable(value: unknown): value is AnyPgTable {
  return value instanceof PgTable;
}

export function collectDatabaseTables(schemaModule: object): AnyPgTable[] {
  return Object.values(schemaModule).filter(isDatabaseTable);
}

export function collectDatabaseEnums(schemaModule: object): DatabaseEnum[] {
  const enums = new Map<string, DatabaseEnum>();
  const schemaValues = Object.values(schemaModule);
  const tableEnums = collectDatabaseTables(schemaModule)
    .flatMap((table) =>
      getTableConfig(table).columns.map((column) =>
        "enum" in column ? column.enum : undefined,
      ),
    );
  for (const value of [...schemaValues, ...tableEnums]) {
    if (!isDatabaseEnum(value)) continue;

    const key = `${value.schema ?? "public"}.${value.enumName}`;
    const existing = enums.get(key);
    if (
      existing &&
      (existing.enumValues.length !== value.enumValues.length ||
        existing.enumValues.some(
          (label, index) => label !== value.enumValues[index],
        ))
    ) {
      throw new Error(
        `Conflicting PostgreSQL enum definitions found for ${key}.`,
      );
    }
    enums.set(key, value);
  }

  if (enums.size === 0) {
    throw new Error("No PostgreSQL enums were found in the Drizzle schema.");
  }
  return [...enums.values()];
}