import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { CalendarType, copy, Language, ThemeMode, useI18n, usePreferences } from '@/hooks/usePreferences';
import { useRouter } from 'expo-router';
import { getMoreContent } from '@/data/moreContent';

const languages: { id: Language; label: keyof typeof copy.ar }[] = [
  { id: 'ar', label: 'arabic' },
  { id: 'en', label: 'english' },
  { id: 'el', label: 'greek' },
];
const themes: { id: ThemeMode; icon: 'smartphone' | 'sun' | 'moon' }[] = [
  { id: 'system', icon: 'smartphone' },
  { id: 'light', icon: 'sun' },
  { id: 'dark', icon: 'moon' },
];
const calendars: { id: CalendarType; icon: 'globe' | 'compass' }[] = [
  { id: 'gregorian', icon: 'globe' },
  { id: 'julian', icon: 'compass' },
];

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { language, themeMode, calendarType, setLanguage, setThemeMode, setCalendarType } = usePreferences();
  const router = useRouter();
  const t = copy[language];
  const { t: screen } = useI18n();
  const more = getMoreContent(language);
  const infoSections = [
    { key: 'privacy', label: more.privacy, icon: 'shield' as const },
    { key: 'contact', label: more.contact, icon: 'mail' as const },
    { key: 'about', label: more.about, icon: 'info' as const },
    { key: 'donate', label: more.donate, icon: 'heart' as const },
  ];
  const socialItems = [
    { label: more.socials.facebook, icon: 'thumbs-up' as const },
    { label: more.socials.instagram, icon: 'instagram' as const },
    { label: more.socials.whatsapp, icon: 'message-circle' as const },
    { label: more.socials.telegram, icon: 'send' as const },
  ];
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 22, paddingBottom: 110 }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.kicker, { color: colors.primary }]}>OrthoTypikon</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{t.moreTitle}</Text>
      <View style={[styles.profile, { backgroundColor: colors.primary }]}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}><Feather name="user" size={22} color={colors.primaryForeground} /></View>
        <View style={{ flex: 1 }}><Text style={styles.welcome}>{screen.more.journey}</Text><Text style={styles.profileText}>{screen.more.journeyText}</Text></View>
        <Feather name="chevron-left" size={19} color="#FFF" />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.language}</Text>
      <View style={[styles.optionGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {languages.map((item) => <Pressable key={item.id} testID={`language-${item.id}`} onPress={() => setLanguage(item.id)} style={[styles.option, { borderColor: colors.border }]}><Text style={[styles.optionLabel, { color: colors.foreground }]}>{t[item.label]}</Text><View style={[styles.radio, { borderColor: item.id === language ? colors.accent : colors.mutedForeground }]}>{item.id === language && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}</View></Pressable>)}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.calendarType}</Text>
      <View style={[styles.calendarGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
         {calendars.map((item) => <Pressable key={item.id} testID={`calendar-${item.id}`} onPress={() => setCalendarType(item.id)} style={[styles.calendarOption, { backgroundColor: calendarType === item.id ? colors.primary : 'transparent', borderColor: colors.border }]}><View style={[styles.calendarIcon, { backgroundColor: calendarType === item.id ? 'rgba(255,255,255,0.16)' : colors.muted }]}><Feather name={item.icon} size={18} color={calendarType === item.id ? colors.primaryForeground : colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.calendarTitle, { color: calendarType === item.id ? colors.primaryForeground : colors.foreground }]}>{t[item.id]}</Text><Text style={[styles.calendarDescription, { color: calendarType === item.id ? '#D9E0E3' : colors.mutedForeground }]}>{item.id === 'julian' ? screen.more.calendarDescriptionEastern : screen.more.calendarDescriptionWestern}</Text></View>{calendarType === item.id && <Feather name="check-circle" size={19} color={colors.accent} />}</Pressable>)}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.appearance}</Text>
      <View style={[styles.themeGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {themes.map((item) => <Pressable key={item.id} testID={`theme-${item.id}`} onPress={() => setThemeMode(item.id)} style={[styles.themeOption, { backgroundColor: themeMode === item.id ? colors.primary : 'transparent' }]}><Feather name={item.icon} size={19} color={themeMode === item.id ? colors.primaryForeground : colors.mutedForeground} /><Text style={[styles.themeText, { color: themeMode === item.id ? colors.primaryForeground : colors.mutedForeground }]}>{t[item.id]}</Text></Pressable>)}
      </View>
      <Text style={[styles.saved, { color: colors.mutedForeground }]}>{t.saved}</Text>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{screen.more.prayerEase}</Text>
      <View style={[styles.quickGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable testID="more-prayer-mode" onPress={() => router.push('/prayer-mode')} style={styles.quickOption}><View style={[styles.quickIcon, { backgroundColor: colors.muted }]}><Feather name="moon" size={18} color={colors.primary} /></View><View style={styles.quickCopy}><Text style={[styles.quickTitle, { color: colors.foreground }]}>{screen.more.prayerMode}</Text><Text style={[styles.quickSubtitle, { color: colors.mutedForeground }]}>{screen.more.prayerModeText}</Text></View><Feather name="chevron-left" size={17} color={colors.mutedForeground} /></Pressable>
        <Pressable testID="more-widget" onPress={() => router.push('/widget')} style={[styles.quickOption, { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.quickIcon, { backgroundColor: colors.muted }]}><Feather name="smartphone" size={18} color={colors.primary} /></View><View style={styles.quickCopy}><Text style={[styles.quickTitle, { color: colors.foreground }]}>{screen.more.widget}</Text><Text style={[styles.quickSubtitle, { color: colors.mutedForeground }]}>{screen.more.widgetText}</Text></View><Feather name="chevron-left" size={17} color={colors.mutedForeground} /></Pressable>
      </View>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{more.sectionTitle}</Text>
      <View style={[styles.quickGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {infoSections.map((item, index) => (
          <Pressable
            key={item.key}
            testID={`more-${item.key}`}
            onPress={() => router.push({ pathname: '/info/[section]', params: { section: item.key } })}
            style={[styles.quickOption, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.muted }]}>
              <Feather name={item.icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.quickCopy}>
              <Text style={[styles.quickTitle, { color: colors.foreground }]}>{item.label}</Text>
            </View>
            <Feather name="chevron-left" size={17} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{more.followUs}</Text>
      <View style={[styles.socialGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {socialItems.map((item, index) => (
          <View
            key={item.label}
            style={[styles.socialOption, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.muted }]}>
              <Feather name={item.icon} size={17} color={colors.primary} />
            </View>
            <Text style={[styles.quickTitle, { color: colors.foreground }]}>{item.label}</Text>
            <Text style={[styles.socialPending, { color: colors.mutedForeground }]}>{more.socialPending}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.footer, { color: colors.mutedForeground }]}>{screen.more.version}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 14 },
  kicker: { textAlign: 'right', fontSize: 12, fontWeight: '600' },
  title: { textAlign: 'right', fontSize: 28, fontWeight: '700' },
  profile: { borderRadius: 20, padding: 18, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginTop: 8, minHeight: 88 },
  avatar: { width: 43, height: 43, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  welcome: { color: '#FFF', textAlign: 'right', fontSize: 15, fontWeight: '700' },
  profileText: { color: '#D9E0E3', textAlign: 'right', fontSize: 11, marginTop: 4 },
  sectionTitle: { textAlign: 'right', fontSize: 17, fontWeight: '700', marginTop: 9 },
  optionGroup: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  option: { minHeight: 52, paddingHorizontal: 16, borderBottomWidth: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  optionLabel: { fontSize: 14, fontWeight: '600' },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  themeGroup: { borderWidth: 1, borderRadius: 16, padding: 5, flexDirection: 'row-reverse', gap: 5 },
  themeOption: { flex: 1, minHeight: 70, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 7 },
  themeText: { fontSize: 11, fontWeight: '600' },
  calendarGroup: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  calendarOption: { minHeight: 76, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 11, borderBottomWidth: 1 },
  calendarIcon: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  calendarTitle: { textAlign: 'right', fontSize: 14, fontWeight: '700' },
  calendarDescription: { textAlign: 'right', fontSize: 10, marginTop: 4 },
  saved: { textAlign: 'center', fontSize: 11, marginTop: 7 },
  quickGroup: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  quickOption: { minHeight: 70, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  quickIcon: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickCopy: { flex: 1, alignItems: 'flex-end', gap: 4 },
  quickTitle: { fontSize: 14, fontWeight: '700', textAlign: 'right' },
  quickSubtitle: { fontSize: 10, textAlign: 'right' },
  socialGroup: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  socialOption: { minHeight: 60, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  socialPending: { flex: 1, textAlign: 'left', fontSize: 10 },
  footer: { textAlign: 'center', fontSize: 11, marginTop: 14 },
});