export type CalendarType = "gregorian" | "julian";

type DateParts = { year: number; month: number; day: number };

function parseParts(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function isLeapYear(year: number, calendarType: CalendarType): boolean {
  return calendarType === "julian"
    ? year % 4 === 0
    : year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function isValidCalendarDate(value: string, calendarType: CalendarType): boolean {
  const parts = parseParts(value);
  if (!parts || parts.month < 1 || parts.month > 12 || parts.day < 1) return false;
  const days = [31, isLeapYear(parts.year, calendarType) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return parts.day <= days[parts.month - 1];
}

export function isValidMonth(value: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return Boolean(match && Number(match[2]) >= 1 && Number(match[2]) <= 12);
}

function julianDay(parts: DateParts, calendarType: CalendarType): number {
  const a = Math.floor((14 - parts.month) / 12);
  const year = parts.year + 4800 - a;
  const month = parts.month + 12 * a - 3;
  const common =
    parts.day +
    Math.floor((153 * month + 2) / 5) +
    365 * year +
    Math.floor(year / 4);
  return calendarType === "gregorian"
    ? common - Math.floor(year / 100) + Math.floor(year / 400) - 32045
    : common - 32083;
}

function fromJulianDay(dayNumber: number, calendarType: CalendarType): DateParts {
  if (calendarType === "julian") {
    const c = dayNumber + 32082;
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor((1461 * d) / 4);
    const m = Math.floor((5 * e + 2) / 153);
    return {
      day: e - Math.floor((153 * m + 2) / 5) + 1,
      month: m + 3 - 12 * Math.floor(m / 10),
      year: d - 4800 + Math.floor(m / 10),
    };
  }

  const a = dayNumber + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

function format(parts: DateParts): string {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function toCanonicalDate(value: string, calendarType: CalendarType): string {
  if (calendarType === "gregorian") return value;
  const parts = parseParts(value);
  if (!parts) throw new Error("Invalid date");
  return format(fromJulianDay(julianDay(parts, "julian"), "gregorian"));
}

export function fromCanonicalDate(value: string, calendarType: CalendarType): string {
  if (calendarType === "gregorian") return value;
  const parts = parseParts(value);
  if (!parts) throw new Error("Invalid date");
  return format(fromJulianDay(julianDay(parts, "gregorian"), "julian"));
}

export function monthBounds(month: string, calendarType: CalendarType) {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  const start = `${String(year).padStart(4, "0")}-${String(monthNumber).padStart(2, "0")}-01`;
  const end = `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`;
  return {
    start: toCanonicalDate(start, calendarType),
    end: toCanonicalDate(end, calendarType),
  };
}