import { getCalendarEntryForType, shiftDateKey } from '@/data/calendar2026';

export type FastLevel = 'strict' | 'oil' | 'fish' | 'none';

export type FastDay = {
  level: FastLevel;
  title: string;
  description: string;
  note?: string;
};

export type Recipe = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  level: FastLevel;
  ingredients: string[];
  steps: string[];
};

const specialDays: Record<string, FastDay> = {
  '2026-01-05': { level: 'strict', title: 'صوم الظهور الإلهي', description: 'صوم استعدادًا لعيد الظهور الإلهي، مع طعام نباتي بسيط.', note: 'تُراعى إرشادات الأب الروحي والحالة الصحية.' },
  '2026-01-18': { level: 'none', title: 'لا صوم اليوم', description: 'اليوم منحلّ من الصوم احتفالًا بعيد الظهور الإلهي.' },
  '2026-02-16': { level: 'strict', title: 'بدء الصوم الكبير', description: 'بداية مسيرة الصوم الكبير بالصلاة والتوبة والرحمة.', note: 'الصوم ممارسة روحية تُعاش بإرشاد الكنيسة.' },
  '2026-04-12': { level: 'none', title: 'عيد القيامة المجيدة', description: 'فرح القيامة: لا صوم اليوم.' },
  '2026-05-29': { level: 'strict', title: 'صوم الرسل', description: 'نعيش صوم الرسل بالصلاة وخدمة القريب.' },
  '2026-08-01': { level: 'strict', title: 'صوم السيدة العذراء', description: 'بداية صوم رقاد والدة الإله، وهو صوم نباتي.', note: 'تختلف بعض التفاصيل الرعائية بحسب الرعية.' },
  '2026-08-06': { level: 'fish', title: 'عيد تجلي الرب', description: 'يُسمح بالسمك احتفالًا بعيد التجلي.', note: 'السمك المسموح لا يلغي روح الصلاة والاعتدال.' },
  '2026-08-15': { level: 'none', title: 'رقاد والدة الإله', description: 'عيد مبارك، لا صوم اليوم.' },
  '2026-11-15': { level: 'strict', title: 'بدء صوم الميلاد', description: 'بداية الاستعداد لميلاد الرب بالصلاة والصوم والصدقة.' },
  '2026-12-25': { level: 'none', title: 'عيد ميلاد الرب', description: 'فرح الميلاد: لا صوم اليوم.' },
};

const recipes: Recipe[] = [
  {
    id: 'lentil-soup',
    title: 'شوربة العدس الدافئة',
    subtitle: 'غنية ومشبعة من دون زيت',
    time: '٣٥ دقيقة',
    level: 'strict',
    ingredients: ['كوب عدس أحمر', 'بصلة مفرومة', 'جزرتان', 'كمون وملح', '٦ أكواب ماء'],
    steps: ['اغسل العدس وضعه مع الخضار والماء في قدر.', 'اتركه يغلي ثم خفف النار حتى ينضج.', 'أضف الكمون والملح واطحنه حسب الرغبة.'],
  },
  {
    id: 'olive-pasta',
    title: 'معكرونة بالخضار والزيتون',
    subtitle: 'طبق سريع مسموح فيه الزيت',
    time: '٢٥ دقيقة',
    level: 'oil',
    ingredients: ['معكرونة', 'كوسا وفلفل ملون', 'زيت زيتون', 'زيتون أسود', 'ثوم وريحان'],
    steps: ['اسلق المعكرونة واحتفظ بقليل من ماء السلق.', 'شوّح الخضار بالزيت والثوم حتى تلين.', 'اخلط المعكرونة مع الخضار والزيتون والريحان.'],
  },
  {
    id: 'baked-fish',
    title: 'سمك مشوي بالليمون',
    subtitle: 'وصفة احتفالية خفيفة',
    time: '٣٠ دقيقة',
    level: 'fish',
    ingredients: ['قطعة سمك أبيض', 'ليمون', 'ثوم', 'زيت زيتون', 'بقدونس وملح'],
    steps: ['تبّل السمك بالليمون والثوم والملح.', 'ضعه في صينية مع القليل من الزيت.', 'اخبزه حتى ينضج وقدمه مع سلطة موسمية.'],
  },
];

export function getFastForDate(date: string, calendarType: 'gregorian' | 'julian'): FastDay {
  const canonicalDate = calendarType === 'julian' ? shiftDateKey(date, 13) : date;
  if (specialDays[canonicalDate]) return specialDays[canonicalDate];

  const entry = getCalendarEntryForType(date, calendarType);
  if (entry.fast?.includes('صوم كامل')) {
    return { level: 'strict', title: entry.fast, description: 'يوم صوم كامل بحسب الرزنامة الكنسية.' };
  }
  if (entry.fast) {
    return { level: 'strict', title: entry.fast, description: 'نعيش هذا الصوم بالصلاة والاعتدال والرحمة.' };
  }

  const weekday = new Date(`${canonicalDate}T12:00:00Z`).getUTCDay();
  if (weekday === 3 || weekday === 5) {
    return { level: 'oil', title: 'صوم الأربعاء والجمعة', description: 'صوم تذكاري أسبوعي، ويُسمح بالزيت في هذا الدليل المبدئي.' };
  }
  return { level: 'none', title: 'لا صوم اليوم', description: 'يمكن تناول الطعام باعتدال وشكر، مع الحفاظ على روح الصلاة.' };
}

export function getRecipesForFast(level: FastLevel) {
  if (level === 'none') return recipes;
  return recipes.filter((recipe) => recipe.level === level || (level === 'oil' && recipe.level === 'strict') || (level === 'fish' && recipe.level !== 'none'));
}

export const fastLevelLabels: Record<FastLevel, string> = {
  strict: 'صوم صارم',
  oil: 'السماح بالزيت',
  fish: 'السماح بالسمك',
  none: 'لا صوم',
};