import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { CalendarType, copy, Language, screenCopy, usePreferences } from '@/hooks/usePreferences';

const languages: { id: Language; label: keyof typeof copy.ar }[] = [
  { id: 'ar', label: 'arabic' },
  { id: 'en', label: 'english' },
  { id: 'el', label: 'greek' },
];

const calendars: { id: CalendarType; icon: 'globe' | 'compass' }[] = [
  { id: 'gregorian', icon: 'globe' },
  { id: 'julian', icon: 'compass' },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { language, calendarType, completeSetup } = usePreferences();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);
  const [selectedCalendar, setSelectedCalendar] = useState<CalendarType>(calendarType);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const labels = copy[selectedLanguage];
  const selectedCopy = screenCopy[selectedLanguage].onboarding;

  const finishSetup = async () => {
    setSaving(true);
    setSaveFailed(false);
    try {
      await completeSetup(selectedLanguage, selectedCalendar);
    } catch {
      setSaveFailed(true);
      setSaving(false);
    }
  };

  return (
    <ScrollView
      testID="onboarding-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
        <Feather name="plus" size={28} color={colors.accent} />
      </View>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>{selectedCopy.eyebrow}</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{selectedCopy.title}</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{selectedCopy.subtitle}</Text>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{selectedCopy.language}</Text>
      <View style={[styles.optionGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {languages.map((item) => (
          <Pressable
            key={item.id}
            testID={`onboarding-language-${item.id}`}
            onPress={() => {
              setSelectedLanguage(item.id);
            }}
            style={[styles.languageOption, { borderColor: colors.border, backgroundColor: selectedLanguage === item.id ? colors.primary : 'transparent' }]}
          >
            <Text style={[styles.languageLabel, { color: selectedLanguage === item.id ? colors.primaryForeground : colors.foreground }]}>{labels[item.label]}</Text>
            <View style={[styles.radio, { borderColor: selectedLanguage === item.id ? colors.accent : colors.mutedForeground }]}>
              {selectedLanguage === item.id && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}
            </View>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{selectedCopy.calendar}</Text>
      <View style={[styles.calendarGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {calendars.map((item) => {
          const selected = selectedCalendar === item.id;
          return (
            <Pressable
              key={item.id}
              testID={`onboarding-calendar-${item.id}`}
              onPress={() => setSelectedCalendar(item.id)}
              style={[styles.calendarOption, { backgroundColor: selected ? colors.primary : 'transparent', borderColor: colors.border }]}
            >
              <View style={[styles.calendarIcon, { backgroundColor: selected ? 'rgba(255,255,255,0.16)' : colors.muted }]}>
                <Feather name={item.icon} size={18} color={selected ? colors.primaryForeground : colors.primary} />
              </View>
              <View style={styles.calendarCopy}>
                <Text style={[styles.calendarTitle, { color: selected ? colors.primaryForeground : colors.foreground }]}>{labels[item.id]}</Text>
                <Text style={[styles.calendarDescription, { color: selected ? '#D9E0E3' : colors.mutedForeground }]}>
                  {item.id === 'julian' ? selectedCopy.julianDescription : selectedCopy.gregorianDescription}
                </Text>
              </View>
              {selected && <Feather name="check-circle" size={19} color={colors.accent} />}
            </Pressable>
          );
        })}
      </View>

      {saveFailed && <Text style={[styles.saveError, { color: colors.destructive }]}>{selectedCopy.saveError}</Text>}
      <Pressable
        testID="onboarding-continue"
        onPress={finishSetup}
        disabled={saving}
        style={({ pressed }) => [styles.continueButton, { backgroundColor: colors.accent, opacity: saving ? 0.6 : pressed ? 0.84 : 1 }]}
      >
        <Text style={[styles.continueText, { color: colors.primary }]}>{saving ? selectedCopy.saving : selectedCopy.continue}</Text>
        <Feather name={selectedLanguage === 'ar' ? 'arrow-left' : 'arrow-right'} size={19} color={colors.primary} />
      </Pressable>
      <Text style={[styles.footnote, { color: colors.mutedForeground }]}>{labels.saved}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, alignItems: 'stretch', gap: 14 },
  brandMark: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 2 },
  eyebrow: { textAlign: 'center', fontSize: 12, fontWeight: '700', marginTop: 2 },
  title: { textAlign: 'center', fontSize: 30, fontWeight: '700', marginTop: 2 },
  subtitle: { textAlign: 'center', fontSize: 13, lineHeight: 21, marginHorizontal: 12, marginBottom: 10 },
  sectionTitle: { textAlign: 'right', fontSize: 17, fontWeight: '700', marginTop: 6 },
  optionGroup: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  languageOption: { minHeight: 54, paddingHorizontal: 16, borderBottomWidth: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  languageLabel: { fontSize: 14, fontWeight: '600' },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  calendarGroup: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  calendarOption: { minHeight: 82, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 11, borderBottomWidth: 1 },
  calendarIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  calendarCopy: { flex: 1, alignItems: 'flex-end' },
  calendarTitle: { textAlign: 'right', fontSize: 14, fontWeight: '700' },
  calendarDescription: { textAlign: 'right', fontSize: 10, lineHeight: 16, marginTop: 4 },
  continueButton: { minHeight: 58, borderRadius: 17, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 8 },
  continueText: { fontSize: 15, fontWeight: '700' },
  saveError: { textAlign: 'center', fontSize: 12, fontWeight: '600' },
  footnote: { textAlign: 'center', fontSize: 11, marginTop: 2 },
});