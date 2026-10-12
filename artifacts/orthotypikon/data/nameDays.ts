import { getCalendarEntryForType } from './calendar2026';
import { saintDays } from './saints';

export type CalendarSystem = 'gregorian' | 'julian';

export type NameDayChoice = {
  id: string;
  name: string;
  month: number;
  day: number;
  kind: 'saint' | 'feast';
  calendarType: CalendarSystem;
};

export type SavedName = {
  id: string;
  person: string;
  saintId?: string;
  observance?: NameDayChoice;
  notificationId?: string;
};

const genericSaintLabel = 'القديسون المذكورون في تقليد الكنيسة';

export function getNameDayChoices(date: string, calendarType: CalendarSystem): NameDayChoice[] {
  const match = date.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`Invalid name-day calendar date: ${date}`);

  const month = Number(match[1]);
  const day = Number(match[2]);
  const entry = getCalendarEntryForType(date, calendarType);
  const choices: NameDayChoice[] = [];

  if (entry.feast?.trim()) {
    choices.push({
      id: `${date}-feast`,
      name: entry.feast,
      month,
      day,
      kind: 'feast',
      calendarType,
    });
  }

  entry.saints.forEach((name, index) => {
    if (!name.trim() || name === genericSaintLabel) return;
    choices.push({
      id: `${date}-saint-${index}`,
      name,
      month,
      day,
      kind: 'saint',
      calendarType,
    });
  });

  return choices;
}

export function getSavedNameChoice(name: SavedName): NameDayChoice {
  if (name.observance) return name.observance;
  const saint = saintDays.find((item) => item.id === name.saintId) ?? saintDays[0];
  return {
    id: saint.id,
    name: saint.name,
    month: saint.month,
    day: saint.day,
    kind: 'saint',
    calendarType: 'julian',
  };
}

export function getAnnualReminderDate(choice: Pick<NameDayChoice, 'month' | 'day'>) {
  return { month: choice.month, day: choice.day };
}