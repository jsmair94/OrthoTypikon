import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/usePreferences';
import { useHymnPlayer } from '@/hooks/useHymnPlayer';

export default function RelaxationMusicScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language } = useI18n();
  const { isPlaying, isLoading, hasError, toggle } = useHymnPlayer();
  const copy = t.relaxationMusic;
  const isRTL = language === 'ar';
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  return (
    <ScrollView
      testID="relaxation-music-screen"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + webTopInset + 18,
          paddingBottom: insets.bottom + webBottomInset + 32,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable
          testID="relaxation-music-back"
          accessibilityRole="button"
          accessibilityLabel={copy.back}
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={20} color={colors.primary} />
        </Pressable>
        <View style={[styles.heading, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.eyebrow, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
            {copy.eyebrow}
          </Text>
          <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>
            {copy.title}
          </Text>
        </View>
      </View>

      <View style={[styles.playerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.artwork, { backgroundColor: colors.secondary }]}>
          <Feather name="music" size={42} color={colors.primary} />
        </View>
        <Text style={[styles.description, { color: colors.mutedForeground, textAlign: isRTL ? 'right' : 'left' }]}>
          {copy.description}
        </Text>
        <Pressable
          testID="relaxation-music-toggle"
          accessibilityRole="button"
          accessibilityLabel={hasError ? copy.retry : isLoading ? copy.loading : isPlaying ? copy.pause : copy.play}
          accessibilityState={{ disabled: isLoading, busy: isLoading }}
          disabled={isLoading}
          onPress={() => void toggle()}
          style={({ pressed }) => [
            styles.playButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.8 : isLoading ? 0.7 : 1,
            },
          ]}
        >
          <Feather name={isPlaying ? 'pause' : 'play'} size={19} color={colors.primaryForeground} />
          <Text style={[styles.playLabel, { color: colors.primaryForeground }]}>
            {hasError ? copy.retry : isLoading ? copy.loading : isPlaying ? copy.pause : copy.play}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 18, gap: 20 },
  header: { alignItems: 'center', gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, gap: 4 },
  eyebrow: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 25, fontWeight: '800' },
  playerCard: { alignItems: 'center', gap: 18, borderWidth: 1, borderRadius: 20, padding: 20 },
  artwork: { width: 144, height: 144, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  description: { width: '100%', fontSize: 14, lineHeight: 23 },
  playButton: { minHeight: 50, width: '100%', borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  playLabel: { fontSize: 14, fontWeight: '700' },
});
