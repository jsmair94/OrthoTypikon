import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  type SharedValue,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/usePreferences';
import type { LibraryTopicKey } from '@/components/LibraryTopicArtwork';
import { LibraryTopicImage } from '@/components/LibraryTopicImage';

const topics: Array<[LibraryTopicKey, string]> = [
  ['patristics', '#25394A'], ['bible', '#7C5D42'], ['theology', '#B47732'], ['saints-service', '#59483D'], ['heresies', '#936F42'],
  ['history', '#6C7C96'], ['liturgy', '#4D3026'], ['spiritual', '#534E50'], ['afterlife', '#55706B'], ['icons', '#B9824B'],
  ['saints', '#806A4C'], ['family', '#A3745B'], ['services', '#604831'], ['music', '#252B30'], ['theotokos', '#56708B'],
];

const tools = [
  { icon: 'circle', route: '/prayer', color: '#8C5948' },
  { icon: 'compass', route: '/compass', color: '#56708B' },
  { icon: 'coffee', route: '/fasting', color: '#55706B' },
  { icon: 'headphones', route: '/learn', color: '#6C7C96' },
  { icon: 'users', route: '/pastoral', color: '#8C5948' },
] as const;

type TopicCardProps = {
  topic: LibraryTopicKey;
  background: string;
  title: string;
  titleColor: string;
  index: number;
  cardWidth: number;
  rowHeight: number;
  scrollY: SharedValue<number>;
};

function TopicCard({ topic, background, title, titleColor, index, cardWidth, rowHeight, scrollY }: TopicCardProps) {
  const rowIndex = Math.floor(index / 2);
  const cardStyle = useAnimatedStyle(() => {
    const distance = rowIndex * rowHeight - scrollY.value;
    return {
      opacity: interpolate(distance, [-rowHeight, 0, rowHeight], [0.58, 1, 0.58], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(distance, [-rowHeight, 0, rowHeight], [18, 0, 18], Extrapolation.CLAMP) },
        { scale: interpolate(distance, [-rowHeight, 0, rowHeight], [0.97, 1, 0.97], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.topicCard, { width: cardWidth }, cardStyle]}>
      <Pressable
        testID={`library-${index}`}
        style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
      >
        <View style={[styles.topicImageFrame, { backgroundColor: background }]}>
          <LibraryTopicImage topic={topic} resizeMode="contain" style={styles.topicImage} />
        </View>
        <Text style={[styles.topicTitle, { color: titleColor }]} numberOfLines={2}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const scrollY = useSharedValue(0);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const horizontalPadding = 16;
  const columnGap = 12;
  const cardWidth = Math.max(132, (windowWidth - horizontalPadding * 2 - columnGap) / 2);
  const rowHeight = cardWidth + 68;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Animated.FlatList
        data={topics}
        keyExtractor={([topic]) => topic}
        numColumns={2}
        renderItem={({ item: [topic, background], index }) => (
          <TopicCard
            topic={topic}
            background={background}
            title={t.library.sections[index]}
            titleColor={colors.foreground}
            index={index}
            cardWidth={cardWidth}
            rowHeight={rowHeight}
            scrollY={scrollY}
          />
        )}
        ListHeaderComponent={
          <View style={[styles.header, { paddingTop: insets.top + webTopInset + 18 }]}>
            <View style={styles.headerCopy}>
              <Text style={[styles.kicker, { color: colors.primary }]}>{t.library.kicker}</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>{t.library.title}</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t.library.subtitle}</Text>
            </View>
            <View style={styles.toolsHeader}>
              <Text style={[styles.toolsLabel, { color: colors.foreground }]}>{t.library.tools}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tools}
              >
                {tools.map((tool, index) => (
                  <Pressable
                    key={tool.route}
                    testID={`library-tool-${index}`}
                    onPress={() => router.push(tool.route)}
                    style={({ pressed }) => [styles.tool, { backgroundColor: tool.color, opacity: pressed ? 0.74 : 1 }]}
                  >
                    <Feather name={tool.icon as any} size={15} color="#FFF5E4" />
                    <Text style={styles.toolTitle} numberOfLines={1}>{t.library.toolTitles[index]}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <Text style={[styles.topicsLabel, { color: colors.foreground }]}>{t.library.topics}</Text>
          </View>
        }
        columnWrapperStyle={styles.column}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingBottom: insets.bottom + 100,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingBottom: 14 },
  headerCopy: { alignItems: 'flex-end' },
  kicker: { fontSize: 11, fontWeight: '700', textAlign: 'right' },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'right', marginTop: 3 },
  subtitle: { fontSize: 12, textAlign: 'right', marginTop: 4 },
  toolsHeader: { marginTop: 14, gap: 7 },
  toolsLabel: { fontSize: 12, fontWeight: '700', textAlign: 'right' },
  tools: { flexDirection: 'row-reverse', gap: 7 },
  tool: { minWidth: 94, height: 34, paddingHorizontal: 9, borderRadius: 17, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5 },
  toolTitle: { color: '#FFFFFF', fontSize: 9, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  topicsLabel: { fontSize: 18, fontWeight: '800', textAlign: 'right', marginTop: 18 },
  column: { gap: 12, marginBottom: 14 },
  topicCard: { overflow: 'visible' },
  topicImageFrame: { width: '100%', aspectRatio: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,245,228,0.55)', shadowColor: '#0C161E', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 7, alignItems: 'center', justifyContent: 'center' },
  topicImage: { width: '94%', height: '94%' },
  topicTitle: { fontSize: 14, lineHeight: 20, fontWeight: '800', textAlign: 'right', marginTop: 8, minHeight: 40 },
});