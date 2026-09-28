import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { currentSaint } from '@/data/saints';
import { getDailyWidgetContent } from '@/data/dailyWidget';
import { useI18n } from '@/hooks/usePreferences';

export default function WidgetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const content = getDailyWidgetContent();
  const { t, language } = useI18n();
  const localizedDate = language === 'ar'
    ? content.displayDate
    : new Intl.DateTimeFormat(language === 'el' ? 'el-GR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
       <View style={styles.topBar}><Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]} hitSlop={10}><Feather name="arrow-right" size={20} color={colors.primary} /></Pressable><View style={styles.topCopy}><Text style={[styles.eyebrow, { color: colors.primary }]}>{t.widget.eyebrow}</Text><Text style={[styles.title, { color: colors.foreground }]}>{t.widget.title}</Text></View></View>
       <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t.widget.subtitle}</Text>
       <View style={[styles.widget, { backgroundColor: colors.primary }]}><View style={styles.widgetTop}><Text style={styles.widgetBrand}>OrthoTypikon</Text><Feather name="crosshair" size={18} color={colors.accent} /></View><Text style={styles.widgetDate}>{localizedDate} · {t.widget.julian} {content.julianDateKey}</Text><View style={styles.divider} /><Text style={styles.widgetLabel}>{t.widget.verse}</Text><Text style={styles.verse}>{language === 'ar' ? content.verse : t.home.verse}</Text><Text style={styles.saint}>✦ {language === 'ar' ? (content.saints.slice(0, 2).join(' · ') || currentSaint.name) : t.home.todayFeast}</Text></View>
       <View style={[styles.note, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="check-circle" size={18} color={colors.accent} /><Text style={[styles.noteText, { color: colors.foreground }]}>{t.widget.note}</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 }, topBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }, topCopy: { flex: 1, alignItems: 'flex-end' }, backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, eyebrow: { fontSize: 12, fontWeight: '600' }, title: { fontSize: 28, fontWeight: '700', marginTop: 4 }, subtitle: { fontSize: 13, textAlign: 'right', lineHeight: 20 }, widget: { borderRadius: 24, padding: 20, gap: 12, minHeight: 245 }, widgetTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }, widgetBrand: { color: '#D9E0E3', fontSize: 11, fontWeight: '600' }, widgetDate: { color: '#FFF', fontSize: 12, textAlign: 'right', marginTop: 8 }, divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', width: '100%' }, widgetLabel: { color: '#D9E0E3', fontSize: 11, textAlign: 'right' }, verse: { color: '#FFF', fontSize: 18, lineHeight: 29, fontWeight: '600', textAlign: 'right' }, saint: { color: '#E4B967', fontSize: 12, textAlign: 'right', marginTop: 4 }, note: { borderWidth: 1, borderRadius: 17, padding: 16, flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 }, noteText: { flex: 1, fontSize: 12, lineHeight: 20, textAlign: 'right' },
});