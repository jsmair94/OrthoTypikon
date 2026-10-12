import type { Language } from '@/hooks/usePreferences';

export const ROSARY_PRAYER_IDS = [
  'lord-jesus',
  'theotokos',
  'john-baptist',
  'archangels',
  'departed',
  'paisios',
] as const;

export type RosaryPrayerId = (typeof ROSARY_PRAYER_IDS)[number];

export type RosaryPrayerOption = {
  id: RosaryPrayerId;
  title: string;
};

export const ROSARY_PRAYER_CONTENT_ID: RosaryPrayerId = 'lord-jesus';

export const rosaryPrayerOptions: Record<Language, RosaryPrayerOption[]> = {
  ar: [
    { id: 'lord-jesus', title: 'مسبحة الرب يسوع' },
    { id: 'theotokos', title: 'مسبحة السيدة العذراء' },
    { id: 'john-baptist', title: 'مسبحة السابق يوحنا المعمدان' },
    { id: 'archangels', title: 'مسبحة رؤساء الملائكة' },
    { id: 'departed', title: 'مسبحة الراقدين' },
    { id: 'paisios', title: 'مسبحة القديس باييسيوس' },
  ],
  en: [
    { id: 'lord-jesus', title: 'Jesus Prayer Rosary' },
    { id: 'theotokos', title: 'Rosary of the Virgin Mary' },
    { id: 'john-baptist', title: 'Rosary of St. John the Baptist' },
    { id: 'archangels', title: 'Rosary of the Archangels' },
    { id: 'departed', title: 'Rosary for the Departed' },
    { id: 'paisios', title: 'Rosary of St. Paisios' },
  ],
  el: [
    { id: 'lord-jesus', title: 'Κομποσχοίνι του Κυρίου Ιησού' },
    { id: 'theotokos', title: 'Κομποσχοίνι της Παναγίας' },
    { id: 'john-baptist', title: 'Κομποσχοίνι του Αγίου Ιωάννη του Προδρόμου' },
    { id: 'archangels', title: 'Κομποσχοίνι των Αρχαγγέλων' },
    { id: 'departed', title: 'Κομποσχοίνι υπέρ των κεκοιμημένων' },
    { id: 'paisios', title: 'Κομποσχοίνι του Αγίου Παϊσίου' },
  ],
};
