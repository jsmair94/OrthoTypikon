export type JanuaryFastingSymbol =
  | 'oilWine'
  | 'wine'
  | 'zafar'
  | 'fish'
  | 'noMarriage'
  | 'greatHours';

export type JanuaryService =
  | 'chrysostomLiturgy'
  | 'basilLiturgy'
  | 'greatHoursNoLiturgy';

export type JanuaryFastingDay = {
  fast?: true;
  symbols?: readonly JanuaryFastingSymbol[];
  services?: readonly JanuaryService[];
};

// Transcribed from the supplied January 2026 Eastern-calendar table.
// These are displayed Eastern date keys; Gregorian data remains separate.
export const januaryFasting2026: Record<string, JanuaryFastingDay> = {
  '2026-01-01': { fast: true, symbols: ['noMarriage'] },
  '2026-01-02': { fast: true, symbols: ['noMarriage', 'oilWine'] },
  '2026-01-03': { fast: true, symbols: ['noMarriage', 'oilWine'] },
  '2026-01-04': { fast: true, symbols: ['noMarriage', 'oilWine'] },
  '2026-01-05': { fast: true, symbols: ['noMarriage', 'oilWine'] },
  '2026-01-06': {
    fast: true,
    symbols: ['noMarriage', 'oilWine', 'greatHours'],
    services: ['chrysostomLiturgy'],
  },
  '2026-01-07': {
    symbols: ['zafar'],
    services: ['chrysostomLiturgy'],
  },
  '2026-01-09': { symbols: ['zafar'] },
  '2026-01-14': {
    symbols: ['zafar'],
    services: ['basilLiturgy'],
  },
  '2026-01-16': {
    symbols: ['zafar', 'greatHours'],
    services: ['greatHoursNoLiturgy'],
  },
  '2026-01-18': {
    fast: true,
    symbols: ['noMarriage', 'oilWine'],
    services: ['chrysostomLiturgy'],
  },
  '2026-01-19': {
    symbols: ['oilWine'],
    services: ['basilLiturgy'],
  },
  '2026-01-21': { fast: true, symbols: ['oilWine', 'fish'] },
  '2026-01-23': { fast: true, symbols: ['oilWine', 'fish'] },
  '2026-01-28': { fast: true },
  '2026-01-30': { fast: true, symbols: ['oilWine'] },
};

export function getJanuaryFastingForDate(date: string) {
  return date.startsWith('2026-01-') ? januaryFasting2026[date] : undefined;
}