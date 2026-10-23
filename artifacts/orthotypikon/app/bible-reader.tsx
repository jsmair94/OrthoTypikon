import { Feather } from '@expo/vector-icons';
import { getGetBibleChapterQueryKey, useGetBibleChapter } from '@workspace/api-client-react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BibleAudioControl } from '@/components/BibleAudioControl';
import { useAppAudio } from '@/hooks/useAppAudio';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/usePreferences';
import { findActiveBibleVerse } from '@/lib/bibleTimings';

type Language = 'ar' | 'en' | 'el';

const chapterCounts: Record<string, number> = {
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

const bookNames: Record<Language, Record<string, string>> = {
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
    'book-matthew': 'متى', 'book-mark': 'مرقس', 'book-luke': 'لوقا', 'book-john': 'يوحنا',
    'book-acts': 'أعمال الرسل', 'book-romans': 'رومية', 'book-1-corinthians': 'كورنثوس الأولى',
    'book-2-corinthians': 'كورنثوس الثانية', 'book-galatians': 'غلاطية', 'book-ephesians': 'أفسس',
    'book-philippians': 'فيلبي', 'book-colossians': 'كولوسي', 'book-1-thessalonians': 'تسالونيكي الأولى',
    'book-2-thessalonians': 'تسالونيكي الثانية', 'book-1-timothy': 'تيموثاوس الأولى',
    'book-2-timothy': 'تيموثاوس الثانية', 'book-titus': 'تيطس', 'book-philemon': 'فليمون',
    'book-hebrews': 'العبرانيين', 'book-james': 'يعقوب', 'book-1-peter': 'بطرس الأولى',
    'book-2-peter': 'بطرس الثانية', 'book-1-john': 'يوحنا الأولى', 'book-2-john': 'يوحنا الثانية',
    'book-3-john': 'يوحنا الثالثة', 'book-jude': 'يهوذا', 'book-revelation': 'رؤيا يوحنا',
    history: 'الأسفار التاريخية', poetry: 'الأسفار الشعرية', prophets: 'الأنبياء', torah: 'التوراة',
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
    'book-matthew': 'Matthew', 'book-mark': 'Mark', 'book-luke': 'Luke', 'book-john': 'John',
    'book-acts': 'Acts', 'book-romans': 'Romans', 'book-1-corinthians': 'First Corinthians',
    'book-2-corinthians': 'Second Corinthians', 'book-galatians': 'Galatians', 'book-ephesians': 'Ephesians',
    'book-philippians': 'Philippians', 'book-colossians': 'Colossians', 'book-1-thessalonians': 'First Thessalonians',
    'book-2-thessalonians': 'Second Thessalonians', 'book-1-timothy': 'First Timothy',
    'book-2-timothy': 'Second Timothy', 'book-titus': 'Titus', 'book-philemon': 'Philemon',
    'book-hebrews': 'Hebrews', 'book-james': 'James', 'book-1-peter': 'First Peter',
    'book-2-peter': 'Second Peter', 'book-1-john': 'First John', 'book-2-john': 'Second John',
    'book-3-john': 'Third John', 'book-jude': 'Jude', 'book-revelation': 'Revelation',
    history: 'Historical Books', poetry: 'Poetic Books', prophets: 'The Prophets', torah: 'The Torah',
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
    'book-matthew': 'Κατά Ματθαίον', 'book-mark': 'Κατά Μάρκον', 'book-luke': 'Κατά Λουκάν',
    'book-john': 'Κατά Ιωάννην', 'book-acts': 'Πράξεις των Αποστόλων', 'book-romans': 'Προς Ρωμαίους',
    'book-1-corinthians': 'Α΄ προς Κορινθίους', 'book-2-corinthians': 'Β΄ προς Κορινθίους',
    'book-galatians': 'Προς Γαλάτας', 'book-ephesians': 'Προς Εφεσίους', 'book-philippians': 'Προς Φιλιππησίους',
    'book-colossians': 'Προς Κολοσσαείς', 'book-1-thessalonians': 'Α΄ προς Θεσσαλονικείς',
    'book-2-thessalonians': 'Β΄ προς Θεσσαλονικείς', 'book-1-timothy': 'Α΄ προς Τιμόθεον',
    'book-2-timothy': 'Β΄ προς Τιμόθεον', 'book-titus': 'Προς Τίτον', 'book-philemon': 'Προς Φιλήμονα',
    'book-hebrews': 'Προς Εβραίους', 'book-james': 'Επιστολή Ιακώβου', 'book-1-peter': 'Α΄ Επιστολή Πέτρου',
    'book-2-peter': 'Β΄ Επιστολή Πέτρου', 'book-1-john': 'Α΄ Επιστολή Ιωάννου',
    'book-2-john': 'Β΄ Επιστολή Ιωάννου', 'book-3-john': 'Γ΄ Επιστολή Ιωάννου',
    'book-jude': 'Επιστολή Ιούδα', 'book-revelation': 'Αποκάλυψη Ιωάννου',
    history: 'Ιστορικά Βιβλία', poetry: 'Ποιητικά Βιβλία', prophets: 'Οι Προφήτες', torah: 'Η Τορά',
  },
};

export default function BibleReaderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeId, pause, status: audioStatus } = useAppAudio();
  const { language } = useI18n();
  const isRTL = language === 'ar';
  const params = useLocalSearchParams<{ book: string; chapter: string; testament: string }>();
  const bookId = Array.isArray(params.book) ? params.book[0] : params.book;
  const chapter = Number(Array.isArray(params.chapter) ? params.chapter[0] : params.chapter);
  const bookName = bookNames[language][bookId ?? ''] ?? bookId ?? '';
  const chapterCount = chapterCounts[bookId ?? ''];
  const canGoPrevious = Number.isInteger(chapter) && chapter > 1;
  const canGoNext = Number.isInteger(chapter) && chapter < chapterCount;
  const bookKey = bookId?.replace(/^book-/, '').toLowerCase() ?? '';
  const hasSupportedBook = Boolean(bookNames.en[bookId ?? '']);
  const validChapter = Number.isInteger(chapter) && chapter >= 1 && chapter <= chapterCount;
  const chapterQuery = useGetBibleChapter(bookKey, chapter, {
    query: {
      queryKey: getGetBibleChapterQueryKey(bookKey, chapter),
      enabled: hasSupportedBook && validChapter,
      retry: false,
    },
  });
  const remoteChapter = chapterQuery.data;
  const loading = chapterQuery.isPending && hasSupportedBook && validChapter;
  const errorStatus = (chapterQuery.error as { status?: number } | null)?.status;
  const hasError = chapterQuery.isError && errorStatus !== 404;
  const readerScroll = useRef<ScrollView>(null);
  const readingCardTop = useRef(0);
  const versesTop = useRef(0);
  const versePositions = useRef<Record<number, number>>({});
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const copy = useMemo(() => ({
    title: language === 'ar' ? 'الكتاب المقدس' : language === 'el' ? 'Αγία Γραφή' : 'Holy Bible',
    back: language === 'ar' ? 'العودة إلى الأسفار' : language === 'el' ? 'Επιστροφή στα βιβλία' : 'Back to books',
    pending: language === 'ar'
      ? `الإصحاح ${chapter}: ستظهر القراءة والتسجيل الصوتي هنا بعد رفع الملفات.`
      : language === 'el'
        ? `Κεφάλαιο ${chapter}: το κείμενο και η ηχογράφηση θα εμφανιστούν εδώ όταν προστεθούν τα αρχεία.`
        : `Chapter ${chapter}: its reading and audio will appear here when the files are added.`,
    loading: language === 'ar' ? 'جارٍ تحميل الإصحاح…' : language === 'el' ? 'Φόρτωση κεφαλαίου…' : 'Loading chapter…',
    error: language === 'ar' ? 'تعذر تحميل النص أو التسجيل من التخزين.' : language === 'el' ? 'Δεν ήταν δυνατή η φόρτωση του κεφαλαίου.' : 'Could not load the text or audio from storage.',
    read: language === 'ar' ? 'القراءة' : language === 'el' ? 'Ανάγνωση' : 'Reading',
    listen: language === 'ar' ? 'استمع إلى الإصحاح' : language === 'el' ? 'Ακούστε το κεφάλαιο' : 'Listen to chapter',
    previous: language === 'ar' ? 'الإصحاح السابق' : language === 'el' ? 'Προηγούμενο κεφάλαιο' : 'Previous chapter',
    next: language === 'ar' ? 'الإصحاح التالي' : language === 'el' ? 'Επόμενο κεφάλαιο' : 'Next chapter',
    chapterOf: language === 'ar'
      ? `الإصحاح ${chapter} من ${chapterCount}`
      : language === 'el'
        ? `Κεφάλαιο ${chapter} από ${chapterCount}`
        : `Chapter ${chapter} of ${chapterCount}`,
  }), [chapter, chapterCount, language]);

  const changeChapter = (amount: -1 | 1) => {
    const nextChapter = chapter + amount;
    if (nextChapter < 1 || nextChapter > chapterCount) return;
    if (activeId?.startsWith('bible:')) pause(activeId);
    router.setParams({ chapter: String(nextChapter) });
  };

  const audioId = `bible:${bookId}:${chapter}`;
  const activeVerse = activeId === audioId
    ? findActiveBibleVerse(remoteChapter?.verses ?? [], audioStatus.currentTime)
    : null;

  useEffect(() => {
    if (!activeVerse) return;
    const y = versePositions.current[activeVerse.number];
    if (y !== undefined) {
      readerScroll.current?.scrollTo({
        y: Math.max(0, readingCardTop.current + versesTop.current + y - 180),
        animated: true,
      });
    }
  }, [activeVerse?.number]);

  return (
    <ScrollView
      ref={readerScroll}
      testID="bible-reader-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + webTopInset + 16, paddingBottom: insets.bottom + webBottomInset + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable
          testID="bible-reader-back"
          accessibilityRole="button"
          accessibilityLabel={copy.back}
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={10}
        >
          <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={19} color={colors.primary} />
        </Pressable>
        <View style={[styles.heading, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{copy.title}</Text>
          <Text testID="bible-reader-heading" style={[styles.title, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>
            {language === 'ar' ? `${bookName} — الإصحاح ${chapter}` : language === 'el' ? `${bookName} — Κεφάλαιο ${chapter}` : `${bookName} — Chapter ${chapter}`}
          </Text>
        </View>
      </View>

      {chapterCount > 1 && (
        <View
          testID="bible-chapter-nav"
          style={[styles.chapterNav, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          <Pressable
            testID="bible-reader-previous"
            accessibilityRole="button"
            accessibilityLabel={copy.previous}
            accessibilityState={{ disabled: !canGoPrevious }}
            disabled={!canGoPrevious}
            onPress={() => changeChapter(-1)}
            style={({ pressed }) => [styles.chapterNavButton, { opacity: !canGoPrevious ? 0.35 : pressed ? 0.72 : 1 }]}
          >
            <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={17} color={colors.primary} />
            <Text style={[styles.chapterNavLabel, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>{copy.previous}</Text>
          </Pressable>
          <Text testID="bible-reader-chapter-count" style={[styles.chapterCount, { color: colors.mutedForeground }]}>
            {copy.chapterOf}
          </Text>
          <Pressable
            testID="bible-reader-next"
            accessibilityRole="button"
            accessibilityLabel={copy.next}
            accessibilityState={{ disabled: !canGoNext }}
            disabled={!canGoNext}
            onPress={() => changeChapter(1)}
            style={({ pressed }) => [styles.chapterNavButton, { opacity: !canGoNext ? 0.35 : pressed ? 0.72 : 1 }]}
          >
            <Text style={[styles.chapterNavLabel, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>{copy.next}</Text>
            <Feather name={isRTL ? 'arrow-left' : 'arrow-right'} size={17} color={colors.primary} />
          </Pressable>
        </View>
      )}

      {loading ? (
        <Text testID="bible-reader-loading" style={[styles.pending, { color: colors.mutedForeground }]}>{copy.loading}</Text>
      ) : hasError ? (
        <Text testID="bible-reader-error" style={[styles.pending, { color: colors.mutedForeground }]}>{copy.error}</Text>
      ) : remoteChapter ? (
        <View
          onLayout={(event) => { readingCardTop.current = event.nativeEvent.layout.y; }}
          style={[styles.readingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {remoteChapter.audioUrl && (
            <>
              <View style={[styles.audioHeading, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Feather name="headphones" size={17} color={colors.primary} />
                <Text style={[styles.sectionHeading, { color: colors.foreground }]}>{copy.listen}</Text>
              </View>
              <BibleAudioControl url={remoteChapter.audioUrl} audioId={audioId} language={language} />
              <View style={[styles.readingDivider, { borderTopColor: colors.border }]} />
            </>
          )}
          <Text style={[styles.sectionHeading, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>{copy.read}</Text>
          {remoteChapter.verses?.length ? (
            <View
              testID="bible-reader-timed-verses"
              onLayout={(event) => { versesTop.current = event.nativeEvent.layout.y; }}
              style={styles.verses}
            >
              {remoteChapter.verses.map((verse) => {
                const highlighted = activeVerse?.number === verse.number;
                return (
                  <View
                    key={verse.number}
                    testID={`bible-reader-verse-${verse.number}`}
                    onLayout={(event) => { versePositions.current[verse.number] = event.nativeEvent.layout.y; }}
                    style={styles.verse}
                  >
                    <Text
                      style={[
                        styles.readingText,
                        {
                          color: colors.foreground,
                          textAlign: isRTL ? 'right' : 'left',
                          writingDirection: isRTL ? 'rtl' : 'ltr',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.verseNumber,
                          { color: colors.mutedForeground, backgroundColor: colors.muted },
                        ]}
                      >
                        {verse.number}
                      </Text>
                      {' '}
                      <Text
                        testID={highlighted ? 'bible-reader-active-text' : undefined}
                        style={highlighted ? [
                          styles.activeVerseText,
                          {
                            color: colors.verseHighlightForeground,
                            backgroundColor: colors.verseHighlight,
                            textDecorationColor: colors.verseHighlightBorder,
                          },
                        ] : undefined}
                      >
                        {verse.text}
                      </Text>
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text testID="bible-reader-text" style={[styles.readingText, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {remoteChapter.text}
            </Text>
          )}
        </View>
      ) : (
        <View style={[styles.pendingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.pendingIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="book-open" size={21} color={colors.primary} />
          </View>
          <Text testID="bible-reader-pending" style={[styles.pending, { color: colors.mutedForeground, textAlign: 'center' }]}>{copy.pending}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, gap: 20 },
  topBar: { alignItems: 'center', gap: 13 },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, gap: 5 },
  eyebrow: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 20, lineHeight: 29, fontWeight: '800' },
  chapterNav: { minHeight: 66, borderWidth: 1, borderRadius: 17, paddingHorizontal: 11, paddingVertical: 8, alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  chapterNavButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4 },
  chapterNavLabel: { fontSize: 11, fontWeight: '700' },
  chapterCount: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  readingCard: { borderWidth: 1, borderRadius: 20, padding: 17, gap: 14 },
  audioHeading: { alignItems: 'center', gap: 8 },
  sectionHeading: { fontSize: 15, lineHeight: 22, fontWeight: '800' },
  readingDivider: { borderTopWidth: 1, marginTop: 4 },
  verses: { gap: 4 },
  verse: { paddingVertical: 2 },
  verseNumber: { fontSize: 12, lineHeight: 22, fontWeight: '800', borderRadius: 10, overflow: 'hidden' },
  activeVerseText: { borderRadius: 4, textDecorationLine: 'underline', fontWeight: '700' },
  readingText: { fontSize: 18, lineHeight: 34 },
  pendingCard: { alignItems: 'center', gap: 14, padding: 24, borderWidth: 1, borderRadius: 20 },
  pendingIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pending: { fontSize: 13, lineHeight: 22 },
});
