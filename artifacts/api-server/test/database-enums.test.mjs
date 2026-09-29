import assert from "node:assert/strict";
import { pgEnum, pgTable } from "drizzle-orm/pg-core";
import * as schema from "../../../lib/db/src/schema/index.ts";
import { collectDatabaseEnums } from "../../../lib/db/src/schema/enums.ts";
import test from "node:test";

test("enum types used by new table columns are included in startup validation", () => {
  const futureEnum = pgEnum("future_startup_check", ["first", "second"]);
  const futureTable = pgTable("future_enum_table", {
    status: futureEnum("status"),
  });
  const enums = collectDatabaseEnums({ ...schema, futureTable });

  assert.deepEqual(
    enums.find((enumType) => enumType.enumName === "future_startup_check"),
    futureEnum,
  );
});