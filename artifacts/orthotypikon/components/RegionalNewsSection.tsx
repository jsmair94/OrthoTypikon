import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/usePreferences';
import {
  fetchJordanNews,
  NEWS_REGION_SOURCES,
  type NewsArticle,
  type NewsRegionKey,
} from '@/data/news';

const REGION_KEYS: readonly NewsRegionKey[] = ['jordan', 'syria', 'lebanon'];

function formatPublishedAt(value: string | undefined, language: 'ar' | 'en' | 'el') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar' : language === 'el' ? 'el' : 'en', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function ArticleCard({
  article,
  language,
  onPress,
}: {
  article: NewsArticle;
  language: 'ar' | 'en' | 'el';
  onPress: () => void;
}) {
  const colors = useColors();
  const date = formatPublishedAt(article.publishedAt, language);

  return (
    <Pressable
      testID={`news-article-${article.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.articleCard,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.78 : 1 },
      ]}
    >
      <View style={[styles.articleIcon, { backgroundColor: colors.secondary }]}>
        <Feather name="file-text" size={18} color={colors.primary} />
      </View>
      <Text style={[styles.articleTitle, { color: colors.foreground }]} numberOfLines={3}>
        {article.title}
      </Text>
      <View style={styles.articleFooter}>
        <Text style={[styles.articleMeta, { color: colors.mutedForeground }]}>{date}</Text>
        <Feather name="external-link" size={14} color={colors.primary} />
      </View>
    </Pressable>
  );
}

function RegionRail({ regionKey }: { regionKey: NewsRegionKey }) {
  const colors = useColors();
  const { language, t } = useI18n();
  const articleRailRef = useRef<ScrollView | null>(null);
  const source = NEWS_REGION_SOURCES.find((item) => item.key === regionKey);
  const jordanQuery = useQuery({
    queryKey: ['regional-news', 'jordan'],
    queryFn: fetchJordanNews,
    enabled: regionKey === 'jordan',
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const articles = regionKey === 'jordan' ? (jordanQuery.data ?? []) : [];
  const isLoading = regionKey === 'jordan' && jordanQuery.isLoading;
  const hasError = regionKey === 'jordan' && jordanQuery.isError;

  const openSource = () => {
    if (source?.websiteUrl) void WebBrowser.openBrowserAsync(source.websiteUrl);
  };

  return (
    <View style={styles.regionBlock}>
      <View style={styles.regionHeader}>
        <View style={styles.regionTitleWrap}>
          <View style={[styles.regionIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="map-pin" size={15} color={colors.primary} />
          </View>
          <Text style={[styles.regionTitle, { color: colors.foreground }]}>
            {t.news.regions[regionKey]}
          </Text>
        </View>
        {source?.websiteUrl ? (
          <Pressable testID={`news-source-${regionKey}`} onPress={openSource} style={styles.sourceButton}>
            <Text style={[styles.sourceButtonText, { color: colors.primary }]}>{t.news.openSource}</Text>
            <Feather name="external-link" size={13} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="loader" size={17} color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{t.news.loading}</Text>
        </View>
      ) : hasError ? (
        <Pressable onPress={openSource} style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="wifi-off" size={17} color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.foreground }]}>{t.news.error}</Text>
          <Feather name="external-link" size={15} color={colors.primary} />
        </Pressable>
      ) : articles.length > 0 ? (
        <ScrollView
          ref={articleRailRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => articleRailRef.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={styles.articleRail}
          style={styles.articleRailScroll}
        >
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              language={language}
              onPress={() => void WebBrowser.openBrowserAsync(article.link)}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name={source?.websiteUrl ? 'rss' : 'link'} size={17} color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
            {source?.websiteUrl ? t.news.noArticles : t.news.sourcePending}
          </Text>
        </View>
      )}
    </View>
  );
}

export function RegionalNewsSection({ fullPage = false }: { fullPage?: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const { t } = useI18n();
  const regionKeys: readonly NewsRegionKey[] = fullPage ? REGION_KEYS : ['jordan'];

  return (
    <View style={[styles.container, fullPage && styles.fullPageContainer]}>
      <View style={styles.sectionHeading}>
        <View style={styles.headingCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{t.news.eyebrow}</Text>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.news.title}</Text>
        </View>
        {!fullPage ? (
          <Pressable testID="news-see-all" onPress={() => router.push('/news')} style={styles.seeAllButton}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>{t.news.seeAll}</Text>
            <Feather name="arrow-left" size={15} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t.news.subtitle}</Text>
      {regionKeys.map((regionKey) => (
        <RegionRail key={regionKey} regionKey={regionKey} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  fullPageContainer: { paddingHorizontal: 20 },
  sectionHeading: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  headingCopy: { flex: 1, alignItems: 'flex-end' },
  eyebrow: { fontSize: 11, fontWeight: '600', textAlign: 'right' },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 3, textAlign: 'right' },
  subtitle: { fontSize: 12, lineHeight: 19, textAlign: 'right' },
  seeAllButton: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingVertical: 6 },
  seeAllText: { fontSize: 12, fontWeight: '700' },
  regionBlock: { gap: 9 },
  regionHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  regionTitleWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  regionIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  regionTitle: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
  sourceButton: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  sourceButtonText: { fontSize: 11, fontWeight: '600' },
  articleRailScroll: { marginHorizontal: -20 },
  articleRail: { flexDirection: 'row-reverse', gap: 10, paddingHorizontal: 20 },
  articleCard: { width: 218, minHeight: 142, borderRadius: 17, borderWidth: 1, padding: 13, gap: 9 },
  articleIcon: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  articleTitle: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '700', textAlign: 'right' },
  articleFooter: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  articleMeta: { fontSize: 10, textAlign: 'right' },
  statusCard: { minHeight: 58, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  statusText: { flex: 1, fontSize: 12, lineHeight: 18, textAlign: 'right' },
});