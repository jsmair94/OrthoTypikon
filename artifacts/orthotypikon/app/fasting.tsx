import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { fastLevelLabels, getFastForDate, getRecipesForFast } from '@/data/fasting2026';
import { shiftDateKey } from '@/data/calendar2026';
import { useI18n, usePreferences } from '@/hooks/usePreferences';

const initialDate = '2026-08-25';
const levelColors = { strict: '#8C5948', oil: '#B47732', fish: '#56708B', none: '#55706B' };

export default function FastingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { calendarType } = usePreferences();
  const { t, language } = useI18n();
  const [date, setDate] = useState(initialDate);
  const day = useMemo(() => getFastForDate(date, calendarType), [date, calendarType]);
  const recipes = getRecipesForFast(day.level);
  const localizedDay = language === 'ar' ? day : {
    ...day,
    title: t.fasting.levels[day.level],
    description: language === 'en' ? 'Live this day with prayer, moderation, and mercy according to the Church calendar.' : 'Ζήστε αυτή την ημέρα με προσευχή, εγκράτεια και έλεος σύμφωνα με το εκκλησιαστικό ημερολόγιο.',
    note: language === 'en' ? 'Follow your spiritual father’s guidance and your health needs.' : 'Ακολουθήστε την καθοδήγηση του πνευματικού σας και τις ανάγκες της υγείας σας.',
  };
  const recipeNames = language === 'en'
    ? ['Warm lentil soup', 'Vegetable and olive pasta', 'Baked fish with lemon']
    : ['Ζεστή σούπα φακής', 'Ζυμαρικά με λαχανικά και ελιές', 'Ψητό ψάρι με λεμόνι'];
  const displayDate = calendarType === 'julian' ? shiftDateKey(date, -13) : date;
  const adjustDate = (amount: number) => setDate(shiftDateKey(date, amount));

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]} hitSlop={10}><Feather name="arrow-right" size={20} color={colors.primary} /></Pressable>
         <View style={styles.topCopy}><Text style={[styles.eyebrow, { color: colors.primary }]}>{t.fasting.eyebrow}</Text><Text style={[styles.title, { color: colors.foreground }]}>{t.fasting.title}</Text></View>
      </View>

      <View style={[styles.datePicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable onPress={() => adjustDate(1)} hitSlop={10}><Feather name="chevron-right" size={20} color={colors.primary} /></Pressable>
         <View style={styles.dateCenter}><Text style={[styles.date, { color: colors.foreground }]}>{displayDate}</Text><Text style={[styles.calendarLabel, { color: colors.mutedForeground }]}>{calendarType === 'julian' ? t.fasting.calendarEastern : t.fasting.calendarWestern}</Text></View>
        <Pressable onPress={() => adjustDate(-1)} hitSlop={10}><Feather name="chevron-left" size={20} color={colors.primary} /></Pressable>
      </View>

      <View style={[styles.statusCard, { backgroundColor: levelColors[day.level] }]}>
         <View style={styles.statusTop}><View style={styles.statusIcon}><Feather name={day.level === 'none' ? 'sun' : 'minus-circle'} size={20} color="#FFF" /></View><Text style={styles.statusLevel}>{t.fasting.levels[day.level]}</Text></View>
         <Text style={styles.statusTitle}>{localizedDay.title}</Text>
         <Text style={styles.statusDescription}>{localizedDay.description}</Text>
         {localizedDay.note && <Text style={styles.statusNote}>{localizedDay.note}</Text>}
      </View>

       <View style={styles.heading}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.fasting.recipesToday}</Text><Text style={[styles.link, { color: colors.primary }]}>{recipes.length} {t.fasting.recipes}</Text></View>
       {recipes.map((recipe, index) => (
        <View key={recipe.id} style={[styles.recipeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.recipeIcon}><Feather name="coffee" size={20} color={colors.primary} /></View>
           <View style={styles.recipeBody}><Text style={[styles.recipeTitle, { color: colors.foreground }]}>{language === 'ar' ? recipe.title : recipeNames[index]}</Text><Text style={[styles.recipeSubtitle, { color: colors.mutedForeground }]}>{language === 'ar' ? `${recipe.subtitle} · ${recipe.time}` : language === 'en' ? 'A simple fasting recipe · 30 minutes' : 'Απλή νηστίσιμη συνταγή · 30 λεπτά'}</Text>{language === 'ar' ? <><Text style={[styles.recipeIngredients, { color: colors.mutedForeground }]}>{recipe.ingredients.join(' · ')}</Text><Text style={[styles.recipeSteps, { color: colors.foreground }]}>{recipe.steps.join('  ')}</Text></> : <Text style={[styles.recipeSteps, { color: colors.foreground }]}>{language === 'en' ? 'Prepare the ingredients, cook gently, and serve with gratitude.' : 'Ετοιμάστε τα υλικά, μαγειρέψτε απαλά και σερβίρετε με ευγνωμοσύνη.'}</Text>}</View>
        </View>
      ))}

       <View style={[styles.guidance, { borderColor: colors.border }]}><Feather name="info" size={17} color={colors.accent} /><Text style={[styles.guidanceText, { color: colors.mutedForeground }]}>{t.fasting.guidance}</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  topBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  topCopy: { flex: 1, alignItems: 'flex-end' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  datePicker: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateCenter: { alignItems: 'center', gap: 4 },
  date: { fontSize: 15, fontWeight: '700' },
  calendarLabel: { fontSize: 10 },
  statusCard: { borderRadius: 23, padding: 20, alignItems: 'flex-end', gap: 9 },
  statusTop: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  statusIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  statusLevel: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  statusTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', textAlign: 'right', marginTop: 5 },
  statusDescription: { color: '#F3EEE5', fontSize: 13, lineHeight: 21, textAlign: 'right' },
  statusNote: { color: '#E8DED1', fontSize: 11, lineHeight: 18, textAlign: 'right' },
  heading: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  link: { fontSize: 12, fontWeight: '600' },
  recipeCard: { borderWidth: 1, borderRadius: 18, padding: 15, flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12 },
  recipeIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#E8E1D4', alignItems: 'center', justifyContent: 'center' },
  recipeBody: { flex: 1, alignItems: 'flex-end', gap: 5 },
  recipeTitle: { fontSize: 15, fontWeight: '700', textAlign: 'right' },
  recipeSubtitle: { fontSize: 11, textAlign: 'right' },
  recipeIngredients: { fontSize: 10, lineHeight: 17, textAlign: 'right' },
  recipeSteps: { fontSize: 11, lineHeight: 18, textAlign: 'right', marginTop: 3 },
  guidance: { borderWidth: 1, borderRadius: 16, padding: 15, flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-start' },
  guidanceText: { flex: 1, fontSize: 11, lineHeight: 18, textAlign: 'right' },
});