import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/usePreferences';
import { getMoreContent, resolveAboutBody, type MoreSection } from '@/data/moreContent';
import { ContactForm } from '@/components/ContactForm';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { fetchManagedContent } from '@/lib/managedContent';

const sectionKeys: MoreSection[] = ['privacy', 'terms', 'about', 'contact'];

export default function MoreInfoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useI18n();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const content = getMoreContent(language);
  const [managedAboutBody, setManagedAboutBody] = useState<string | null>(null);
  const textAlign = language === 'ar' ? 'right' : 'left';
  const activeSection = sectionKeys.includes(section as MoreSection)
    ? (section as MoreSection)
    : 'privacy';
  useEffect(() => {
    let active = true;
    setManagedAboutBody(null);
    void fetchManagedContent<Record<string, { aboutBody?: string }>>('about').then((managed) => {
      const body = managed?.[language]?.aboutBody;
      if (active && typeof body === 'string' && body.trim()) setManagedAboutBody(body);
    });
    return () => {
      active = false;
    };
  }, [language]);
  const isPrivacy = activeSection === 'privacy';
  const isTerms = activeSection === 'terms';
  const title = isPrivacy
    ? content.privacyPage.title
    : isTerms
      ? content.termsPage.title
      : activeSection === 'contact'
        ? content.contactTitle
        : content.about;

  return (
    <KeyboardAwareScrollViewCompat
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
      ]}
      bottomOffset={64}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="arrow-right" size={19} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.kicker, { color: colors.primary }]}>OrthoTypikon</Text>
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>

      {isPrivacy ? (
        <View style={styles.privacyContent}>
          <View style={[styles.introCard, { backgroundColor: colors.primary }]}>
            <Feather name="shield" size={22} color={colors.accent} />
            <Text style={[styles.intro, { color: colors.primaryForeground }]}>
              {content.privacyPage.intro}
            </Text>
            <Text style={[styles.updated, { color: colors.primaryForeground }]}>
              {content.privacyPage.updated}
            </Text>
          </View>
          {content.privacyPage.sections.map((item) => (
            <View
              key={item.title}
              style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>{item.body}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {isTerms ? (
        <View style={styles.privacyContent}>
          <View
            style={[
              styles.legalNotice,
              {
                backgroundColor: colors.muted,
                borderColor: colors.border,
                flexDirection: language === 'ar' ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Feather name="alert-triangle" size={18} color={colors.primary} />
            <Text
              style={[
                styles.legalDisclaimer,
                { color: colors.mutedForeground, textAlign },
              ]}
            >
              {content.termsPage.disclaimer}
            </Text>
          </View>
          <View style={[styles.introCard, { backgroundColor: colors.primary }]}>
            <Feather name="file-text" size={22} color={colors.accent} />
            <Text style={[styles.intro, { color: colors.primaryForeground, textAlign }]}>
              {content.termsPage.intro}
            </Text>
            <Text style={[styles.updated, { color: colors.primaryForeground, textAlign }]}>
              {content.termsPage.updated}
            </Text>
          </View>
          {content.termsPage.sections.map((item) => (
            <View
              key={item.title}
              style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>
                {item.title}
              </Text>
              <Text style={[styles.body, { color: colors.mutedForeground, textAlign }]}>
                {item.body}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {activeSection === 'about' ? (
        <View style={[styles.introCard, { backgroundColor: colors.primary }]}>
          <Feather name="info" size={22} color={colors.accent} />
          <Text
            style={[
              styles.intro,
              { color: colors.primaryForeground, textAlign },
            ]}
          >
            {resolveAboutBody(language, managedAboutBody)}
          </Text>
        </View>
      ) : null}
      {activeSection === 'contact' ? <ContactForm /> : null}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 14 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 12, fontWeight: '600' },
  title: { textAlign: 'right', fontSize: 28, fontWeight: '700', marginTop: 4 },
  privacyContent: { gap: 12, marginTop: 4 },
  legalNotice: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, alignItems: 'flex-start' },
  legalDisclaimer: { flex: 1, fontSize: 12, lineHeight: 19, fontWeight: '500' },
  introCard: { borderRadius: 20, padding: 18, gap: 10 },
  intro: { textAlign: 'right', fontSize: 14, lineHeight: 23, fontWeight: '600' },
  updated: { textAlign: 'right', fontSize: 11, opacity: 0.82 },
  section: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 },
  sectionTitle: { textAlign: 'right', fontSize: 16, lineHeight: 22, fontWeight: '800' },
  body: { textAlign: 'right', fontSize: 13, lineHeight: 22 },
});