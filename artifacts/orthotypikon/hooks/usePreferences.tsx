import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

export type Language = 'ar' | 'en' | 'el';
export type ThemeMode = 'light' | 'dark' | 'system';
export type CalendarType = 'gregorian' | 'julian';

type PreferencesValue = {
  language: Language;
  themeMode: ThemeMode;
  calendarType: CalendarType;
  preferencesLoaded: boolean;
  hasCompletedSetup: boolean;
  setLanguage: (language: Language) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setCalendarType: (type: CalendarType) => void;
  completeSetup: (language: Language, calendarType: CalendarType) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);
const STORAGE_KEY = '@orthotypikon/preferences';
const WEB_COOKIE_KEY = 'orthotypikon_preferences';

function readWebPreferences() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  const cookie = document.cookie.split('; ').find((item) => item.startsWith(`${WEB_COOKIE_KEY}=`));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(WEB_COOKIE_KEY.length + 1));
  } catch {
    return null;
  }
}

function writeWebPreferences(value: string) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.cookie = `${WEB_COOKIE_KEY}=${encodeURIComponent(value)}; max-age=31536000; path=/; SameSite=Lax`;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [calendarType, setCalendarTypeState] = useState<CalendarType>('gregorian');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((storedValue) => {
      const value = storedValue ?? readWebPreferences();
      if (!value) {
        setPreferencesLoaded(true);
        return;
      }
      if (!storedValue) void AsyncStorage.setItem(STORAGE_KEY, value);
      try {
        const saved = JSON.parse(value) as Partial<{ language: Language; themeMode: ThemeMode; calendarType: CalendarType }>;
        if (saved.language) setLanguageState(saved.language);
        if (saved.themeMode) setThemeModeState(saved.themeMode);
        if (saved.calendarType) setCalendarTypeState(saved.calendarType);
        setHasCompletedSetup(true);
      } catch {
        // Ignore corrupt local preferences and keep safe defaults.
      }
      setPreferencesLoaded(true);
    });
  }, []);

  const persist = async (nextLanguage: Language, nextTheme: ThemeMode, nextCalendar: CalendarType) => {
    const value = JSON.stringify({ language: nextLanguage, themeMode: nextTheme, calendarType: nextCalendar });
    writeWebPreferences(value);
    await AsyncStorage.setItem(STORAGE_KEY, value);
  };
  const setLanguage = (next: Language) => {
    setLanguageState(next);
    void persist(next, themeMode, calendarType);
  };
  const setThemeMode = (next: ThemeMode) => {
    setThemeModeState(next);
    void persist(language, next, calendarType);
  };
  const setCalendarType = (next: CalendarType) => {
    setCalendarTypeState(next);
    void persist(language, themeMode, next);
  };
  const completeSetup = async (nextLanguage: Language, nextCalendar: CalendarType) => {
    await persist(nextLanguage, themeMode, nextCalendar);
    setLanguageState(nextLanguage);
    setCalendarTypeState(nextCalendar);
    setHasCompletedSetup(true);
  };
  const value = useMemo(() => ({
    language,
    themeMode,
    calendarType,
    preferencesLoaded,
    hasCompletedSetup,
    setLanguage,
    setThemeMode,
    setCalendarType,
    completeSetup,
  }), [language, themeMode, calendarType, preferencesLoaded, hasCompletedSetup]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used within PreferencesProvider');
  return value;
}

export const copy = {
  ar: { home: 'الرئيسية', calendar: 'الرزنامة', live: 'البث المباشر', library: 'المكتبة', more: 'المزيد', morning: 'صباح الخير', libraryTitle: 'المكتبة الروحية', moreTitle: 'المزيد', language: 'لغة التطبيق', calendarType: 'نوع التقويم', gregorian: 'الغريغوري الغربي', julian: 'اليولياني الشرقي', appearance: 'المظهر', system: 'النظام', light: 'فاتح', dark: 'داكن', arabic: 'العربية', english: 'English', greek: 'Ελληνικά', saved: 'يتم حفظ اختياراتك تلقائيًا' },
  en: { home: 'Home', calendar: 'Calendar', live: 'Live stream', library: 'Library', more: 'More', morning: 'Good morning', libraryTitle: 'Spiritual Library', moreTitle: 'More', language: 'App language', calendarType: 'Calendar system', gregorian: 'Western Gregorian', julian: 'Eastern Julian', appearance: 'Appearance', system: 'System', light: 'Light', dark: 'Dark', arabic: 'العربية', english: 'English', greek: 'Ελληνικά', saved: 'Your choices are saved automatically' },
  el: { home: 'Αρχική', calendar: 'Ημερολόγιο', live: 'Ζωντανή μετάδοση', library: 'Βιβλιοθήκη', more: 'Περισσότερα', morning: 'Καλημέρα', libraryTitle: 'Πνευματική βιβλιοθήκη', moreTitle: 'Περισσότερα', language: 'Γλώσσα εφαρμογής', calendarType: 'Ημερολογιακό σύστημα', gregorian: 'Δυτικό Γρηγοριανό', julian: 'Ανατολικό Ιουλιανό', appearance: 'Εμφάνιση', system: 'Σύστημα', light: 'Φωτεινό', dark: 'Σκοτεινό', arabic: 'العربية', english: 'English', greek: 'Ελληνικά', saved: 'Οι επιλογές σας αποθηκεύονται αυτόματα' },
} as const;

export const screenCopy = {
  ar: {
    home: {
      date: 'الثلاثاء، ٢٥ آب ٢٠٢٦', greeting: 'صباح الخير', morning: 'صباح الخير', evening: 'مساء الخير', subtitle: 'ليكن يومك مملوءًا بسلام رب المجد',
      todayOccasion: 'مناسبة اليوم', todayFeast: 'رقاد والدة الإله', todayDescription: 'تذكار مبارك نعيشه اليوم مع الكنيسة الجامعة',
      spiritualStation: 'محطتك الروحية', viewCalendar: 'عرض الرزنامة', todayVerse: 'آية اليوم · يوحنا ١٤:٢٧',
      verseTab: 'آية اليوم', gospelTab: 'إنجيل اليوم', gospelReadMore: 'انقر للمزيد', gospelListen: 'إضغط لسماع الانجيل',
      shareVerse: 'مشاركة الآية', shareGospel: 'مشاركة الإنجيل',
      shareCopiedTitle: 'تم نسخ النص', shareCopiedMessage: 'نُسخ النص إلى الحافظة. الصقه في التطبيق الذي تريد المشاركة فيه.',
      shareErrorTitle: 'تعذّرت المشاركة', shareErrorMessage: 'حاول مرة أخرى.',
      gospelStop: 'إيقاف الاستماع', gospelOpenSource: 'فتح المصدر', gospelLoading: 'جارٍ تحميل إنجيل اليوم…',
      gospelAudioLoading: 'جارٍ تجهيز القراءة الصوتية…', gospelAudioError: 'تعذّر تشغيل القراءة الصوتية. حاول مرة أخرى.',
      gospelClose: 'إغلاق',
      gospelSourceAvailable: 'قراءة إنجيل اليوم متاحة من المصدر الكنسي.',
      gospelSourceHint: 'افتح المصدر للاطلاع على القراءة الكاملة.', gospelUnavailable: 'لا يتوفر رابط قراءة اليوم الآن.',
      gospelLibraryHint: 'يمكنك استكشاف نصوص الإنجيل في المكتبة الروحية.',
      verse: '«سلامي أترك لكم. سلامي أعطيكم. ليس كما يعطي العالم أعطيكم أنا.»', gospelOfJohn: 'الإنجيل بحسب القديس يوحنا',
      explore: 'استكشف', all: 'الكل', todayReading: 'قراءة اليوم', openGospel: 'فتح الإنجيل', gospelMatthew: 'إنجيل متى', chapterDuration: 'الإصحاح الخامس · ٨ دقائق',
      services: ['الليتورجيا', 'البث المباشر', 'الصلوات', 'الإنجيل', 'الأخبار', 'المسبحة', 'بوصلة الشرق', 'دليل الأصوام', 'تعلم وتعمّق', 'أعياد الأسماء'],
       exploreItems: ['الإنجيل المسموع', 'المكتبة', 'المسبحة', 'المطبخ', 'السنكسار والقاموس', 'أعياد الأسماء', 'أماكن أرثوذكسية قريبة', 'الصلوات'],
    },
    places: {
      eyebrow: 'دليل الأماكن الأرثوذكسية', title: 'أماكن أرثوذكسية قريبة',
      subtitle: 'ابحث عن كنائس وأديرة ومدارس الروم الأرثوذكس بالقرب منك.',
       locationPrompt: 'اعثر على أماكن بالقرب منك', privacy: 'تُرسل إحداثياتك إلى دليل الأماكن وOpenStreetMap للبحث، ولا يحفظها التطبيق.',
      useLocation: 'استخدم موقعي', locating: 'جارٍ تحديد موقعك…', searching: 'جارٍ البحث عن أماكن قريبة…',
      locationUnavailable: 'تعذر تحديد موقعك. تحقق من إعدادات الموقع وحاول مجددًا.',
      permissionHelp: 'اسمح بالوصول إلى موقعك أثناء الاستخدام لعرض الأماكن القريبة.',
      permissionDenied: 'الوصول إلى الموقع متوقف. يمكنك تفعيله من إعدادات الجهاز.',
      browserPermissionHelp: 'اسمح للموقع في إعدادات المتصفح، أو ابحث باسم مدينة في الخرائط.',
      openSettings: 'فتح إعدادات الموقع', citySearch: 'البحث باسم مدينة',
      cityPlaceholder: 'اكتب مدينة أو منطقة للبحث في الخرائط',
      citySearchHint: 'يرسل اسم المدينة إلى خرائط Google لعرض النتائج، ولا يحفظه التطبيق.',
      radius: 'نطاق البحث', kilometers: 'كم', meters: 'م', all: 'الكل',
      churches: 'كنائس', monasteries: 'أديرة', schools: 'مدارس', results: 'الأماكن الأقرب',
      noResults: 'لم نعثر على أماكن مطابقة في هذا النطاق.',
      noFilteredResults: 'لا توجد أماكن من هذا النوع ضمن النتائج.',
       searchError: 'تعذر تحميل دليل الأماكن وبيانات الخرائط الآن. جرّب البحث في الخرائط أدناه.',
      mapSearch: 'البحث في الخرائط', mapSearchNeedsPlace: 'اسمح بالموقع أو اكتب مدينة للبحث في الخرائط.',
      mapOpenError: 'تعذر فتح الخرائط على هذا الجهاز.', directions: 'الاتجاهات',
       verified: 'تم التحقق', unverified: 'غير متحقق منه', jurisdiction: 'الجهة الكنسية',
       reportIncorrect: 'الإبلاغ عن خطأ', reportTitle: 'الإبلاغ عن تفاصيل غير صحيحة',
       reportDetails: 'أخبرنا ما التفاصيل التي تحتاج إلى تصحيح.', reportPlaceholder: 'العنوان أو الاسم أو الموقع غير صحيح…',
       reportSend: 'إرسال البلاغ', reportCancel: 'إلغاء', reportSent: 'شكرًا، وصل بلاغك إلى فريق مراجعة الدليل.',
       reportError: 'تعذر إرسال البلاغ الآن. حاول مرة أخرى لاحقًا.',
       attribution: 'يجمع هذا البحث بين دليل أماكن أرثوذكسية وبيانات OpenStreetMap التي يضيفها المجتمع؛ وقد تكون بعض النتائج غير مكتملة.',
    },
    news: {
      title: 'أخبار الكنيسة', subtitle: 'آخر الأخبار من المواقع الأرثوذكسية',
      seeAll: 'عرض الكل', loading: 'جارٍ تحميل الأخبار…', error: 'تعذر تحميل أخبار هذه المنطقة.',
      noArticles: 'لا توجد أخبار متاحة الآن.', sourcePending: 'سيتم ربط مصدر الأخبار قريبًا.',
      regions: { jordan: 'الأردن', syria: 'سوريا', lebanon: 'لبنان' },
    },
    synaxarion: {
      eyebrow: 'السنكسار', title: 'مناسبة اليوم', showAll: 'أظهر الكل', showMore: 'أظهر المزيد', showLess: 'أظهر أقل', today: 'مناسبة اليوم',
      pendingOccasion: 'بانتظار تفاصيل مناسبة اليوم', pendingSaint: 'سيتم عرض اسم القديس هنا', pendingDetails: 'سيتم ربط تفاصيل السنكسار والصورة من المصدر الخارجي قريبًا.',
    },
    calendar: {
      kicker: 'الرزنامة الكنسية', title: 'الرزنامة الليتورجية', detail: 'تفاصيل اليوم', saints: 'القديسون الذين نحتفل بهم',
      noOccasion: 'لا توجد مناسبة مسجلة لهذا اليوم.', noNames: 'لا توجد أسماء مسجلة لهذا اليوم.',
      western: 'الغريغوري الغربي', eastern: 'اليولياني الشرقي',
      months: ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'],
      weekdays: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
      dateWeekdays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    },
    library: {
      kicker: 'مصادر الإيمان والصلاة', title: 'المكتبة الروحية', subtitle: 'اختر موضوعًا لتتأمل وتقرأ وتتعمق', search: 'ابحث في المكتبة', swipeHint: 'اسحب للأعلى لاستكشاف المزيد',
      tools: 'أدوات روحية', topics: 'تثقف', prayers: 'صلوات',
      prayerSections: ['الإنجيل المسموع', 'صلوات يومية', 'صلوات متنوعة', 'ابتهالات', 'كنوز الرسائل'],
      toolTitles: ['مسبحة الصلاة', 'بوصلة الشرق', 'وصفات الطعام', 'السنكسار والقاموس', 'أعياد الأسماء', 'أماكن أرثوذكسية قريبة'],
      toolSubtitles: ['صلِّ مع كل عقدة', 'اتجاه الصلاة', 'وصفات منزلية', 'استمع وتعلّم', 'تذكيرات سنوية لأحبائك'],
      sections: ['آبائيات', 'الكتاب المقدس', 'اللاهوت والعقيدة', 'خدم الفصح العظيم', 'البدع والهرطقات', 'التاريخ الكنسي', 'الليتورجيا', 'حياة روحية', 'الحياة بعد الموت', 'أيقونات', 'سير حياة القديسين', 'الأسرة والتربية', 'كتب الخدم الإلهية', 'موسيقى', 'والدة الإله'],
    },
    more: {
      journey: 'رحلتك الروحية', journeyText: 'احفظ آياتك وصلواتك المفضلة', calendarDescriptionWestern: 'التاريخ المدني المتداول عالميًا',
      calendarDescriptionEastern: 'فرق ١٣ يومًا عن التقويم الغريغوري في ٢٠٢٦', prayerEase: 'سهولة الصلاة', prayerMode: 'وضع الصلاة',
      prayerModeText: 'قراءة بلا تشتيت', widget: 'ويدجت اليوم', widgetText: 'الآية والتاريخ والقديسون', version: 'نسخة ١.٠ · OrthoTypikon',
    },
    fasting: {
      eyebrow: 'المطبخ', title: 'وصفات الطعام',
      recipesToday: 'جميع الوصفات', recipes: 'وصفات', listHint: 'اختر أكلة لعرض المكونات وطريقة الطبخ',
      guidance: 'هذا الدليل مبدئي للتذكير والتنظيم، ولا يغني عن إرشاد الأب الروحي أو مراعاة الحالة الصحية. قد تختلف تفاصيل الصوم بحسب التقليد والرعية.',
      tapForDetails: 'اضغط لعرض التفاصيل', ingredients: 'المكونات', preparation: 'طريقة الطبخ', closeDetails: 'إغلاق تفاصيل الوصفة',
    },
    prayer: {
      eyebrow: 'أداة الصلاة اليومية', title: 'مسبحة الصلاة', introTitle: 'صلِّ بهدوء وحضور', introText: 'يا ربي يسوع المسيح، ارحمني أنا عبدك الخاطئ',
      introKicker: 'وقفة صلاة', introFooter: 'على مهلٍ، من القلب',
      completed: 'العقد المنجزة', of: 'من', next: 'صلِّ العقدة التالية', hint: 'صوت خفيف واهتزاز لمسي عند كل عقدة', reset: 'إعادة العداد',
      prayerText: '«يا ربي يسوع المسيح، ارحمني أنا عبدك الخاطئ»', audioTitle: 'صلاة يسوع', audioPlay: 'تشغيل الصلاة', audioPause: 'إيقاف الصلاة',
      audioLoading: 'جارٍ تجهيز المقطع الصوتي...', audioHint: 'يمكنك تشغيل الصلاة أو إيقافها في أي وقت أثناء المسبحة', audioFinished: 'انتهى المقطع — اضغط لإعادته',
      rosaryPickerLabel: 'اختر المسبحة', rosaryPickerPrompt: 'اختر صلاة المسبحة التي تريدها', rosaryPendingIntro: 'ستظهر كلمات هذه المسبحة عند إضافتها.', rosaryPendingAudio: 'لا يتوفر تسجيل صوتي لهذا الخيار بعد.',
    },
    prayerCollection: {
      eyebrow: 'من المكتبة الروحية', back: 'العودة إلى المكتبة', backToList: 'العودة إلى المجموعة',
      unavailableTitle: 'المجموعة غير متاحة', unavailableText: 'تعذر العثور على هذه المجموعة. ارجع إلى المكتبة واختر مجموعة أخرى.',
    },
    onboarding: {
      eyebrow: 'مرحبًا بك في OrthoTypikon', title: 'لنبدأ بإعداد التطبيق', subtitle: 'اختر اللغة والتقويم اللذين تفضلهما، ويمكنك تغييرهما لاحقًا من الإعدادات.',
      language: 'لغة التطبيق', calendar: 'نوع التقويم', gregorianDescription: 'التقويم الغربي المستخدم في معظم البلدان', julianDescription: 'التقويم الشرقي المتبع في التقليد الكنسي',
      continue: 'متابعة إلى التطبيق', saving: 'جارٍ حفظ اختياراتك...', saveError: 'تعذر حفظ الاختيارات. حاول مرة أخرى.',
    },
    compass: {
      eyebrow: 'زاوية هادئة للصلاة', title: 'بوصلة الشرق', pointEast: 'وجّه السهم نحو الشرق', waiting: 'بانتظار البوصلة',
      current: 'الاتجاه الحالي', webNotice: 'البوصلة متاحة على الهاتف الحقيقي. افتح التطبيق على جهازك لاستخدام مستشعر الاتجاه.',
      denied: 'تم رفض الصلاحية. افتح إعدادات الجهاز للسماح بالوصول إلى الموقع.', allowNotice: 'اسمح بالوصول إلى الموقع لقراءة اتجاه البوصلة. لا يتم حفظ موقعك.',
      openSettings: 'فتح الإعدادات', allow: 'السماح بالبوصلة', footer: 'للدقة الأفضل، أبعد الهاتف عن المعادن وحرّكه ببطء عند بدء القراءة.',
      directions: ['شمال', 'شمال شرقي', 'شرق', 'جنوب شرقي', 'جنوب', 'جنوب غربي', 'غرب', 'شمال غربي'],
    },
    learn: {
      eyebrow: 'المحتوى التفاعلي والتعليمي', title: 'تعلّم مع الكنيسة', audioTab: 'السنكسار الصوتي', iconTab: 'شرح الأيقونات', dictionaryTab: 'القاموس الطقسي',
      saintAudio: 'سيرة قديس اليوم · ٢–٣ دقائق', stop: 'إيقاف الاستماع', replay: 'تشغيل السنكسار مرة أخرى', listen: 'استمع إلى السنكسار',
      completedAudio: 'اكتملت محاولة التشغيل · اضغط للاستماع مجددًا', audioHint: 'قراءة صوتية عربية يمكنك سماعها أثناء التنقل',
      todayIcon: 'أيقونة اليوم', iconTitle: 'والدة الإله الفائقة القداسة', iconCaption: 'علامات النور والرجاء في الأيقونة',
      iconQuestion: 'ما الذي نراه في الأيقونة؟', search: 'ابحث عن مصطلح', noTerm: 'لا يوجد مصطلح مطابق.',
    },
    prayerMode: {
      eyebrow: 'تجربة هادئة بلا تشتيت', title: 'وضع الصلاة', heroTitle: 'وقت قصير للسكينة', heroText: 'فعّل الوضع الهادئ أثناء قراءة الصلوات أو الاستماع للإنجيل.',
      optionTitle: 'الوضع الهادئ داخل التطبيق', optionText: 'يقلل عناصر التشتيت ويحفظ اختيارك للجلسة القادمة.',
      info: 'لا تسمح أنظمة iOS وAndroid لتطبيق Expo بتفعيل وضع عدم الإزعاج تلقائيًا. بعد تفعيل الوضع هنا، يمكنك فتح إعدادات الجهاز لتشغيله يدويًا قبل بدء الصلاة.',
      openSettings: 'فتح إعدادات الجهاز', active: 'وضع الصلاة مفعّل — خذ نفسًا عميقًا وابدأ بهدوء.',
    },
    widget: {
      eyebrow: 'تجربة المستخدم والسهولة', title: 'ويدجت اليوم', subtitle: 'نفس المحتوى الذي يحدّثه الويدجت تلقائيًا على شاشة الهاتف',
      julian: 'اليولياني', verse: 'آية اليوم', note: 'الويدجت الأصلي جاهز لنظامي iOS وAndroid. يظهر بعد تثبيت نسخة أصلية من التطبيق؛ لا تعرضه Expo Go لأن امتدادات الشاشة الرئيسية لا تُحمّل داخله.',
    },
    live: {
      eyebrow: 'البث الكنسي المباشر', title: 'البث المباشر', subtitle: 'تابع قناة المحطة الأرثوذكسية مباشرة من جهازك',
      channel: 'المحطة الأرثوذكسية', status: 'على الهواء الآن', description: 'صلوات وترانيم وبرامج كنسية من المحطة الأرثوذكسية.', watch: 'مشاهدة البث المباشر',
      loading: 'جارٍ تحميل البث…', error: 'تعذر عرض البث داخل التطبيق.', openExternal: 'فتح القناة خارجيًا', note: 'يظهر البث داخل التطبيق مباشرة. استخدم الفتح الخارجي إذا منع الموقع التضمين.', back: 'العودة',
      radioTitle: 'راديو صوت الكنيسة', radioDescription: 'استمع إلى صوت الكنيسة من داخل التطبيق', radioPlaying: 'راديو صوت الكنيسة يعمل الآن', radioPlay: 'تشغيل صوت الكنيسة', radioStop: 'إيقاف الراديو', radioLoading: 'جارٍ تشغيل صوت الكنيسة…', radioError: 'تعذر تشغيل راديو صوت الكنيسة داخل التطبيق.',
    },
    hymn: { title: 'أستمع', play: 'أستمع', stop: 'أوقف الاستماع', loading: 'جارٍ التجهيز…', retry: 'إعادة التشغيل' },
    notFound: { title: 'هذه الشاشة غير موجودة.', home: 'العودة إلى الشاشة الرئيسية', back: 'رجوع' },
  },
  en: {
    home: {
      date: 'Tuesday, August 25, 2026', greeting: 'Good morning', morning: 'Good morning', evening: 'Good evening', subtitle: 'May your day be filled with peace',
      todayOccasion: "Today's occasion", todayFeast: 'Dormition of the Theotokos', todayDescription: 'A blessed remembrance we live today with the universal Church',
      spiritualStation: 'Your spiritual station', viewCalendar: 'View calendar', todayVerse: 'Verse of the day · John 14:27',
      verseTab: 'Verse of the Day', gospelTab: 'Gospel of the Day', gospelReadMore: 'Tap for more',
      shareVerse: 'Share verse', shareGospel: 'Share Gospel',
      shareCopiedTitle: 'Text copied', shareCopiedMessage: 'The text was copied. Paste it into the app you want to share with.',
      shareErrorTitle: 'Could not share', shareErrorMessage: 'Please try again.',
      gospelListen: 'Press to listen to the Gospel', gospelStop: 'Stop listening', gospelOpenSource: 'Open source', gospelClose: 'Close',
      gospelAudioLoading: 'Preparing the reading…', gospelAudioError: 'Could not play the reading. Try again.',
      gospelLoading: 'Loading today’s Gospel…', gospelSourceAvailable: "Today's Gospel reading is available from the Church source.",
      gospelSourceHint: 'Open the source to read the full passage.', gospelUnavailable: "Today's reading link is not available right now.",
      gospelLibraryHint: 'Browse Gospel texts in the spiritual library.',
      verse: '“Peace I leave with you, My peace I give you. Not as the world gives do I give you.”', gospelOfJohn: 'The Gospel according to Saint John',
      explore: 'Explore', all: 'All', todayReading: "Today's reading", openGospel: 'Open Gospel', gospelMatthew: 'Gospel of Matthew', chapterDuration: 'Chapter five · 8 minutes',
       services: ['Liturgy', 'Live stream', 'Prayers', 'Gospel', 'News', 'Rosary', 'East compass', 'Fasting guide', 'Learn & grow', 'Name days'],
         exploreItems: ['Audio Gospel', 'Library', 'Prayer rosary', 'Kitchen', 'Synaxarion & glossary', 'Name days', 'Nearby Orthodox places', 'Prayers'],
    },
    places: {
      eyebrow: 'Orthodox places directory', title: 'Nearby Orthodox places',
      subtitle: 'Find Greek Orthodox churches, monasteries, and schools nearby.',
      locationPrompt: 'Find places near you',
       privacy: 'Your coordinates are sent to the places directory and OpenStreetMap for search, and are not stored by the app.',
      useLocation: 'Use my location', locating: 'Finding your location…',
      searching: 'Searching nearby places…',
      locationUnavailable: 'Could not get your location. Check location settings and try again.',
      permissionHelp: 'Allow location access while using the app to find nearby places.',
      permissionDenied: 'Location access is off. You can enable it in your device settings.',
      browserPermissionHelp: 'Allow location in your browser settings, or search Maps by city.',
      openSettings: 'Open location settings', citySearch: 'Search by city',
      cityPlaceholder: 'Enter a city or area to search in Maps',
      citySearchHint: 'Your city is sent to Google Maps for results and is not stored by the app.',
      radius: 'Search radius', kilometers: 'km', meters: 'm', all: 'All',
      churches: 'Churches', monasteries: 'Monasteries', schools: 'Schools',
      results: 'Nearest places',
      noResults: 'No matching places were found in this radius.',
      noFilteredResults: 'There are no places of this type in the current results.',
       searchError: 'The places directory and map data could not be loaded. Try the map search below.',
      mapSearch: 'Search in Maps',
      mapSearchNeedsPlace: 'Allow location or enter a city to search in Maps.',
      mapOpenError: 'Could not open Maps on this device.', directions: 'Directions',
       verified: 'Verified', unverified: 'Not verified', jurisdiction: 'Church jurisdiction',
       reportIncorrect: 'Report a problem', reportTitle: 'Report incorrect details',
       reportDetails: 'Tell us which listing details need correction.', reportPlaceholder: 'The address, name, or location is incorrect…',
       reportSend: 'Send report', reportCancel: 'Cancel', reportSent: 'Thank you. Your report was sent for review.',
       reportError: 'Your report could not be sent. Please try again later.',
       attribution: 'Results combine an Orthodox places directory with community-maintained OpenStreetMap data; some listings may be incomplete.',
    },
    news: {
      title: 'Church news', subtitle: 'The latest updates from Orthodox websites in each region',
      seeAll: 'View all', loading: 'Loading news…', error: 'This region’s news could not be loaded.',
      noArticles: 'No news is available right now.', sourcePending: 'A news source will be connected soon.',
      regions: { jordan: 'Jordan', syria: 'Syria', lebanon: 'Lebanon' },
    },
    synaxarion: {
      eyebrow: 'Synaxarion', title: "Today's occasion", showAll: 'Show all', showMore: 'Show more', showLess: 'Show less', today: "Today's occasion",
      pendingOccasion: "Today's occasion will appear here", pendingSaint: 'The saint’s name will appear here', pendingDetails: 'Synaxarion details and the image will be connected from the external source soon.',
    },
    calendar: {
      kicker: 'Church calendar', title: 'Liturgical calendar', detail: 'Day details', saints: 'Saints we commemorate',
      noOccasion: 'No occasion is recorded for this day.', noNames: 'No names are recorded for this day.',
      western: 'Western Gregorian', eastern: 'Eastern Julian',
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      dateWeekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    },
    library: {
      kicker: 'Resources for faith and prayer', title: 'Spiritual library', subtitle: 'Choose a topic to reflect, read, and go deeper', search: 'Search the library', swipeHint: 'Swipe up to explore more',
      tools: 'Spiritual tools', topics: 'Learn', prayers: 'Prayers',
      prayerSections: ['Audio Gospel', 'Daily prayers', 'Various prayers', 'Supplications', 'Treasures of the Epistles'],
      toolTitles: ['Prayer rosary', 'East compass', 'Food recipes', 'Synaxarion & glossary', 'Name days', 'Nearby Orthodox places'],
      toolSubtitles: ['Pray with every bead', 'Direction of prayer', 'Home cooking', 'Listen and learn', 'Annual reminders for loved ones'],
      sections: ['Patristics', 'Holy Bible', 'Theology & doctrine', 'Saintly service', 'Innovations & Heresies', 'Church history', 'Liturgy', 'Spiritual life', 'Life after death', 'Icons', 'Lives of the saints', 'Family & education', 'Divine service books', 'Music', 'Theotokos'],
    },
    more: {
      journey: 'Your spiritual journey', journeyText: 'Save your favorite verses and prayers', calendarDescriptionWestern: 'The civil calendar used worldwide',
      calendarDescriptionEastern: '13 days behind the Gregorian calendar in 2026', prayerEase: 'Prayer made easier', prayerMode: 'Prayer mode',
      prayerModeText: 'Distraction-free reading', widget: "Today's widget", widgetText: 'Verse, date, and saints', version: 'Version 1.0 · OrthoTypikon',
    },
    fasting: {
      eyebrow: 'Kitchen', title: 'Food recipes',
      recipesToday: 'All recipes', recipes: 'recipes', listHint: 'Choose a dish to see its ingredients and method',
      guidance: 'This is a preliminary guide for reflection and organization. It does not replace guidance from your spiritual father or consideration of your health. Fasting details may vary by tradition and parish.',
      tapForDetails: 'Tap to view details', ingredients: 'Ingredients', preparation: 'Method', closeDetails: 'Close recipe details',
    },
    prayer: {
      eyebrow: 'Daily prayer tool', title: 'Prayer rosary', introTitle: 'Pray with quiet presence', introText: 'With each bead, repeat the Jesus Prayer with awareness and love.',
      introKicker: 'A moment of prayer', introFooter: 'Slowly, from the heart',
      completed: 'Beads completed', of: 'of', next: 'Pray the next bead', hint: 'A gentle sound and haptic touch with each bead', reset: 'Reset counter',
      prayerText: '“My Lord Jesus Christ, have mercy on me.”', audioTitle: 'Jesus Prayer', audioPlay: 'Play prayer', audioPause: 'Pause prayer',
      audioLoading: 'Preparing the audio...', audioHint: 'Play or pause the prayer at any time while using the rosary', audioFinished: 'The recording ended — tap to replay',
      rosaryPickerLabel: 'Choose a rosary', rosaryPickerPrompt: 'Choose the rosary prayer you want', rosaryPendingIntro: 'The words for this rosary will appear once they are added.', rosaryPendingAudio: 'No recording is available for this option yet.',
    },
    prayerCollection: {
      eyebrow: 'From the spiritual library', back: 'Back to the library', backToList: 'Back to the collection',
      unavailableTitle: 'Collection unavailable', unavailableText: 'This collection could not be found. Return to the library and choose another collection.',
    },
    onboarding: {
      eyebrow: 'Welcome to OrthoTypikon', title: 'Let’s set up your app', subtitle: 'Choose your preferred language and calendar. You can change them later in settings.',
      language: 'App language', calendar: 'Calendar system', gregorianDescription: 'The Western calendar used in most countries', julianDescription: 'The Eastern calendar followed in the church tradition',
      continue: 'Continue to the app', saving: 'Saving your choices...', saveError: 'Could not save your choices. Please try again.',
    },
    compass: {
      eyebrow: 'A quiet corner for prayer', title: 'East compass', pointEast: 'Point the arrow east', waiting: 'Waiting for compass',
      current: 'Current direction', webNotice: 'The compass is available on a real phone. Open the app on your device to use the direction sensor.',
      denied: 'Permission was denied. Open device settings to allow location access.', allowNotice: 'Allow location access to read the compass direction. Your location is not saved.',
      openSettings: 'Open settings', allow: 'Allow compass', footer: 'For best accuracy, keep the phone away from metal and move it slowly when reading begins.',
      directions: ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'],
    },
    learn: {
      eyebrow: 'Interactive and educational content', title: 'Learn with the Church', audioTab: 'Audio synaxarion', iconTab: 'Icon explanation', dictionaryTab: 'Liturgical glossary',
      saintAudio: 'Saint of the day · 2–3 minutes', stop: 'Stop listening', replay: 'Play synaxarion again', listen: 'Listen to the synaxarion',
      completedAudio: 'Playback finished · tap to listen again', audioHint: 'Audio reading you can hear while on the move',
      todayIcon: 'Icon of the day', iconTitle: 'The Most Holy Theotokos', iconCaption: 'Signs of light and hope in the icon',
      iconQuestion: 'What do we see in the icon?', search: 'Search for a term', noTerm: 'No matching term.',
    },
    prayerMode: {
      eyebrow: 'A quiet, distraction-free experience', title: 'Prayer mode', heroTitle: 'A little time for stillness', heroText: 'Enable quiet mode while reading prayers or listening to the Gospel.',
      optionTitle: 'Quiet mode in the app', optionText: 'Reduces distractions and remembers your choice for the next session.',
      info: 'iOS and Android do not allow an Expo app to enable Do Not Disturb automatically. After enabling this mode, open device settings to turn it on manually before prayer.',
      openSettings: 'Open device settings', active: 'Prayer mode is on — take a deep breath and begin gently.',
    },
    widget: {
      eyebrow: 'Ease and everyday experience', title: "Today's widget", subtitle: 'The same content the widget updates automatically on your phone',
      julian: 'Julian', verse: 'Verse of the day', note: 'The native widget is ready for iOS and Android. It appears after installing a native app build; Expo Go cannot load home-screen extensions.',
    },
    live: {
      eyebrow: 'Live church broadcast', title: 'Live stream', subtitle: 'Watch the Orthodox Station live from your device',
      channel: 'Orthodox Station', status: 'Live now', description: 'Prayers, hymns, and church programs from the Orthodox Station.', watch: 'Watch live stream',
       loading: 'Loading the live stream…', error: 'The stream could not be shown inside the app.', openExternal: 'Open channel externally', note: 'The stream appears directly inside the app. Use the external option if the site blocks embedding.', back: 'Back',
       radioTitle: 'Voice of the Church Radio', radioDescription: 'Listen to Voice of the Church inside the app', radioPlaying: 'Voice of the Church Radio is playing now', radioPlay: 'Play Voice of the Church', radioStop: 'Stop radio', radioLoading: 'Starting Voice of the Church…', radioError: 'Voice of the Church Radio could not be played inside the app.',
    },
      hymn: { title: 'Morning hymn', play: 'Listen', stop: 'Stop hymn', loading: 'Preparing…', retry: 'Try again' },
    notFound: { title: "This screen doesn't exist.", home: 'Go to home screen', back: 'Back' },
  },
  el: {
    home: {
      date: 'Τρίτη, 25 Αυγούστου 2026', greeting: 'Καλημέρα', morning: 'Καλημέρα', evening: 'Καλησπέρα', subtitle: 'Είθε η ημέρα σας να είναι γεμάτη ειρήνη',
      todayOccasion: 'Η σημερινή εορτή', todayFeast: 'Κοίμηση της Θεοτόκου', todayDescription: 'Μια ευλογημένη ανάμνηση που ζούμε σήμερα με την οικουμενική Εκκλησία',
      spiritualStation: 'Ο πνευματικός σας σταθμός', viewCalendar: 'Προβολή ημερολογίου', todayVerse: 'Στίχος της ημέρας · Ιωάννης 14:27',
      verseTab: 'Στίχος της ημέρας', gospelTab: 'Ευαγγέλιο της ημέρας', gospelReadMore: 'Πατήστε για περισσότερα',
      shareVerse: 'Κοινοποίηση στίχου', shareGospel: 'Κοινοποίηση Ευαγγελίου',
      shareCopiedTitle: 'Το κείμενο αντιγράφηκε', shareCopiedMessage: 'Το κείμενο αντιγράφηκε. Επικολλήστε το στην εφαρμογή που θέλετε να χρησιμοποιήσετε.',
      shareErrorTitle: 'Δεν ήταν δυνατή η κοινοποίηση', shareErrorMessage: 'Δοκιμάστε ξανά.',
      gospelListen: 'Πατήστε για να ακούσετε το Ευαγγέλιο', gospelStop: 'Διακοπή ακρόασης', gospelOpenSource: 'Άνοιγμα πηγής', gospelClose: 'Κλείσιμο',
      gospelAudioLoading: 'Προετοιμασία ανάγνωσης…', gospelAudioError: 'Δεν ήταν δυνατή η αναπαραγωγή. Δοκιμάστε ξανά.',
      gospelLoading: 'Φόρτωση του σημερινού Ευαγγελίου…', gospelSourceAvailable: 'Το σημερινό Ευαγγέλιο είναι διαθέσιμο στην εκκλησιαστική πηγή.',
      gospelSourceHint: 'Ανοίξτε την πηγή για να διαβάσετε ολόκληρο το κείμενο.', gospelUnavailable: 'Ο σύνδεσμος της σημερινής ανάγνωσης δεν είναι διαθέσιμος τώρα.',
      gospelLibraryHint: 'Εξερευνήστε κείμενα των Ευαγγελίων στην πνευματική βιβλιοθήκη.',
      verse: '«Ειρήνη αφήνω σε σας, τη δική μου ειρήνη σας δίνω. Όχι όπως ο κόσμος δίνει.»', gospelOfJohn: 'Το Ευαγγέλιο κατά τον Άγιο Ιωάννη',
      explore: 'Εξερευνήστε', all: 'Όλα', todayReading: 'Η σημερινή ανάγνωση', openGospel: 'Άνοιγμα Ευαγγελίου', gospelMatthew: 'Ευαγγέλιο του Ματθαίου', chapterDuration: 'Κεφάλαιο πέντε · 8 λεπτά',
       services: ['Λειτουργία', 'Ζωντανή μετάδοση', 'Προσευχές', 'Ευαγγέλιο', 'Νέα', 'Ροδάριο', 'Πυξίδα ανατολής', 'Οδηγός νηστείας', 'Μάθετε & εμβαθύνετε', 'Ονομαστικές εορτές'],
         exploreItems: ['Ακουστό Ευαγγέλιο', 'Βιβλιοθήκη', 'Ροδάριο προσευχής', 'Μαγειρική', 'Συναξάρι & γλωσσάρι', 'Ονομαστικές εορτές', 'Κοντινοί ορθόδοξοι χώροι', 'Προσευχές'],
    },
    places: {
      eyebrow: 'Κατάλογος ορθόδοξων χώρων', title: 'Κοντινοί ορθόδοξοι χώροι',
      subtitle: 'Βρείτε κοντινές ελληνορθόδοξες εκκλησίες, μονές και σχολεία.',
      locationPrompt: 'Βρείτε χώρους κοντά σας',
       privacy: 'Οι συντεταγμένες σας αποστέλλονται στον κατάλογο χώρων και στο OpenStreetMap για την αναζήτηση και δεν αποθηκεύονται στην εφαρμογή.',
      useLocation: 'Χρήση τοποθεσίας', locating: 'Εντοπισμός τοποθεσίας…',
      searching: 'Αναζήτηση κοντινών χώρων…',
      locationUnavailable: 'Δεν ήταν δυνατός ο εντοπισμός. Ελέγξτε τις ρυθμίσεις τοποθεσίας.',
      permissionHelp: 'Επιτρέψτε την πρόσβαση στην τοποθεσία κατά τη χρήση της εφαρμογής.',
      permissionDenied: 'Η πρόσβαση στην τοποθεσία είναι απενεργοποιημένη. Ενεργοποιήστε την στις ρυθμίσεις.',
      browserPermissionHelp: 'Επιτρέψτε την τοποθεσία στις ρυθμίσεις του προγράμματος περιήγησης ή αναζητήστε πόλη στους Χάρτες.',
      openSettings: 'Ρυθμίσεις τοποθεσίας', citySearch: 'Αναζήτηση ανά πόλη',
      cityPlaceholder: 'Πληκτρολογήστε πόλη ή περιοχή για αναζήτηση στους Χάρτες',
      citySearchHint: 'Η πόλη αποστέλλεται στους Χάρτες Google για τα αποτελέσματα και δεν αποθηκεύεται στην εφαρμογή.',
      radius: 'Ακτίνα αναζήτησης', kilometers: 'χλμ.', meters: 'μ.', all: 'Όλα',
      churches: 'Εκκλησίες', monasteries: 'Μονές', schools: 'Σχολεία',
      results: 'Κοντινότεροι χώροι',
      noResults: 'Δεν βρέθηκαν αντίστοιχοι χώροι σε αυτή την ακτίνα.',
      noFilteredResults: 'Δεν υπάρχουν χώροι αυτού του τύπου στα αποτελέσματα.',
       searchError: 'Δεν ήταν δυνατή η φόρτωση του καταλόγου και των χαρτών. Δοκιμάστε την αναζήτηση στους Χάρτες παρακάτω.',
      mapSearch: 'Αναζήτηση στους Χάρτες',
      mapSearchNeedsPlace: 'Επιτρέψτε την τοποθεσία ή πληκτρολογήστε πόλη για αναζήτηση στους Χάρτες.',
      mapOpenError: 'Δεν ήταν δυνατό το άνοιγμα των Χαρτών σε αυτή τη συσκευή.',
      directions: 'Οδηγίες',
       verified: 'Επαληθευμένο', unverified: 'Μη επαληθευμένο', jurisdiction: 'Εκκλησιαστική δικαιοδοσία',
       reportIncorrect: 'Αναφορά προβλήματος', reportTitle: 'Αναφορά λανθασμένων στοιχείων',
       reportDetails: 'Πείτε μας ποια στοιχεία της καταχώρισης χρειάζονται διόρθωση.', reportPlaceholder: 'Η διεύθυνση, το όνομα ή η τοποθεσία είναι λανθασμένα…',
       reportSend: 'Αποστολή αναφοράς', reportCancel: 'Ακύρωση', reportSent: 'Ευχαριστούμε. Η αναφορά σας στάλθηκε για έλεγχο.',
       reportError: 'Δεν ήταν δυνατή η αποστολή της αναφοράς. Δοκιμάστε ξανά αργότερα.',
       attribution: 'Τα αποτελέσματα συνδυάζουν ορθόδοξο κατάλογο χώρων με δεδομένα του OpenStreetMap από την κοινότητα· ορισμένες καταχωρίσεις μπορεί να είναι ελλιπείς.',
    },
    news: {
      title: 'Εκκλησιαστικές ειδήσεις', subtitle: 'Οι τελευταίες ενημερώσεις από ορθόδοξους ιστότοπους κάθε περιοχής',
      seeAll: 'Προβολή όλων', loading: 'Φόρτωση ειδήσεων…', error: 'Δεν ήταν δυνατή η φόρτωση των ειδήσεων αυτής της περιοχής.',
      noArticles: 'Δεν υπάρχουν διαθέσιμες ειδήσεις τώρα.', sourcePending: 'Η πηγή ειδήσεων θα συνδεθεί σύντομα.',
      regions: { jordan: 'Ιορδανία', syria: 'Συρία', lebanon: 'Λίβανος' },
    },
    synaxarion: {
      eyebrow: 'Συναξάρι', title: 'Η σημερινή εορτή', showAll: 'Προβολή όλων', showMore: 'Διαβάστε περισσότερα', showLess: 'Εμφάνιση λιγότερων', today: 'Η σημερινή εορτή',
      pendingOccasion: 'Η σημερινή εορτή θα εμφανιστεί εδώ', pendingSaint: 'Το όνομα του Αγίου θα εμφανιστεί εδώ', pendingDetails: 'Οι λεπτομέρειες και η εικόνα του Συναξαρίου θα συνδεθούν σύντομα από εξωτερική πηγή.',
    },
    calendar: {
      kicker: 'Εκκλησιαστικό ημερολόγιο', title: 'Λειτουργικό ημερολόγιο', detail: 'Λεπτομέρειες ημέρας', saints: 'Οι Άγιοι που τιμούμε',
      noOccasion: 'Δεν υπάρχει καταχωρημένη εορτή για αυτή την ημέρα.', noNames: 'Δεν υπάρχουν καταχωρημένα ονόματα για αυτή την ημέρα.',
      western: 'Δυτικό Γρηγοριανό', eastern: 'Ανατολικό Ιουλιανό',
      months: ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'],
      weekdays: ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'],
      dateWeekdays: ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'],
    },
    library: {
      kicker: 'Πηγές πίστης και προσευχής', title: 'Πνευματική βιβλιοθήκη', subtitle: 'Επιλέξτε ένα θέμα για στοχασμό, ανάγνωση και εμβάθυνση', search: 'Αναζήτηση στη βιβλιοθήκη', swipeHint: 'Σύρετε προς τα πάνω για περισσότερα',
      tools: 'Πνευματικά εργαλεία', topics: 'Μάθετε', prayers: 'Προσευχές',
      prayerSections: ['Ακουστό Ευαγγέλιο', 'Καθημερινές προσευχές', 'Διάφορες προσευχές', 'Δεήσεις', 'Θησαυροί των Επιστολών'],
      toolTitles: ['Ροδάριο προσευχής', 'Πυξίδα ανατολής', 'Συνταγές φαγητών', 'Συναξάρι & γλωσσάρι', 'Ονομαστικές εορτές', 'Κοντινοί ορθόδοξοι χώροι'],
      toolSubtitles: ['Προσευχηθείτε με κάθε κόμπο', 'Κατεύθυνση προσευχής', 'Σπιτικές συνταγές', 'Ακούστε και μάθετε', 'Ετήσιες υπενθυμίσεις για αγαπημένα πρόσωπα'],
      sections: ['Πατρολογία', 'Αγία Γραφή', 'Θεολογία & δόγμα', 'Διακονία Αγίων', 'Ύμνοι', 'Εκκλησιαστική ιστορία', 'Λειτουργία', 'Πνευματική ζωή', 'Η ζωή μετά τον θάνατο', 'Εικόνες', 'Βίοι Αγίων', 'Οικογένεια & παιδεία', 'Βιβλία ακολουθιών', 'Μουσική', 'Θεοτόκος'],
    },
    more: {
      journey: 'Το πνευματικό σας ταξίδι', journeyText: 'Αποθηκεύστε αγαπημένους στίχους και προσευχές', calendarDescriptionWestern: 'Το πολιτικό ημερολόγιο που χρησιμοποιείται παγκοσμίως',
      calendarDescriptionEastern: '13 ημέρες πίσω από το Γρηγοριανό το 2026', prayerEase: 'Ευκολότερη προσευχή', prayerMode: 'Λειτουργία προσευχής',
      prayerModeText: 'Ανάγνωση χωρίς περισπασμούς', widget: 'Γραφικό στοιχείο ημέρας', widgetText: 'Στίχος, ημερομηνία και Άγιοι', version: 'Έκδοση 1.0 · OrthoTypikon',
    },
    fasting: {
      eyebrow: 'Κουζίνα', title: 'Συνταγές φαγητών',
      recipesToday: 'Όλες οι συνταγές', recipes: 'συνταγές', listHint: 'Επιλέξτε ένα πιάτο για τα υλικά και την εκτέλεση',
      guidance: 'Αυτός ο οδηγός είναι προκαταρκτικός και προσφέρεται για υπενθύμιση και οργάνωση· δεν αντικαθιστά την καθοδήγηση του πνευματικού σας ή την προσοχή στην κατάσταση της υγείας σας. Οι λεπτομέρειες της νηστείας μπορεί να διαφέρουν ανάλογα με την παράδοση και την ενορία.',
      tapForDetails: 'Πατήστε για λεπτομέρειες', ingredients: 'Υλικά', preparation: 'Εκτέλεση', closeDetails: 'Κλείσιμο λεπτομερειών συνταγής',
    },
    prayer: {
      eyebrow: 'Καθημερινό εργαλείο προσευχής', title: 'Ροδάριο προσευχής', introTitle: 'Προσευχηθείτε με ηρεμία', introText: 'Με κάθε κόμπο, επαναλάβετε την ευχή του Ιησού με επίγνωση και αγάπη.',
      introKicker: 'Στιγμή προσευχής', introFooter: 'Αργά, από καρδιάς',
      completed: 'Ολοκληρωμένοι κόμποι', of: 'από', next: 'Προσευχηθείτε στον επόμενο κόμπο', hint: 'Ήπιος ήχος και απτική ανάδραση σε κάθε κόμπο', reset: 'Επαναφορά μετρητή',
      prayerText: '«Κύριε Ιησού Χριστέ, ελέησόν με τον αμαρτωλό.»', audioTitle: 'Ευχή του Ιησού', audioPlay: 'Αναπαραγωγή προσευχής', audioPause: 'Παύση προσευχής',
      audioLoading: 'Προετοιμασία ήχου...', audioHint: 'Αναπαραγάγετε ή διακόψτε την προσευχή οποιαδήποτε στιγμή', audioFinished: 'Η ηχογράφηση τελείωσε — πατήστε για επανάληψη',
      rosaryPickerLabel: 'Επιλέξτε κομποσχοίνι', rosaryPickerPrompt: 'Επιλέξτε το κομποσχοίνι που θέλετε να προσευχηθείτε', rosaryPendingIntro: 'Τα λόγια αυτού του κομποσχοινιού θα εμφανιστούν όταν προστεθούν.', rosaryPendingAudio: 'Δεν υπάρχει ακόμη ηχογράφηση για αυτή την επιλογή.',
    },
    prayerCollection: {
      eyebrow: 'Από την πνευματική βιβλιοθήκη', back: 'Πίσω στη βιβλιοθήκη', backToList: 'Πίσω στη συλλογή',
      unavailableTitle: 'Η συλλογή δεν είναι διαθέσιμη', unavailableText: 'Δεν ήταν δυνατή η εύρεση αυτής της συλλογής. Επιστρέψτε στη βιβλιοθήκη και επιλέξτε άλλη συλλογή.',
    },
    onboarding: {
      eyebrow: 'Καλώς ήρθατε στο OrthoTypikon', title: 'Ας ρυθμίσουμε την εφαρμογή', subtitle: 'Επιλέξτε τη γλώσσα και το ημερολόγιο που προτιμάτε. Μπορείτε να τα αλλάξετε αργότερα στις ρυθμίσεις.',
      language: 'Γλώσσα εφαρμογής', calendar: 'Ημερολογιακό σύστημα', gregorianDescription: 'Το δυτικό ημερολόγιο που χρησιμοποιείται στις περισσότερες χώρες', julianDescription: 'Το ανατολικό ημερολόγιο της εκκλησιαστικής παράδοσης',
      continue: 'Συνέχεια στην εφαρμογή', saving: 'Αποθήκευση επιλογών...', saveError: 'Δεν ήταν δυνατή η αποθήκευση. Δοκιμάστε ξανά.',
    },
    compass: {
      eyebrow: 'Ήσυχη γωνιά για προσευχή', title: 'Πυξίδα ανατολής', pointEast: 'Στρέψτε το βέλος προς την ανατολή', waiting: 'Αναμονή πυξίδας',
      current: 'Τρέχουσα κατεύθυνση', webNotice: 'Η πυξίδα είναι διαθέσιμη σε πραγματικό τηλέφωνο. Ανοίξτε την εφαρμογή στη συσκευή σας για τον αισθητήρα κατεύθυνσης.',
      denied: 'Η άδεια απορρίφθηκε. Ανοίξτε τις ρυθμίσεις για πρόσβαση στην τοποθεσία.', allowNotice: 'Επιτρέψτε την πρόσβαση στην τοποθεσία για την πυξίδα. Η τοποθεσία σας δεν αποθηκεύεται.',
      openSettings: 'Άνοιγμα ρυθμίσεων', allow: 'Ενεργοποίηση πυξίδας', footer: 'Για μεγαλύτερη ακρίβεια, κρατήστε το τηλέφωνο μακριά από μέταλλα και κινήστε το αργά.',
      directions: ['Βορράς', 'Βορειοανατολικά', 'Ανατολή', 'Νοτιοανατολικά', 'Νότος', 'Νοτιοδυτικά', 'Δύση', 'Βορειοδυτικά'],
    },
    learn: {
      eyebrow: 'Διαδραστικό και εκπαιδευτικό περιεχόμενο', title: 'Μάθετε με την Εκκλησία', audioTab: 'Ηχητικό συναξάρι', iconTab: 'Ερμηνεία εικόνων', dictionaryTab: 'Λειτουργικό γλωσσάρι',
      saintAudio: 'Ο Άγιος της ημέρας · 2–3 λεπτά', stop: 'Διακοπή ακρόασης', replay: 'Αναπαραγωγή ξανά', listen: 'Ακούστε το συναξάρι',
      completedAudio: 'Η ακρόαση ολοκληρώθηκε · πατήστε για ξανά', audioHint: 'Ηχητική ανάγνωση που μπορείτε να ακούσετε στον δρόμο',
      todayIcon: 'Η εικόνα της ημέρας', iconTitle: 'Η Υπεραγία Θεοτόκος', iconCaption: 'Σημεία φωτός και ελπίδας στην εικόνα',
      iconQuestion: 'Τι βλέπουμε στην εικόνα;', search: 'Αναζήτηση όρου', noTerm: 'Δεν βρέθηκε αντίστοιχος όρος.',
    },
    prayerMode: {
      eyebrow: 'Ήσυχη εμπειρία χωρίς περισπασμούς', title: 'Λειτουργία προσευχής', heroTitle: 'Λίγος χρόνος για γαλήνη', heroText: 'Ενεργοποιήστε την ήσυχη λειτουργία όταν διαβάζετε προσευχές ή ακούτε το Ευαγγέλιο.',
      optionTitle: 'Ήσυχη λειτουργία στην εφαρμογή', optionText: 'Μειώνει τους περισπασμούς και θυμάται την επιλογή σας.',
      info: 'Το iOS και το Android δεν επιτρέπουν στην Expo να ενεργοποιεί αυτόματα τη Μην ενοχλείτε. Μετά την ενεργοποίηση, ανοίξτε τις ρυθμίσεις για χειροκίνητη ενεργοποίηση πριν την προσευχή.',
      openSettings: 'Άνοιγμα ρυθμίσεων συσκευής', active: 'Η λειτουργία προσευχής είναι ενεργή — πάρτε βαθιά ανάσα και ξεκινήστε ήρεμα.',
    },
    widget: {
      eyebrow: 'Ευκολία και καθημερινή εμπειρία', title: 'Γραφικό στοιχείο ημέρας', subtitle: 'Το ίδιο περιεχόμενο που ενημερώνεται αυτόματα στην οθόνη σας',
      julian: 'Ιουλιανό', verse: 'Στίχος της ημέρας', note: 'Το εγγενές γραφικό στοιχείο είναι έτοιμο για iOS και Android. Εμφανίζεται μετά από εγγενή εγκατάσταση· το Expo Go δεν φορτώνει επεκτάσεις αρχικής οθόνης.',
    },
    live: {
      eyebrow: 'Ζωντανή εκκλησιαστική μετάδοση', title: 'Ζωντανή μετάδοση', subtitle: 'Παρακολουθήστε ζωντανά τον Ορθόδοξο Σταθμό',
      channel: 'Ορθόδοξος Σταθμός', status: 'Σε ζωντανή μετάδοση', description: 'Προσευχές, ύμνοι και εκκλησιαστικά προγράμματα από τον Ορθόδοξο Σταθμό.', watch: 'Παρακολούθηση ζωντανά',
       loading: 'Φόρτωση ζωντανής μετάδοσης…', error: 'Η μετάδοση δεν εμφανίζεται μέσα στην εφαρμογή.', openExternal: 'Άνοιγμα εξωτερικά', note: 'Η μετάδοση εμφανίζεται απευθείας στην εφαρμογή. Χρησιμοποιήστε την εξωτερική επιλογή αν ο ιστότοπος αποκλείει την ενσωμάτωση.', back: 'Πίσω',
        radioTitle: 'Ραδιόφωνο «Φωνή της Εκκλησίας»', radioDescription: 'Ακούστε τη Φωνή της Εκκλησίας μέσα από την εφαρμογή', radioPlaying: 'Το ραδιόφωνο παίζει τώρα', radioPlay: 'Αναπαραγωγή Φωνής της Εκκλησίας', radioStop: 'Διακοπή ραδιοφώνου', radioLoading: 'Έναρξη Φωνής της Εκκλησίας…', radioError: 'Το ραδιόφωνο «Φωνή της Εκκλησίας» δεν μπόρεσε να αναπαραχθεί μέσα στην εφαρμογή.',
    },
      hymn: { title: 'Πρωινός ύμνος', play: 'Ακούστε', stop: 'Διακοπή ύμνου', loading: 'Προετοιμασία…', retry: 'Δοκιμή ξανά' },
    notFound: { title: 'Αυτή η οθόνη δεν υπάρχει.', home: 'Επιστροφή στην αρχική', back: 'Πίσω' },
  },
} as const;

export function useI18n() {
  const { language } = usePreferences();
  return { language, t: screenCopy[language] };
}