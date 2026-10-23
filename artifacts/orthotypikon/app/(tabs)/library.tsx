import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ImageResizeMode } from 'react-native';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/usePreferences';
import type { LibraryTopicKey } from '@/components/LibraryTopicArtwork';
import { LibraryTopicImage } from '@/components/LibraryTopicImage';
import type { PrayerCollectionId } from '@/data/prayerCollections';
import { exploreItems } from '@/data/exploreItems';

const topics: Array<[LibraryTopicKey, string, number]> = [
  ['patristics', '#25394A', 0], ['theology', '#B47732', 2], ['saints-service', '#59483D', 3], ['heresies', '#936F42', 4],
  ['history', '#6C7C96', 5], ['liturgy', '#4D3026', 6], ['spiritual', '#534E50', 7], ['afterlife', '#55706B', 8], ['icons', '#B9824B', 9],
  ['saints', '#806A4C', 10], ['family', '#A3745B', 11], ['services', '#604831', 12], ['music', '#252B30', 13], ['theotokos', '#56708B', 14],
];

const tools = [
  { icon: 'circle', route: '/prayer', color: '#8C5948' },
  { icon: 'compass', route: '/compass', color: '#56708B' },
  { icon: 'coffee', route: '/fasting', color: '#55706B' },
  { icon: 'headphones', route: '/learn', color: '#6C7C96' },
  { icon: 'gift', route: '/pastoral', color: '#8C5948' },
  { icon: 'map-pin', route: '/places', color: '#B47732' },
] as const;

type FeatherIconName = ComponentProps<typeof Feather>['name'];

const prayerSections: Array<{
  collection?: Exclude<PrayerCollectionId, 'gospels'>;
  route?: '/relaxation-music';
  labelIndex: number;
  icon: FeatherIconName;
  color: string;
}> = [
  { collection: 'daily', labelIndex: 1, icon: 'sunrise', color: '#B47732' },
  { collection: 'various', labelIndex: 2, icon: 'book-open', color: '#25394A' },
  { collection: 'supplications', labelIndex: 3, icon: 'heart', color: '#8C5948' },
  { collection: 'epistles', labelIndex: 4, icon: 'mail', color: '#6C7C96' },
  { route: '/relaxation-music', labelIndex: 5, icon: 'music', color: '#55706B' },
];

type LibraryRailItem = {
  key: string;
  title: string;
  color: string;
  topic?: LibraryTopicKey;
  icon?: FeatherIconName;
  route?: (typeof tools)[number]['route'] | '/relaxation-music';
  prayerCollection?: PrayerCollectionId;
  imageUrl?: string;
  imageResizeMode?: ImageResizeMode;
};

function LibraryRail({
  title,
  items,
  titleColor,
  cardColor,
  borderColor,
  isRTL,
  onItemPress,
  testID,
  variant = 'default',
}: {
  title: string;
  items: LibraryRailItem[];
  titleColor: string;
  cardColor: string;
  borderColor: string;
  isRTL: boolean;
  onItemPress?: (item: LibraryRailItem) => void;
  testID: string;
  variant?: 'default' | 'explore';
}) {
  const railRef = useRef<ScrollView | null>(null);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: titleColor, textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
      <ScrollView
        ref={railRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        directionalLockEnabled
        onContentSizeChange={() => {
          if (isRTL) railRef.current?.scrollToEnd({ animated: false });
        }}
        contentContainerStyle={[
          styles.rail,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
        style={styles.railScroll}
        testID={testID}
      >
        {Array.from({ length: Math.ceil(items.length / 2) }, (_, groupIndex) => (
          <View
            key={`${testID}-group-${groupIndex}`}
            style={[styles.railGroup, variant === 'explore' ? styles.exploreRailGroup : undefined]}
          >
            {items.slice(groupIndex * 2, groupIndex * 2 + 2).map((item, groupItemIndex) => {
              const artwork = (
                <View style={[
                  styles.artwork,
                   item.topic || item.imageUrl ? styles.wideArtwork : undefined,
                  { backgroundColor: item.color },
                ]}>
                  {item.topic ? (
                    <LibraryTopicImage
                      topic={item.topic}
                      resizeMode="contain"
                      style={StyleSheet.absoluteFillObject}
                    />
                  ) : item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      resizeMode={item.imageResizeMode ?? 'stretch'}
                      style={styles.exploreImage}
                    />
                  ) : item.icon ? (
                    <Feather name={item.icon} size={38} color="#FFF5E4" />
                  ) : null}
                </View>
              );
              const cardContent = (
                <>
                  {artwork}
                  <Text style={[styles.cardLabel, { color: titleColor }]} numberOfLines={2}>{item.title}</Text>
                </>
              );
              const cardStyle = [
                styles.card,
                { backgroundColor: cardColor, borderColor },
              ];

              return (item.route || item.prayerCollection) && onItemPress ? (
                <Pressable
                  key={item.key}
                  testID={`${testID}-${groupIndex * 2 + groupItemIndex}`}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  onPress={() => onItemPress(item)}
                  style={({ pressed }) => [cardStyle, { opacity: pressed ? 0.76 : 1 }]}
                >
                  {cardContent}
                </Pressable>
              ) : (
                <View
                  key={item.key}
                  testID={`${testID}-${groupIndex * 2 + groupItemIndex}`}
                  accessible
                  accessibilityLabel={item.title}
                  style={cardStyle}
                >
                  {cardContent}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollView | null>(null);
  const [prayersSectionY, setPrayersSectionY] = useState<number | null>(null);
  const { t, language } = useI18n();
  const isRTL = language === 'ar';
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    if (section !== 'prayers' || prayersSectionY === null) return;
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: prayersSectionY, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [section, prayersSectionY]);

  const topicItems: LibraryRailItem[] = topics.map(([topic, color, sectionIndex]) => ({
    key: topic,
    title: t.library.sections[sectionIndex],
    color,
    topic,
  }));
  const toolItems: LibraryRailItem[] = tools.map((tool, index) => {
    const matchingExploreItem = exploreItems.find((item) => item.route === tool.route);
    return {
      ...tool,
      key: tool.route,
      title: t.library.toolTitles[index],
      color: matchingExploreItem?.color ?? tool.color,
      imageUrl: matchingExploreItem && 'imageUrl' in matchingExploreItem
        ? matchingExploreItem.imageUrl
        : undefined,
      imageResizeMode: matchingExploreItem && 'imageResizeMode' in matchingExploreItem
        ? matchingExploreItem.imageResizeMode
        : undefined,
    };
  });
  const prayerItems: LibraryRailItem[] = prayerSections.map((section) => ({
    key: `prayer-section-${section.collection ?? section.route}`,
    title: t.library.prayerSections[section.labelIndex],
    color: section.color,
    icon: section.icon,
    ...(section.collection ? { prayerCollection: section.collection } : {}),
    ...(section.route ? { route: section.route } : {}),
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + webTopInset + 18, paddingBottom: insets.bottom + 100 },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.headerCopy, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.kicker, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>{t.library.kicker}</Text>
            <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>{t.library.title}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: isRTL ? 'right' : 'left' }]}>{t.library.subtitle}</Text>
          </View>
        </View>
        <LibraryRail
          title={t.library.topics}
          items={topicItems}
          titleColor={colors.foreground}
          cardColor={colors.card}
          borderColor={colors.border}
          isRTL={isRTL}
          onItemPress={(item) => {
            if (item.route) router.push(item.route);
          }}
          variant="explore"
          testID="library-topics-rail"
        />
        <LibraryRail
          title={t.library.tools}
          items={toolItems}
          titleColor={colors.foreground}
          cardColor={colors.card}
          borderColor={colors.border}
          isRTL={isRTL}
          onItemPress={(item) => {
            if (item.route) router.push(item.route);
          }}
          variant="explore"
          testID="library-tools-rail"
        />
        <View
          testID="library-prayers-section"
          onLayout={(event) => setPrayersSectionY(event.nativeEvent.layout.y)}
        >
          <LibraryRail
            title={t.library.prayers}
            items={prayerItems}
            titleColor={colors.foreground}
            cardColor={colors.card}
            borderColor={colors.border}
            isRTL={isRTL}
            onItemPress={(item) => {
              if (item.route) {
                router.push(item.route);
                return;
              }
              if (item.prayerCollection) {
                router.push({
                  pathname: '/prayer-collection',
                  params: { collection: item.prayerCollection },
                });
              }
            }}
            variant="explore"
            testID="library-prayers-rail"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 22 },
  header: { paddingBottom: 2 },
  headerCopy: { alignItems: 'flex-end' },
  kicker: { fontSize: 11, fontWeight: '700', textAlign: 'right' },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'right', marginTop: 3 },
  subtitle: { fontSize: 12, textAlign: 'right', marginTop: 4 },
  section: { gap: 9 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  railScroll: { marginHorizontal: -18 },
  rail: { gap: 10, paddingHorizontal: 18 },
  railGroup: { width: 124, flexDirection: 'column', gap: 8 },
  exploreRailGroup: { width: 137 },
  card: { width: '100%', height: 148, borderRadius: 15, borderWidth: 1, padding: 6, flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 5, overflow: 'hidden' },
  artwork: { width: 96, height: 96, borderRadius: 11, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  wideArtwork: { width: '100%', height: 97 },
  exploreImage: { width: '100%', height: '100%' },
  cardLabel: { width: '100%', fontSize: 12, lineHeight: 16, fontWeight: '700', textAlign: 'center' },
});