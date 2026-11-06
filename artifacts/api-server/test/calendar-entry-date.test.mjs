import assert from "node:assert/strict";
import test from "node:test";
import {
  UpdateAdminCalendarEntryBody,
  UpsertAdminCalendarEntryBody,
} from "@workspace/api-zod";
import { isValidCalendarDate } from "../src/lib/dates.ts";

const entryBody = (gregorianDate, calendarSystem) => ({
  gregorianDate,
  calendarSystem,
  locale: "en",
  feastTitle: null,
  fastingTitle: null,
  liturgy: null,
  color: null,
  commemoratedSaints: ["Saint Basil", "Saint Gregory"],
  commemoratedSaintBios: ["Biography 1", "Biography 2"],
  saintIds: [],
  publicationStatus: "draft",
});

test("admin create and edit schemas preserve calendar-system date strings", () => {
  for (const schema of [UpsertAdminCalendarEntryBody, UpdateAdminCalendarEntryBody]) {
    const gregorian = schema.parse(entryBody("2000-02-29", "gregorian"));
    assert.equal(gregorian.gregorianDate, "2000-02-29");
    assert.equal(isValidCalendarDate(gregorian.gregorianDate, gregorian.calendarSystem), true);

    const julian = schema.parse(entryBody("2026-04-01", "julian"));
    assert.equal(julian.gregorianDate, "2026-04-01");
    assert.equal(isValidCalendarDate(julian.gregorianDate, julian.calendarSystem), true);
    assert.deepEqual(gregorian.commemoratedSaints, ["Saint Basil", "Saint Gregory"]);
    assert.deepEqual(gregorian.commemoratedSaintBios, ["Biography 1", "Biography 2"]);
  }
  assert.throws(
    () => UpsertAdminCalendarEntryBody.parse({
      ...entryBody("2000-02-29", "gregorian"),
      commemoratedSaints: ["1", "2", "3", "4", "5"],
    }),
  );
});
