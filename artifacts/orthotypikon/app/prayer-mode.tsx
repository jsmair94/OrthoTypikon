import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/usePreferences';

const MODE_KEY = '@orthotypikon/prayer-mode';

export default function PrayerModeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => { AsyncStorage.getItem(MODE_KEY).then((value) => setEnabled(value === 'true')); }, []);
  const toggle = (value: boolean) => { setEnabled(value); AsyncStorage.setItem(MODE_KEY, String(value)); };
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
       <View style={styles.topBar}><Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]} hitSlop={10}><Feather name="arrow-right" size={20} color={colors.primary} /></Pressable><View style={styles.topCopy}><Text style={[styles.eyebrow, { color: colors.primary }]}>{t.prayerMode.eyebrow}</Text><Text style={[styles.title, { color: colors.foreground }]}>{t.prayerMode.title}</Text></View></View>
       <View style={[styles.hero, { backgroundColor: colors.primary }]}><View style={styles.iconCircle}><Feather name="moon" size={24} color={colors.accent} /></View><Text style={styles.heroTitle}>{t.prayerMode.heroTitle}</Text><Text style={styles.heroText}>{t.prayerMode.heroText}</Text></View>
       <View style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.optionCopy}><Text style={[styles.optionTitle, { color: colors.foreground }]}>{t.prayerMode.optionTitle}</Text><Text style={[styles.optionText, { color: colors.mutedForeground }]}>{t.prayerMode.optionText}</Text></View><Switch testID="prayer-mode-switch" value={enabled} onValueChange={toggle} trackColor={{ false: colors.muted, true: colors.accent }} thumbColor={enabled ? colors.primary : '#FFF'} /></View>
       <View style={[styles.info, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="bell-off" size={19} color={colors.accent} /><Text style={[styles.infoText, { color: colors.foreground }]}>{t.prayerMode.info}</Text>{Platform.OS !== 'web' && <Pressable onPress={() => Linking.openSettings()} style={[styles.settingsButton, { backgroundColor: colors.secondary }]}><Text style={[styles.settingsText, { color: colors.secondaryForeground }]}>{t.prayerMode.openSettings}</Text></Pressable>}</View>
       {enabled && <View style={[styles.active, { borderColor: colors.accent }]}><Feather name="check-circle" size={18} color={colors.accent} /><Text style={[styles.activeText, { color: colors.foreground }]}>{t.prayerMode.active}</Text></View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 }, topBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }, topCopy: { flex: 1, alignItems: 'flex-end' }, backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, eyebrow: { fontSize: 12, fontWeight: '600' }, title: { fontSize: 28, fontWeight: '700', marginTop: 4 }, hero: { borderRadius: 23, padding: 21, alignItems: 'flex-end', gap: 9 }, iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(228,185,103,0.18)', alignItems: 'center', justifyContent: 'center' }, heroTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', textAlign: 'right' }, heroText: { color: '#D9E0E3', fontSize: 13, lineHeight: 21, textAlign: 'right' }, optionCard: { borderWidth: 1, borderRadius: 19, padding: 17, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }, optionCopy: { flex: 1, alignItems: 'flex-end', gap: 5 }, optionTitle: { fontSize: 15, fontWeight: '700', textAlign: 'right' }, optionText: { fontSize: 11, lineHeight: 18, textAlign: 'right' }, info: { borderWidth: 1, borderRadius: 18, padding: 16, alignItems: 'flex-end', gap: 11 }, infoText: { fontSize: 12, lineHeight: 20, textAlign: 'right' }, settingsButton: { borderRadius: 11, paddingVertical: 11, paddingHorizontal: 14 }, settingsText: { fontSize: 12, fontWeight: '700' }, active: { borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 9 }, activeText: { flex: 1, fontSize: 12, textAlign: 'right' },
});