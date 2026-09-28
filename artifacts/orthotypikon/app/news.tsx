import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RegionalNewsSection } from '@/components/RegionalNewsSection';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/usePreferences';

export default function NewsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        testID="news-back"
        onPress={() => router.back()}
        style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        accessibilityLabel={t.notFound.back}
      >
        <Feather name="arrow-right" size={20} color={colors.primary} />
      </Pressable>
      <RegionalNewsSection fullPage />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginHorizontal: 20 },
});