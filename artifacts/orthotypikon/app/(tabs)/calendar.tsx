import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { getCalendarEntriesForType, getCalendarEntryForType, shiftDateKey } from '@/data/calendar2026';
import { dateKeyFromDate } from '@/data/dailyWidget';
import { useI18n, usePreferences } from '@/hooks/usePreferences';
import { getJanuaryFastingForDate, type JanuaryFastingSymbol, type JanuaryService } from '@/data/januaryFasting2026';

function dateKey(month: number, day: number) {
  return `2026-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const fastingSymbolImages: Record<JanuaryFastingSymbol, ImageSourcePropType> = {
  oilWine: require('../../assets/calendar/oil-wine.png'),
  wine: require('../../assets/calendar/wine.png'),
  zafar: require('../../assets/calendar/zafar.png'),
  fish: require('../../assets/calendar/fish.png'),
  noMarriage: require('../../assets/calendar/no-marriage.png'),
  greatHours: require('../../assets/calendar/great-hours.png'),
};

const fastingCopy = {
  ar: {
    title: 'رموز كانون الثاني ٢٠٢٦',
    scope: 'تضم الرموز الواردة في الصور المرجعية؛ وتخص بيانات الأيام كانون الثاني الشرقي فقط.',
    fast: 'يوم صوم',
    oilWine: 'يُسمح بالزيت والخمر',
    wine: 'يُسمح بتناول الخمر',
    zafar: 'يُسمح بأكل الزفر',
    fish: 'يُسمح بأكل السمك',
    noMarriage: 'لا يُسمح بالزواج',
    greatHours: 'تُقام خدمة الساعات الكبرى',
    chrysostomLiturgy: 'قداس القديس يوحنا الذهبي الفم',
    basilLiturgy: 'قداس القديس باسيليوس الكبير',
    greatHoursNoLiturgy: 'تُقام خدمة الساعات الكبرى دون قداس إلهي',
  },
  en: {
    title: 'January 2026 symbols',
    scope: 'All symbols from the reference images are shown; the date entries apply only to Eastern January.',
    fast: 'Fasting day',
    oilWine: 'Oil and wine permitted',
    wine: 'Wine permitted',
    zafar: '“Zafar” food permitted',
    fish: 'Fish permitted',
    noMarriage: 'Marriage not permitted',
    greatHours: 'Great Hours service',
    chrysostomLiturgy: 'Divine Liturgy of St. John Chrysostom',
    basilLiturgy: 'Divine Liturgy of St. Basil the Great',
    greatHoursNoLiturgy: 'Great Hours service; no Divine Liturgy',
  },
  el: {
    title: 'Σύμβολα Ιανουαρίου 2026',
    scope: 'Εμφανίζονται όλα τα σύμβολα των εικόνων αναφοράς· οι ημερομηνίες αφορούν μόνο τον ανατολικό Ιανουάριο.',
    fast: 'Ημέρα νηστείας',
    oilWine: 'Επιτρέπονται λάδι και κρασί',
    wine: 'Επιτρέπεται το κρασί',
    zafar: 'Επιτρέπεται το «ζαφάρ»',
    fish: 'Επιτρέπεται το ψάρι',
    noMarriage: 'Δεν επιτρέπεται ο γάμος',
    greatHours: 'Ακολουθία των Μεγάλων Ωρών',
    chrysostomLiturgy: 'Θεία Λειτουργία του Αγίου Ιωάννη του Χρυσοστόμου',
    basilLiturgy: 'Θεία Λειτουργία του Μεγάλου Βασιλείου',
    greatHoursNoLiturgy: 'Ακολουθία των Μεγάλων Ωρών χωρίς Θεία Λειτουργία',
  },
} satisfies Record<'ar' | 'en' | 'el', Record<string, string>>;

const fastingLegendItems: { symbol: JanuaryFastingSymbol | 'fast'; labelKey: JanuaryFastingSymbol | 'fast' }[] = [
  { symbol: 'fast', labelKey: 'fast' },
  { symbol: 'oilWine', labelKey: 'oilWine' },
  { symbol: 'wine', labelKey: 'wine' },
  { symbol: 'zafar', labelKey: 'zafar' },
  { symbol: 'fish', labelKey: 'fish' },
  { symbol: 'noMarriage', labelKey: 'noMarriage' },
  { symbol: 'greatHours', labelKey: 'greatHours' },
];

const fastingSymbolSources: Record<JanuaryFastingSymbol | 'fast', ImageSourcePropType> = {
  ...fastingSymbolImages,
  fast: require('../../assets/calendar/fasting.png'),
};

function getJanuaryServiceLabel(service: JanuaryService, labels: typeof fastingCopy.ar) {
  return labels[service];
}

function getTodayPosition(_calendarType: 'gregorian' | 'julian') {
  const today = dateKeyFromDate(new Date());
  const month = Number(today.slice(5, 7)) - 1;
  const day = Number(today.slice(8, 10));
  return { month, day: Math.min(day, new Date(2026, month + 1, 0).getDate()) };
}

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { calendarType } = usePreferences();
  const [initialPosition] = useState(() => getTodayPosition(calendarType));
  const [month, setMonth] = useState(initialPosition.month);
  const [selectedDay, setSelectedDay] = useState(initialPosition.day);
  const { t, language } = useI18n();
  const isRtl = language === 'ar';
  const rowDirection = isRtl ? ('row-reverse' as const) : ('row' as const);
  const textAlign = isRtl ? ('right' as const) : ('left' as const);

  useFocusEffect(
    useCallback(() => {
      const today = getTodayPosition(calendarType);
      setMonth(today.month);
      setSelectedDay(today.day);
    }, [calendarType]),
  );

  const monthNames = t.calendar.months;
  const weekDays = t.calendar.weekdays;
  const yearLabel = language === 'ar' ? '٢٠٢٦' : '2026';
  const daysInMonth = new Date(2026, month + 1, 0).getDate();
  const selectedDate = dateKey(month, selectedDay);
  const weekdayDate = calendarType === 'julian' ? shiftDateKey(dateKey(month, 1), 13) : dateKey(month, 1);
  const firstDay = new Date(`${weekdayDate}T12:00:00Z`).getUTCDay();
  const selectedWeekdayDate = calendarType === 'julian' ? shiftDateKey(selectedDate, 13) : selectedDate;
  const selectedWeekday = new Date(`${selectedWeekdayDate}T12:00:00Z`).getUTCDay();
  const isEasternJanuary = calendarType === 'julian' && month === 0;
  const januaryFasting = isEasternJanuary ? getJanuaryFastingForDate(selectedDate) : undefined;
  const selected = getCalendarEntryForType(selectedDate, calendarType);
  const fastingLabels = fastingCopy[language];
  const displayedFeast =
    language === 'ar'
      ? selected.feast
      : selected.feast
        ? month === 7 && (selectedDay === 15 || selectedDay === 25)
          ? t.home.todayFeast
          : language === 'en'
            ? 'Church feast'
            : 'Εκκλησιαστική εορτή'
        : undefined;
  const displayedFast =
    language === 'ar' ? selected.fast : selected.fast ? (language === 'en' ? 'Fasting period' : 'Περίοδος νηστείας') : undefined;
  const displayedLiturgy =
    language === 'ar'
      ? selected.liturgy
      : selected.liturgy
        ? language === 'en'
          ? 'Divine Liturgy · 9:00 AM'
          : 'Θεία Λειτουργία · 9:00 π.μ.'
        : undefined;
  const displayedSaints = language === 'ar' ? selected.saints : selected.saints.map((_, index) => language === 'en' ? `Saint of the day ${index + 1}` : `Άγιος της ημέρας ${index + 1}`);
  const markedDays = useMemo(
    () =>
      getCalendarEntriesForType(calendarType)
        .map((entry) => entry.date)
        .filter((entryDate) => entryDate.startsWith(`2026-${String(month + 1).padStart(2, '0')}`))
        .map((entryDate) => Number(entryDate.slice(-2))),
    [month, calendarType],
  );

  const moveMonth = (delta: number) => {
    setMonth((current) => (current + delta + 12) % 12);
    setSelectedDay(1);
  };
  const previousLabel = language === 'ar' ? 'الشهر السابق' : language === 'el' ? 'Προηγούμενος μήνας' : 'Previous month';
  const nextLabel = language === 'ar' ? 'الشهر التالي' : language === 'el' ? 'Επόμενος μήνας' : 'Next month';
  const calendarSystemLabel = calendarType === 'julian' ? t.calendar.eastern : t.calendar.western;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 112 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
        <View style={[styles.eyebrowRow, { flexDirection: rowDirection }]}>
          <View style={[styles.eyebrowMark, { backgroundColor: colors.accent }]} />
          <Text style={[styles.eyebrow, { color: colors.primary, textAlign }]}>{t.calendar.kicker}</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground, textAlign }]}>{t.calendar.title}</Text>
        <View style={[styles.systemPill, { backgroundColor: colors.secondary, flexDirection: rowDirection }]}>
          <Feather name="calendar" size={14} color={colors.secondaryForeground} />
          <Text style={[styles.systemText, { color: colors.secondaryForeground }]}>{calendarSystemLabel}</Text>
        </View>
      </View>

      <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.monthHeader, { flexDirection: rowDirection }]}>
          <Pressable
            onPress={() => moveMonth(-1)}
            style={({ pressed }) => [styles.monthButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.65 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={previousLabel}
            hitSlop={4}
          >
            <Feather name={isRtl ? 'chevron-right' : 'chevron-left'} size={19} color={colors.secondaryForeground} />
          </Pressable>
          <View style={styles.monthHeading}>
            <Text style={[styles.monthTitle, { color: colors.foreground, textAlign }]}>{monthNames[month]}</Text>
            <Text style={[styles.year, { color: colors.mutedForeground, textAlign }]}>{yearLabel}</Text>
          </View>
          <Pressable
            onPress={() => moveMonth(1)}
            style={({ pressed }) => [styles.monthButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.65 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={nextLabel}
            hitSlop={4}
          >
            <Feather name={isRtl ? 'chevron-left' : 'chevron-right'} size={19} color={colors.secondaryForeground} />
          </Pressable>
        </View>

        <View style={[styles.weekRow, { flexDirection: rowDirection }]}>
          {weekDays.map((day) => (
            <Text key={day} style={[styles.weekText, { color: colors.mutedForeground }]}>{day}</Text>
          ))}
        </View>

        <View style={[styles.daysGrid, { flexDirection: rowDirection }]}>
          {Array.from({ length: firstDay }, (_, index) => <View key={`empty-${index}`} style={styles.dayCell} />)}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const isSelected = selectedDay === day;
            const dayFasting = isEasternJanuary ? getJanuaryFastingForDate(dateKey(month, day)) : undefined;
            const hasEntry = markedDays.includes(day) && !isEasternJanuary;
            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
                style={({ pressed }) => [
                  styles.dayCell,
                  dayFasting?.fast && { backgroundColor: colors.fastingCell },
                  isSelected && {
                    borderColor: colors.primary,
                    borderWidth: 2,
                    backgroundColor: dayFasting?.fast ? colors.fastingCell : colors.primary,
                  },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${day} ${monthNames[month]}${dayFasting?.fast ? `, ${fastingLabels.fast}` : ''}`}
              >
                <Text style={[styles.dayNumber, { color: isSelected && !dayFasting?.fast ? colors.primaryForeground : dayFasting?.fast ? colors.fastingCellText : colors.foreground }]}>
                  {day}
                </Text>
                {dayFasting?.symbols?.length ? (
                  <View style={styles.daySymbols}>
                    {dayFasting.symbols.map((symbol) => (
                      <Image key={symbol} source={fastingSymbolImages[symbol]} style={styles.daySymbol} resizeMode="contain" accessibilityLabel={fastingLabels[symbol]} />
                    ))}
                  </View>
                ) : hasEntry ? (
                  <View style={[styles.dayDot, { backgroundColor: colors.accent }]} />
                ) : (
                  <View style={styles.dayDotPlaceholder} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.detailHeader, { flexDirection: rowDirection }]}>
          <View style={[styles.dateBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.badgeDay, { color: colors.primaryForeground }]}>{selectedDay}</Text>
            <Text style={[styles.badgeMonth, { color: colors.primaryForeground }]}>{monthNames[month].slice(0, 4)}</Text>
          </View>
          <View style={styles.detailHeading}>
            <Text style={[styles.detailEyebrow, { color: colors.primary, textAlign }]}>{t.calendar.detail}</Text>
            <Text style={[styles.dateText, { color: colors.mutedForeground, textAlign }]}>
              {t.calendar.dateWeekdays[selectedWeekday]} · {selectedDay} {monthNames[month]} {yearLabel}
            </Text>
          </View>
        </View>

        {displayedFeast ? (
          <View style={[styles.feastBlock, { borderColor: colors.border, flexDirection: rowDirection }]}>
            <View style={[styles.feastIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="star" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.feast, { color: colors.primary, textAlign }]}>{displayedFeast}</Text>
          </View>
        ) : null}
        {displayedFast ? (
          <View style={[styles.infoLine, { flexDirection: rowDirection }]}>
            <Feather name="minus-circle" size={14} color={colors.accent} />
            <Text style={[styles.fast, { color: colors.mutedForeground, textAlign }]}>{displayedFast}</Text>
          </View>
        ) : null}
        {displayedLiturgy ? (
          <View style={[styles.infoLine, { flexDirection: rowDirection }]}>
            <Feather name="clock" size={14} color={colors.primary} />
            <Text style={[styles.desc, { color: colors.mutedForeground, textAlign }]}>{displayedLiturgy}</Text>
          </View>
        ) : null}
        {!displayedFeast && !displayedFast && !displayedLiturgy && !januaryFasting ? (
          <Text style={[styles.desc, { color: colors.mutedForeground, textAlign }]}>{t.calendar.noOccasion}</Text>
        ) : null}
        {januaryFasting?.fast ? (
          <View style={[styles.detailSymbol, { flexDirection: rowDirection }]}>
            <Image source={fastingSymbolSources.fast} style={styles.detailSymbolImage} resizeMode="contain" accessibilityLabel={fastingLabels.fast} />
            <Text style={[styles.fast, { color: colors.fastingCellText, textAlign }]}>{fastingLabels.fast}</Text>
          </View>
        ) : null}
        {januaryFasting?.symbols?.map((symbol) => (
          <View key={symbol} style={[styles.detailSymbol, { flexDirection: rowDirection }]}>
            <Image source={fastingSymbolImages[symbol]} style={styles.detailSymbolImage} resizeMode="contain" accessibilityLabel={fastingLabels[symbol]} />
            <Text style={[styles.desc, { color: colors.mutedForeground, textAlign }]}>{fastingLabels[symbol]}</Text>
          </View>
        ))}
        {januaryFasting?.services?.map((service) => (
          <View key={service} style={[styles.serviceLine, { flexDirection: rowDirection }]}>
            <Feather name="crosshair" size={14} color={colors.accent} />
            <Text style={[styles.service, { color: colors.mutedForeground, textAlign }]}>{getJanuaryServiceLabel(service, fastingLabels)}</Text>
          </View>
        ))}
      </View>

      {isEasternJanuary ? (
        <View style={[styles.legendCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <View style={[styles.sectionHeading, { flexDirection: rowDirection }]}>
            <View style={[styles.sectionMark, { backgroundColor: colors.accent }]} />
            <Text style={[styles.legendTitle, { color: colors.foreground, textAlign }]}>{fastingLabels.title}</Text>
          </View>
          <Text style={[styles.legendScope, { color: colors.mutedForeground, textAlign }]}>{fastingLabels.scope}</Text>
          <View style={[styles.legendGrid, { flexDirection: rowDirection }]}>
            {fastingLegendItems.map(({ symbol, labelKey }) => (
              <View key={symbol} style={[styles.legendItem, { flexDirection: rowDirection }]}>
                <Image source={fastingSymbolSources[symbol]} style={styles.legendSymbol} resizeMode="contain" accessibilityLabel={fastingLabels[labelKey]} />
                <Text style={[styles.legendLabel, { color: colors.foreground, textAlign }]}>{fastingLabels[labelKey]}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={[styles.saintsHeading, { flexDirection: rowDirection }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>{t.calendar.saints}</Text>
        <View style={[styles.sectionRule, { backgroundColor: colors.border }]} />
      </View>
      {displayedSaints.length ? (
        displayedSaints.map((saint) => (
          <View key={saint} style={[styles.saintRow, { borderColor: colors.border, flexDirection: rowDirection }]}>
            <View style={[styles.saintIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="star" size={15} color={colors.primary} />
            </View>
            <Text style={[styles.saintName, { color: colors.foreground, textAlign }]}>{saint}</Text>
            <Feather name={isRtl ? 'chevron-left' : 'chevron-right'} size={17} color={colors.mutedForeground} />
          </View>
        ))
      ) : (
        <Text style={[styles.empty, { color: colors.mutedForeground, textAlign }]}>{t.calendar.noNames}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 14 },
  hero: { alignItems: 'flex-end', gap: 9, paddingHorizontal: 3, paddingBottom: 3 },
  eyebrowRow: { alignItems: 'center', gap: 7 },
  eyebrowMark: { width: 7, height: 7, borderRadius: 4 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.7 },
  systemPill: { alignItems: 'center', gap: 7, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  systemText: { fontSize: 11, fontWeight: '700' },
  calendarCard: { borderWidth: 1, borderRadius: 24, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16, gap: 13 },
  monthHeader: { alignItems: 'center', justifyContent: 'space-between' },
  monthButton: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  monthHeading: { flex: 1, alignItems: 'center', gap: 2 },
  monthTitle: { fontSize: 20, fontWeight: '700' },
  year: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  weekRow: { justifyContent: 'space-between', paddingHorizontal: 2 },
  weekText: { width: '14.28%', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  daysGrid: { flexWrap: 'wrap', rowGap: 7 },
  dayCell: { width: '14.28%', height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayNumber: { fontSize: 14, lineHeight: 17, fontWeight: '600' },
  daySymbols: { minHeight: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 1 },
  daySymbol: { width: 12, height: 12 },
  dayDot: { width: 4, height: 4, borderRadius: 2 },
  dayDotPlaceholder: { width: 4, height: 4 },
  detailCard: { borderWidth: 1, borderRadius: 24, padding: 17, gap: 11 },
  detailHeader: { alignItems: 'center', gap: 12, width: '100%' },
  dateBadge: { width: 52, height: 59, borderRadius: 17, alignItems: 'center', justifyContent: 'center', gap: 1 },
  badgeDay: { fontSize: 22, fontWeight: '700', lineHeight: 25 },
  badgeMonth: { fontSize: 9, fontWeight: '700', opacity: 0.82 },
  detailHeading: { flex: 1, gap: 4 },
  detailEyebrow: { fontSize: 17, fontWeight: '700' },
  dateText: { fontSize: 11, lineHeight: 16 },
  feastBlock: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 11, alignItems: 'center', gap: 9 },
  feastIcon: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  feast: { flex: 1, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  infoLine: { alignItems: 'center', gap: 8, width: '100%' },
  fast: { flex: 1, fontSize: 12, lineHeight: 19 },
  desc: { flex: 1, fontSize: 12, lineHeight: 19 },
  detailSymbol: { alignItems: 'center', gap: 8, width: '100%' },
  detailSymbolImage: { width: 23, height: 23 },
  serviceLine: { alignItems: 'flex-start', gap: 8, width: '100%' },
  service: { flex: 1, fontSize: 12, lineHeight: 19 },
  legendCard: { borderWidth: 1, borderRadius: 22, padding: 15, gap: 9 },
  sectionHeading: { alignItems: 'center', gap: 8 },
  sectionMark: { width: 7, height: 7, borderRadius: 4 },
  legendTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  legendScope: { fontSize: 11, lineHeight: 17 },
  legendGrid: { flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 2 },
  legendItem: { width: '49%', minHeight: 34, alignItems: 'center', gap: 7, marginBottom: 6 },
  legendSymbol: { width: 28, height: 28 },
  legendLabel: { flex: 1, fontSize: 11, lineHeight: 16 },
  saintsHeading: { alignItems: 'center', gap: 10, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  sectionRule: { height: 1, flex: 1 },
  saintRow: { minHeight: 59, borderBottomWidth: 1, alignItems: 'center', gap: 11 },
  saintIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  saintName: { flex: 1, fontSize: 14, lineHeight: 20 },
  empty: { fontSize: 13, lineHeight: 19, paddingVertical: 5 },
});