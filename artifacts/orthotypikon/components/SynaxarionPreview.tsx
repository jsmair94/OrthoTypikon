import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  getGetSynaxarionHomepageQueryKey,
  useGetSynaxarionHomepage,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useI18n, usePreferences } from '@/hooks/usePreferences';
import { getDailyWidgetContent } from '@/data/dailyWidget';
import { LibraryTopicImage } from '@/components/LibraryTopicImage';
import { fetchSynaxarionFromSource } from '@/lib/synaxarionSource';
import type { HomeDailyContent } from '@/lib/homeDailyContent';

type SynaxarionPreviewProps = {
  dailyContent: Pick<HomeDailyContent, 'occasionTitle' | 'occasionDescription'>;
};

export function SynaxarionPreview({ dailyContent }: SynaxarionPreviewProps) {
  const colors = useColors();
  const { language, t } = useI18n();
  const { calendarType } = usePreferences();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [expandedArticleKey, setExpandedArticleKey] = useState<string | null>(null);
  const isRtl = language === 'ar';
  const offlineToday = getDailyWidgetContent(new Date(), calendarType);
  const synaxarionParams = { locale: language };
  const synaxarionQuery = useGetSynaxarionHomepage({
    locale: language
  }, {
    query: {
      queryKey: getGetSynaxarionHomepageQueryKey(synaxarionParams),
      ...(Platform.OS === 'web'
        ? {}
        : {
            queryFn: ({ signal }: { signal: AbortSignal }) =>
              fetchSynaxarionFromSource(language, signal),
          }),
      staleTime: 5 * 60 * 1000,
      retry: 1,
      enabled: Platform.OS !== 'web' || Boolean(process.env.EXPO_PUBLIC_DOMAIN),
    },
  });
  const source = synaxarionQuery.data;
  const saints = dailyContent.occasionDescription;
  const occasion = dailyContent.occasionTitle;
  const dateLabel = source?.dateLabel ?? (language === 'ar' ? offlineToday.displayDate : t.synaxarion.today);
  const articleKey = `${dateLabel}:${occasion}`;
  const isArticleExpanded = expandedArticleKey === articleKey;
  const canExpandArticle = saints.trim().length > 100;
  const closeImageLabel =
    language === 'ar' ? 'إغلاق الصورة' : language === 'el' ? 'Κλείσιμο εικόνας' : 'Close image';

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.foreground, textAlign: isRtl ? 'right' : 'left' },
        ]}
      >
        {t.synaxarion.title}
      </Text>
      <LinearGradient
        colors={[colors.heroStart, colors.heroEnd]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.featureCard}
      >
        <View
          style={[
            styles.featureContent,
            { alignItems: isRtl ? 'flex-end' : 'flex-start' },
          ]}
        >
          <View
            style={[
              styles.dateRow,
              { flexDirection: isRtl ? 'row-reverse' : 'row' },
            ]}
          >
            <Feather name="calendar" size={13} color={colors.accent} />
            <Text
              style={[
                styles.dateLabel,
                {
                  color: colors.heroForeground,
                  textAlign: isRtl ? 'right' : 'left',
                },
              ]}
            >
              {dateLabel}
            </Text>
          </View>
          <Text
            style={[
              styles.occasion,
              {
                color: colors.heroForeground,
                textAlign: isRtl ? 'right' : 'left',
              },
            ]}
          >
            {occasion}
          </Text>
          <View
            style={[
              styles.saintRow,
              { flexDirection: isRtl ? 'row-reverse' : 'row' },
            ]}
          >
            <Feather name="star" size={14} color={colors.accent} />
            <Text
              style={[
                styles.saintName,
                {
                  color: colors.heroForeground,
                  textAlign: isRtl ? 'right' : 'left',
                },
              ]}
              numberOfLines={isArticleExpanded ? undefined : 3}
            >
              {saints}
            </Text>
          </View>
          {canExpandArticle && (
            <Pressable
              testID="synaxarion-article-toggle"
              accessibilityRole="button"
              accessibilityLabel={isArticleExpanded ? t.synaxarion.showLess : t.synaxarion.showMore}
              accessibilityState={{ expanded: isArticleExpanded }}
              onPress={() => setExpandedArticleKey(isArticleExpanded ? null : articleKey)}
              style={[
                styles.articleToggle,
                {
                  flexDirection: isRtl ? 'row-reverse' : 'row',
                  alignSelf: isRtl ? 'flex-end' : 'flex-start',
                },
              ]}
            >
              <Text style={[styles.articleToggleText, { color: colors.accent }]}>
                {isArticleExpanded ? t.synaxarion.showLess : t.synaxarion.showMore}
              </Text>
              <Feather
                name={isArticleExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.accent}
              />
            </Pressable>
          )}
        </View>
        <View style={styles.heroArtwork}>
          <View style={[styles.heroHalo, { borderColor: colors.accent }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={occasion}
            accessibilityHint={language === 'ar' ? 'اضغط لعرض الصورة كاملة' : language === 'el' ? 'Πατήστε για πλήρη προβολή εικόνας' : 'Tap to view the full image'}
            onPress={() => setIsImageOpen(true)}
            style={({ pressed }) => [
              styles.imageFrame,
              { backgroundColor: colors.secondary, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            {source?.saintImageUrl ? (
              <Image source={{ uri: source.saintImageUrl }} resizeMode="cover" style={styles.image} />
            ) : (
              <LibraryTopicImage topic="saints" resizeMode="contain" style={styles.image} />
            )}
            <View style={[styles.imageBadge, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={13} color={colors.accent} />
            </View>
          </Pressable>
        </View>
      </LinearGradient>

      <Modal
        visible={isImageOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsImageOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeImageLabel}
            onPress={() => setIsImageOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityViewIsModal
            style={[
              styles.imageDialog,
              {
                width: Math.min(windowWidth - 40, 440),
                height: Math.min(windowHeight * 0.78, 680),
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.dialogHeader, { flexDirection: isRtl ? 'row' : 'row-reverse' }]}>
              <Text numberOfLines={1} style={[styles.dialogTitle, { color: colors.foreground }]}>
                {occasion}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={closeImageLabel}
                hitSlop={10}
                onPress={() => setIsImageOpen(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
            </View>
            <View style={[styles.largeImageFrame, { backgroundColor: colors.secondary }]}>
              {source?.saintImageUrl ? (
                <Image source={{ uri: source.saintImageUrl }} resizeMode="contain" style={styles.largeImage} />
              ) : (
                <LibraryTopicImage topic="saints" resizeMode="contain" style={styles.largeImage} />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  sectionTitle: { fontSize: 18, lineHeight: 26, fontWeight: '700' },
  featureCard: { minHeight: 180, borderRadius: 26, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  featureContent: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 7 },
  dateRow: { alignItems: 'center', gap: 6 },
  dateLabel: { flexShrink: 1, fontSize: 10, fontWeight: '600' },
  occasion: { fontSize: 20, lineHeight: 28, fontWeight: '800', marginTop: 2 },
  saintRow: { alignItems: 'flex-start', gap: 6 },
  saintName: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 19, opacity: 0.84 },
  articleToggleText: { fontSize: 11, fontWeight: '700' },
  articleToggle: { alignItems: 'center', gap: 4, paddingVertical: 2 },
  heroArtwork: { width: 100, height: 132, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  heroHalo: { position: 'absolute', width: 92, height: 92, borderRadius: 46, borderWidth: 1, opacity: 0.35 },
  imageFrame: { width: 90, height: 120, flexShrink: 0, borderRadius: 15, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageBadge: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', position: 'absolute', bottom: 7, right: 7 },
  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(8, 15, 22, 0.78)' },
  imageDialog: { maxWidth: '100%', borderRadius: 22, borderWidth: 1, padding: 12, gap: 10, overflow: 'hidden' },
  dialogHeader: { minHeight: 34, alignItems: 'center', gap: 8 },
  dialogTitle: { flex: 1, fontSize: 15, fontWeight: '700', textAlign: 'left' },
  closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  largeImageFrame: { flex: 1, width: '100%', borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  largeImage: { width: '100%', height: '100%' },
});