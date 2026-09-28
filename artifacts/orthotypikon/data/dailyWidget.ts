import { getCalendarEntryForType, shiftDateKey } from '@/data/calendar2026';
import type { CalendarType } from '@/hooks/usePreferences';

export const DAILY_VERSE = '«سلامي أترك لكم. سلامي أعطيكم.»';
export const DAILY_VERSE_REFERENCE = 'يوحنا ١٤:٢٧';

const arabicMonths = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];

export type DailyWidgetContent = {
  civilDateKey: string;
  julianDateKey: string;
  displayDate: string;
  verse: string;
  verseReference: string;
  saints: string[];
  feast?: string;
};

export function dateKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDailyWidgetContent(date = new Date(), calendarType: CalendarType = 'gregorian'): DailyWidgetContent {
  const civilDateKey = dateKeyFromDate(date);
  const julianDateKey = shiftDateKey(civilDateKey, -13);
  const displayDateKey = calendarType === 'julian' ? julianDateKey : civilDateKey;
  const entry = getCalendarEntryForType(displayDateKey, calendarType);
  const saints = entry.saints.length ? entry.saints : ['قديسو اليوم بحسب السنكسار'];
  const [, month, day] = displayDateKey.split('-').map(Number);
  return {
    civilDateKey,
    julianDateKey,
    displayDate: `${day} ${arabicMonths[month - 1]} ${displayDateKey.slice(0, 4)}`,
    verse: DAILY_VERSE,
    verseReference: DAILY_VERSE_REFERENCE,
    saints,
    feast: entry.feast,
  };
}