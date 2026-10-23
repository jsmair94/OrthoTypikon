import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/usePreferences';
import { getPrayerCollection } from '@/data/prayerCollections';
import { BibleAudioControl } from '@/components/BibleAudioControl';

type Testament = 'old' | 'new';
type Language = 'ar' | 'en' | 'el';
type BibleSection = { id: string; icon: React.ComponentProps<typeof Feather>['name']; book?: boolean };
const sections: Record<Testament, BibleSection[]> = {
  old: [
    'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth',
    '1-samuel', '2-samuel', '1-kings', '2-kings', '1-chronicles', '2-chronicles', 'ezra',
    'nehemiah', 'esther', 'job', 'psalms', 'proverbs', 'ecclesiastes', 'song-of-solomon',
    'isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos',
    'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi',
  ].map((id) => ({ id: `book-${id}`, icon: 'book-open', book: true })),
  new: [
    'matthew', 'mark', 'luke', 'john', 'acts', 'romans', '1-corinthians', '2-corinthians',
    'galatians', 'ephesians', 'philippians', 'colossians', '1-thessalonians',
    '2-thessalonians', '1-timothy', '2-timothy', 'titus', 'philemon', 'hebrews',
    'james', '1-peter', '2-peter', '1-john', '2-john', '3-john', 'jude', 'revelation',
  ].map((id) => ({ id: `book-${id}`, icon: 'book-open', book: true })),
};

const bibleBookNames: Record<Language, Record<string, string>> = {
  ar: {
    'book-genesis': 'التكوين', 'book-exodus': 'الخروج', 'book-leviticus': 'اللاويين',
    'book-numbers': 'العدد', 'book-deuteronomy': 'التثنية', 'book-joshua': 'يشوع',
    'book-judges': 'القضاة', 'book-ruth': 'راعوث', 'book-1-samuel': 'صموئيل الأول',
    'book-2-samuel': 'صموئيل الثاني', 'book-1-kings': 'الملوك الأول', 'book-2-kings': 'الملوك الثاني',
    'book-1-chronicles': 'أخبار الأيام الأول', 'book-2-chronicles': 'أخبار الأيام الثاني',
    'book-ezra': 'عزرا', 'book-nehemiah': 'نحميا', 'book-esther': 'أستير', 'book-job': 'أيوب',
    'book-psalms': 'المزامير', 'book-proverbs': 'الأمثال', 'book-ecclesiastes': 'الجامعة',
    'book-song-of-solomon': 'نشيد الأنشاد', 'book-isaiah': 'إشعياء', 'book-jeremiah': 'إرميا',
    'book-lamentations': 'مراثي إرميا', 'book-ezekiel': 'حزقيال', 'book-daniel': 'دانيال',
    'book-hosea': 'هوشع', 'book-joel': 'يوئيل', 'book-amos': 'عاموس', 'book-obadiah': 'عوبديا',
    'book-jonah': 'يونان', 'book-micah': 'ميخا', 'book-nahum': 'ناحوم', 'book-habakkuk': 'حبقوق',
    'book-zephaniah': 'صفنيا', 'book-haggai': 'حجي', 'book-zechariah': 'زكريا', 'book-malachi': 'ملاخي',
    'book-matthew': 'متى',
    'book-mark': 'مرقس',
    'book-luke': 'لوقا',
    'book-john': 'يوحنا',
    'book-acts': 'أعمال الرسل',
    'book-romans': 'رومية',
    'book-1-corinthians': 'كورنثوس الأولى',
    'book-2-corinthians': 'كورنثوس الثانية',
    'book-galatians': 'غلاطية',
    'book-ephesians': 'أفسس',
    'book-philippians': 'فيلبي',
    'book-colossians': 'كولوسي',
    'book-1-thessalonians': 'تسالونيكي الأولى',
    'book-2-thessalonians': 'تسالونيكي الثانية',
    'book-1-timothy': 'تيموثاوس الأولى',
    'book-2-timothy': 'تيموثاوس الثانية',
    'book-titus': 'تيطس',
    'book-philemon': 'فليمون',
    'book-hebrews': 'العبرانيين',
    'book-james': 'يعقوب',
    'book-1-peter': 'بطرس الأولى',
    'book-2-peter': 'بطرس الثانية',
    'book-1-john': 'يوحنا الأولى',
    'book-2-john': 'يوحنا الثانية',
    'book-3-john': 'يوحنا الثالثة',
    'book-jude': 'يهوذا',
    'book-revelation': 'رؤيا يوحنا',
  },
  en: {
    'book-genesis': 'Genesis', 'book-exodus': 'Exodus', 'book-leviticus': 'Leviticus',
    'book-numbers': 'Numbers', 'book-deuteronomy': 'Deuteronomy', 'book-joshua': 'Joshua',
    'book-judges': 'Judges', 'book-ruth': 'Ruth', 'book-1-samuel': 'First Samuel',
    'book-2-samuel': 'Second Samuel', 'book-1-kings': 'First Kings', 'book-2-kings': 'Second Kings',
    'book-1-chronicles': 'First Chronicles', 'book-2-chronicles': 'Second Chronicles',
    'book-ezra': 'Ezra', 'book-nehemiah': 'Nehemiah', 'book-esther': 'Esther', 'book-job': 'Job',
    'book-psalms': 'Psalms', 'book-proverbs': 'Proverbs', 'book-ecclesiastes': 'Ecclesiastes',
    'book-song-of-solomon': 'Song of Solomon', 'book-isaiah': 'Isaiah', 'book-jeremiah': 'Jeremiah',
    'book-lamentations': 'Lamentations', 'book-ezekiel': 'Ezekiel', 'book-daniel': 'Daniel',
    'book-hosea': 'Hosea', 'book-joel': 'Joel', 'book-amos': 'Amos', 'book-obadiah': 'Obadiah',
    'book-jonah': 'Jonah', 'book-micah': 'Micah', 'book-nahum': 'Nahum', 'book-habakkuk': 'Habakkuk',
    'book-zephaniah': 'Zephaniah', 'book-haggai': 'Haggai', 'book-zechariah': 'Zechariah', 'book-malachi': 'Malachi',
    'book-matthew': 'Matthew',
    'book-mark': 'Mark',
    'book-luke': 'Luke',
    'book-john': 'John',
    'book-acts': 'Acts',
    'book-romans': 'Romans',
    'book-1-corinthians': 'First Corinthians',
    'book-2-corinthians': 'Second Corinthians',
    'book-galatians': 'Galatians',
    'book-ephesians': 'Ephesians',
    'book-philippians': 'Philippians',
    'book-colossians': 'Colossians',
    'book-1-thessalonians': 'First Thessalonians',
    'book-2-thessalonians': 'Second Thessalonians',
    'book-1-timothy': 'First Timothy',
    'book-2-timothy': 'Second Timothy',
    'book-titus': 'Titus',
    'book-philemon': 'Philemon',
    'book-hebrews': 'Hebrews',
    'book-james': 'James',
    'book-1-peter': 'First Peter',
    'book-2-peter': 'Second Peter',
    'book-1-john': 'First John',
    'book-2-john': 'Second John',
    'book-3-john': 'Third John',
    'book-jude': 'Jude',
    'book-revelation': 'Revelation',
  },
  el: {
    'book-genesis': 'Γένεση', 'book-exodus': 'Έξοδος', 'book-leviticus': 'Λευιτικό',
    'book-numbers': 'Αριθμοί', 'book-deuteronomy': 'Δευτερονόμιο', 'book-joshua': 'Ιησούς του Ναυή',
    'book-judges': 'Κριτές', 'book-ruth': 'Ρουθ', 'book-1-samuel': 'Α΄ Σαμουήλ',
    'book-2-samuel': 'Β΄ Σαμουήλ', 'book-1-kings': 'Α΄ Βασιλέων', 'book-2-kings': 'Β΄ Βασιλέων',
    'book-1-chronicles': 'Α΄ Παραλειπομένων', 'book-2-chronicles': 'Β΄ Παραλειπομένων',
    'book-ezra': 'Έσδρας', 'book-nehemiah': 'Νεεμίας', 'book-esther': 'Εσθήρ', 'book-job': 'Ιώβ',
    'book-psalms': 'Ψαλμοί', 'book-proverbs': 'Παροιμίες', 'book-ecclesiastes': 'Εκκλησιαστής',
    'book-song-of-solomon': 'Άσμα Ασμάτων', 'book-isaiah': 'Ησαΐας', 'book-jeremiah': 'Ιερεμίας',
    'book-lamentations': 'Θρήνοι', 'book-ezekiel': 'Ιεζεκιήλ', 'book-daniel': 'Δανιήλ',
    'book-hosea': 'Ωσηέ', 'book-joel': 'Ιωήλ', 'book-amos': 'Αμώς', 'book-obadiah': 'Οβδιού',
    'book-jonah': 'Ιωνάς', 'book-micah': 'Μιχαίας', 'book-nahum': 'Ναούμ', 'book-habakkuk': 'Αββακούμ',
    'book-zephaniah': 'Σοφονίας', 'book-haggai': 'Αγγαίος', 'book-zechariah': 'Ζαχαρίας', 'book-malachi': 'Μαλαχίας',
    'book-matthew': 'Κατά Ματθαίον',
    'book-mark': 'Κατά Μάρκον',
    'book-luke': 'Κατά Λουκάν',
    'book-john': 'Κατά Ιωάννην',
    'book-acts': 'Πράξεις των Αποστόλων',
    'book-romans': 'Προς Ρωμαίους',
    'book-1-corinthians': 'Α΄ προς Κορινθίους',
    'book-2-corinthians': 'Β΄ προς Κορινθίους',
    'book-galatians': 'Προς Γαλάτας',
    'book-ephesians': 'Προς Εφεσίους',
    'book-philippians': 'Προς Φιλιππησίους',
    'book-colossians': 'Προς Κολοσσαείς',
    'book-1-thessalonians': 'Α΄ προς Θεσσαλονικείς',
    'book-2-thessalonians': 'Β΄ προς Θεσσαλονικείς',
    'book-1-timothy': 'Α΄ προς Τιμόθεον',
    'book-2-timothy': 'Β΄ προς Τιμόθεον',
    'book-titus': 'Προς Τίτον',
    'book-philemon': 'Προς Φιλήμονα',
    'book-hebrews': 'Προς Εβραίους',
    'book-james': 'Επιστολή Ιακώβου',
    'book-1-peter': 'Α΄ Επιστολή Πέτρου',
    'book-2-peter': 'Β΄ Επιστολή Πέτρου',
    'book-1-john': 'Α΄ Επιστολή Ιωάννου',
    'book-2-john': 'Β΄ Επιστολή Ιωάννου',
    'book-3-john': 'Γ΄ Επιστολή Ιωάννου',
    'book-jude': 'Επιστολή Ιούδα',
    'book-revelation': 'Αποκάλυψη Ιωάννου',
  },
};

const gospelEntryForBook: Record<string, string> = {
  'book-matthew': 'gospel-matthew',
  'book-mark': 'gospel-mark',
  'book-luke': 'gospel-luke',
  'book-john': 'gospel-john',
};

const bibleChapterCounts: Record<string, number> = {
  'book-genesis': 50, 'book-exodus': 40, 'book-leviticus': 27, 'book-numbers': 36,
  'book-deuteronomy': 34, 'book-joshua': 24, 'book-judges': 21, 'book-ruth': 4,
  'book-1-samuel': 31, 'book-2-samuel': 24, 'book-1-kings': 22, 'book-2-kings': 25,
  'book-1-chronicles': 29, 'book-2-chronicles': 36, 'book-ezra': 10, 'book-nehemiah': 13,
  'book-esther': 10, 'book-job': 42, 'book-psalms': 150, 'book-proverbs': 31,
  'book-ecclesiastes': 12, 'book-song-of-solomon': 8, 'book-isaiah': 66, 'book-jeremiah': 52,
  'book-lamentations': 5, 'book-ezekiel': 48, 'book-daniel': 12, 'book-hosea': 14,
  'book-joel': 3, 'book-amos': 9, 'book-obadiah': 1, 'book-jonah': 4, 'book-micah': 7,
  'book-nahum': 3, 'book-habakkuk': 3, 'book-zephaniah': 3, 'book-haggai': 2,
  'book-zechariah': 14, 'book-malachi': 4,
  'book-matthew': 28, 'book-mark': 16, 'book-luke': 24, 'book-john': 21,
  'book-acts': 28, 'book-romans': 16, 'book-1-corinthians': 16, 'book-2-corinthians': 13,
  'book-galatians': 6, 'book-ephesians': 6, 'book-philippians': 4, 'book-colossians': 4,
  'book-1-thessalonians': 5, 'book-2-thessalonians': 3, 'book-1-timothy': 6,
  'book-2-timothy': 4, 'book-titus': 3, 'book-philemon': 1, 'book-hebrews': 13,
  'book-james': 5, 'book-1-peter': 5, 'book-2-peter': 3, 'book-1-john': 5,
  'book-2-john': 1, 'book-3-john': 1, 'book-jude': 1, 'book-revelation': 22,
};

const copy: Record<Language, {
  eyebrow: string;
  title: string;
  subtitle: string;
  old: string;
  new: string;
  testamentHint: Record<Testament, string>;
  sectionNames: Record<string, string>;
  sectionDescriptions: Record<string, string>;
  emptyTitle: string;
  emptyBody: string;
  audioNote: string;
  gospelReadings: string;
}> = {
  ar: {
    eyebrow: 'صلوات · الإنجيل المسموع',
    title: 'الكتاب المقدس',
    subtitle: 'اختر العهد والسفر الذي تريد قراءته.',
    old: 'العهد القديم',
    new: 'العهد الجديد',
    testamentHint: {
      old: 'تصفّح الأسفار التسعة والثلاثين بالترتيب.',
      new: 'من الأناجيل وأعمال الرسل إلى الرسائل والرؤيا',
    },
    sectionNames: {},
    sectionDescriptions: {},
    emptyTitle: 'ملفات القراءة والصوت لم تُضف بعد',
    emptyBody: 'ارفع ملفات النصوص والتسجيلات عندما تصبح جاهزة، وسنربطها هنا لتقرأ وتستمع إلى الإصحاح نفسه.',
    audioNote: 'لا يتوفر تسجيل صوتي لهذه المقتطفات بعد.',
    gospelReadings: 'مقتطفات الأناجيل',
  },
  en: {
    eyebrow: 'PRAYERS · AUDIO GOSPEL',
    title: 'Holy Bible',
    subtitle: 'Choose a testament and a book to read.',
    old: 'Old Testament',
    new: 'New Testament',
    testamentHint: {
      old: 'Browse all 39 books in order.',
      new: 'From the Gospels and Acts to the letters and Revelation',
    },
    sectionNames: {},
    sectionDescriptions: {},
    emptyTitle: 'Reading and audio files are not added yet',
    emptyBody: 'When you upload the text and recordings, they will be linked here so you can read and listen to the same chapter.',
    audioNote: 'Audio recordings are not available for these excerpts yet.',
    gospelReadings: 'Gospel readings',
  },
  el: {
    eyebrow: 'ΠΡΟΣΕΥΧΕΣ · ΑΚΟΥΣΤΟ ΕΥΑΓΓΕΛΙΟ',
    title: 'Αγία Γραφή',
    subtitle: 'Επιλέξτε Διαθήκη και βιβλίο για ανάγνωση.',
    old: 'Παλαιά Διαθήκη',
    new: 'Καινή Διαθήκη',
    testamentHint: {
      old: 'Περιηγηθείτε στα 39 βιβλία με τη σειρά.',
      new: 'Από τα Ευαγγέλια και τις Πράξεις στις επιστολές και την Αποκάλυψη',
    },
    sectionNames: {},
    sectionDescriptions: {},
    emptyTitle: 'Δεν έχουν προστεθεί ακόμη αρχεία κειμένου και ήχου',
    emptyBody: 'Όταν ανεβάσετε τα κείμενα και τις ηχογραφήσεις, θα συνδεθούν εδώ για να διαβάζετε και να ακούτε το ίδιο κεφάλαιο.',
    audioNote: 'Δεν υπάρχουν ακόμη ηχογραφήσεις για αυτά τα αποσπάσματα.',
    gospelReadings: 'Ευαγγελικές περικοπές',
  },
};

export default function BibleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useI18n();
  const isRTL = language === 'ar';
  const text = copy[language];
  const gospelCollection = getPrayerCollection(language, 'gospels');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const [testament, setTestament] = useState<Testament>('new');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const selectedChapterCount = selectedSection ? bibleChapterCounts[selectedSection] : undefined;
  const selectedGospelEntryId = selectedSection ? gospelEntryForBook[selectedSection] : undefined;
  const selectedGospelEntries = gospelCollection?.entries.filter(
    (entry) => entry.id === selectedGospelEntryId,
  ) ?? [];

  return (
    <ScrollView
      testID="bible-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + webTopInset + 16, paddingBottom: insets.bottom + webBottomInset + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable
          testID="bible-back"
          accessibilityRole="button"
          accessibilityLabel={isRTL ? 'العودة إلى المكتبة' : language === 'el' ? 'Επιστροφή στη βιβλιοθήκη' : 'Back to library'}
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={10}
        >
          <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={19} color={colors.primary} />
        </Pressable>
        <View style={[styles.heading, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.eyebrow, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>{text.eyebrow}</Text>
          <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>{text.title}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: isRTL ? 'right' : 'left' }]}>{text.subtitle}</Text>
        </View>
      </View>

      <View style={[styles.testamentTabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {(['old', 'new'] as const).map((value) => {
          const active = testament === value;
          return (
            <Pressable
              key={value}
              testID={`bible-testament-${value}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                setTestament(value);
                setSelectedSection(null);
              }}
              style={[
                styles.testamentTab,
                active && { backgroundColor: colors.primary },
              ]}
            >
              <Feather name={value === 'old' ? 'book' : 'book-open'} size={16} color={active ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.testamentLabel, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                {value === 'old' ? text.old : text.new}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.testamentIntro, { backgroundColor: colors.heroStart }]}>
        <View style={[styles.introIcon, { backgroundColor: colors.accent }]}>
          <Feather name={testament === 'old' ? 'book' : 'crosshair'} size={20} color={colors.accentForeground} />
        </View>
        <View style={[styles.introCopy, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.introTitle, { color: colors.heroForeground, textAlign: isRTL ? 'right' : 'left' }]}>
            {testament === 'old' ? text.old : text.new}
          </Text>
          <Text style={[styles.introSubtitle, { color: colors.heroForeground, textAlign: isRTL ? 'right' : 'left' }]}>
            {text.testamentHint[testament]}
          </Text>
        </View>
        <Feather name="bookmark" size={19} color={colors.accent} />
      </View>

      <View style={styles.sectionList}>
        {sections[testament].map((section, index) => {
          const active = selectedSection === section.id;
          const sectionName = section.book
            ? bibleBookNames[language][section.id]
            : text.sectionNames[section.id];
          return (
            <View key={section.id}>
              <Pressable
                testID={`bible-section-${section.id}`}
                accessibilityRole="button"
                accessibilityLabel={sectionName}
                accessibilityState={{ expanded: active }}
                onPress={() => {
                  setSelectedSection(active ? null : section.id);
                }}
                style={({ pressed }) => [
                  styles.sectionCard,
                  {
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    backgroundColor: colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <View style={[styles.sectionIcon, { backgroundColor: active ? colors.primary : colors.secondary }]}>
                  <Feather name={section.icon} size={18} color={active ? colors.primaryForeground : colors.primary} />
                </View>
                <View style={[styles.sectionCopy, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>
                    {sectionName}
                  </Text>
                  {!section.book && (
                    <Text style={[styles.sectionDescription, { color: colors.mutedForeground, textAlign: isRTL ? 'right' : 'left' }]}>
                      {text.sectionDescriptions[section.id]}
                    </Text>
                  )}
                </View>
                {!section.book && (
                  <Text style={[styles.sectionNumber, { color: colors.mutedForeground }]}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                )}
                <Feather name={active ? 'chevron-up' : isRTL ? 'chevron-left' : 'chevron-right'} size={17} color={colors.mutedForeground} />
              </Pressable>
              {active && selectedChapterCount && (
                <View testID={`bible-chapters-${section.id}`} style={styles.chapterPanel}>
                  <Text style={[styles.chapterPanelTitle, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>
                    {language === 'ar' ? `إصحاحات ${sectionName}` : language === 'el' ? `Κεφάλαια · ${sectionName}` : `Chapters · ${sectionName}`}
                  </Text>
                  <View style={styles.chapterGrid}>
                    {Array.from({ length: selectedChapterCount }, (_, chapterIndex) => {
                      const chapterNumber = chapterIndex + 1;
                      return (
                        <Pressable
                          key={chapterNumber}
                          testID={`bible-chapter-${section.id}-${chapterNumber}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: false }}
                          onPress={() => router.push({
                            pathname: '/bible-reader',
                            params: { book: section.id, chapter: String(chapterNumber), testament },
                          })}
                          style={[styles.chapterButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        >
                          <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>
                            {chapterNumber}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {selectedGospelEntries.length > 0 && gospelCollection && (
        <View testID="bible-gospel-readings" style={styles.gospelList}>
          <Text style={[styles.gospelListTitle, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>
            {text.gospelReadings}
          </Text>
          <Text style={[styles.gospelListDescription, { color: colors.mutedForeground, textAlign: isRTL ? 'right' : 'left' }]}>
            {gospelCollection.description}
          </Text>
          {selectedGospelEntries.map((entry) => (
            <View
              key={entry.id}
              testID={`bible-gospel-entry-${entry.id}`}
              style={[styles.gospelCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.gospelReference, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                {entry.reference}
              </Text>
              <Text style={[styles.gospelEntryTitle, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>
                {entry.title}
              </Text>
              <Text
                testID={`bible-gospel-reading-${entry.id}`}
                style={[
                  styles.gospelReading,
                  {
                    color: colors.foreground,
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {entry.text}
              </Text>
            </View>
          ))}
          <View style={[styles.audioNote, { borderTopColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Feather name="headphones" size={16} color={colors.primary} />
            <Text style={[styles.audioNoteText, { color: colors.mutedForeground, textAlign: isRTL ? 'right' : 'left' }]}>
              {text.audioNote}
            </Text>
          </View>
        </View>
      )}

      {selectedSection && !selectedChapterCount && selectedGospelEntries.length === 0 && (
        <View
          testID="bible-content-pending"
          style={[styles.pendingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.pendingIcon, { backgroundColor: colors.muted }]}>
            <Feather name="file-text" size={21} color={colors.primary} />
          </View>
          <Text style={[styles.pendingTitle, { color: colors.foreground, textAlign: 'center' }]}>{text.emptyTitle}</Text>
          <Text style={[styles.pendingBody, { color: colors.mutedForeground, textAlign: 'center' }]}>{text.emptyBody}</Text>
          <View style={[styles.audioNote, { borderTopColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Feather name="headphones" size={16} color={colors.primary} />
            <Text style={[styles.audioNoteText, { color: colors.mutedForeground, textAlign: isRTL ? 'right' : 'left' }]}>{text.audioNote}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, gap: 18 },
  topBar: { alignItems: 'center', gap: 13 },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, gap: 3 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800' },
  subtitle: { fontSize: 12, lineHeight: 18 },
  testamentTabs: { borderWidth: 1, borderRadius: 17, padding: 5, flexDirection: 'row', gap: 5 },
  testamentTab: { flex: 1, minHeight: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  testamentLabel: { fontSize: 13, fontWeight: '700' },
  testamentIntro: { minHeight: 105, paddingHorizontal: 17, paddingVertical: 17, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 13 },
  introIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  introCopy: { flex: 1, gap: 5 },
  introTitle: { fontSize: 17, fontWeight: '800' },
  introSubtitle: { opacity: 0.78, fontSize: 11, lineHeight: 16 },
  sectionList: { gap: 9 },
  sectionCard: { minHeight: 72, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderRadius: 16, alignItems: 'center', gap: 11 },
  sectionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sectionCopy: { flex: 1, gap: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  sectionDescription: { fontSize: 11, lineHeight: 15 },
  sectionNumber: { fontSize: 10, fontWeight: '700' },
  chapterPanel: { gap: 12, marginTop: 9, marginBottom: 5, padding: 13, borderRadius: 15, backgroundColor: 'rgba(127,127,127,0.06)' },
  chapterPanelTitle: { fontSize: 13, fontWeight: '800' },
  chapterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chapterButton: { width: 42, height: 42, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gospelList: { gap: 10 },
  gospelListTitle: { fontSize: 17, fontWeight: '800' },
  gospelListDescription: { fontSize: 12, lineHeight: 18, marginTop: -5 },
  gospelCard: { gap: 8, padding: 16, borderWidth: 1, borderRadius: 17 },
  gospelReference: { fontSize: 11, fontWeight: '700' },
  gospelEntryTitle: { fontSize: 14, fontWeight: '800' },
  gospelReading: { fontSize: 15, lineHeight: 27 },
  pendingCard: { alignItems: 'center', gap: 12, padding: 20, borderWidth: 1, borderRadius: 19 },
  pendingIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pendingTitle: { fontSize: 15, fontWeight: '800', lineHeight: 22 },
  pendingBody: { fontSize: 12, lineHeight: 19 },
  audioNote: { width: '100%', borderTopWidth: 1, paddingTop: 13, gap: 8, alignItems: 'center' },
  audioNoteText: { flex: 1, fontSize: 11, lineHeight: 16 },
});
