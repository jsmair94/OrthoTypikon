import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Alert, AppState, Image, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Circle, Line, Path, Rect, Svg } from 'react-native-svg';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  getGetSynaxarionDailyGospelQueryKey,
  getGetSynaxarionHomepageQueryKey,
  useGetSynaxarionDailyGospel,
  useGetSynaxarionHomepage,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useI18n, usePreferences } from '@/hooks/usePreferences';
import { useHymnPlayer } from '@/hooks/useHymnPlayer';
import { dateKeyFromDate, getDailyWidgetContent } from '@/data/dailyWidget';
import { getCalendarEntryForType } from '@/data/calendar2026';
import { fetchDailyGospelFromSource, fetchSynaxarionFromSource } from '@/lib/synaxarionSource';
import { resolveHomeDailyContent } from '@/lib/homeDailyContent';
import { RegionalNewsSection } from '@/components/RegionalNewsSection';
import { SynaxarionPreview } from '@/components/SynaxarionPreview';
import { exploreItems } from '@/data/exploreItems';

const DAILY_GOSPEL_SOURCE_URL =
  'https://orthodoxjo.tv/%d8%b1%d8%b3%d8%a7%d9%84%d8%a9-%d9%88-%d8%a5%d9%86%d8%ac%d9%8a%d9%84-%d8%a7%d9%84%d9%8a%d9%88%d9%85/';

type HomeIconName =
  | 'sun'
  | 'radio'
  | 'heart'
  | 'book'
  | 'book-open'
  | 'home'
  | 'image'
  | 'clock'
  | 'sunrise'
  | 'star'
  | 'layers'
  | 'music'
  | 'crosshair'
  | 'rss'
  | 'cross'
  | 'compass'
  | 'coffee'
  | 'headphones'
  | 'users'
  | 'bell'
  | 'search'
  | 'arrow-left'
  | 'arrow-right'
  | 'bookmark'
  | 'share'
  | 'play'
  | 'pause'
  | 'church'
  | 'close';

function HomeIcon({ name, color, size = 23, style }: { name: HomeIconName; color: string; size?: number; style?: StyleProp<ViewStyle> }) {
  const common = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {name === 'sun' ? (
        <>
          <Circle cx="12" cy="12" r="4" {...common} />
          <Line x1="12" y1="2.5" x2="12" y2="5" {...common} /><Line x1="12" y1="19" x2="12" y2="21.5" {...common} />
          <Line x1="2.5" y1="12" x2="5" y2="12" {...common} /><Line x1="19" y1="12" x2="21.5" y2="12" {...common} />
          <Line x1="5.3" y1="5.3" x2="7.1" y2="7.1" {...common} /><Line x1="16.9" y1="16.9" x2="18.7" y2="18.7" {...common} />
          <Line x1="18.7" y1="5.3" x2="16.9" y2="7.1" {...common} /><Line x1="7.1" y1="16.9" x2="5.3" y2="18.7" {...common} />
        </>
      ) : name === 'radio' ? (
        <>
          <Circle cx="12" cy="12" r="2" {...common} />
          <Path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.8 4.8a10 10 0 0 0 0 14.4M19.2 4.8a10 10 0 0 1 0 14.4" {...common} />
        </>
      ) : name === 'heart' ? (
        <Path d="M20.8 8.8c0 5.2-8.8 10.2-8.8 10.2S3.2 14 3.2 8.8A4.6 4.6 0 0 1 12 6.5a4.6 4.6 0 0 1 8.8 2.3Z" {...common} />
      ) : name === 'book' ? (
        <>
          <Path d="M4 5.5h9a3 3 0 0 1 3 3V19H7a3 3 0 0 1-3-3V5.5Z" {...common} />
          <Path d="M20 5.5h-4v13h4V5.5ZM8 11h4M10 9v4" {...common} />
        </>
      ) : name === 'book-open' ? (
        <>
          <Path d="M3.5 5.5A2.5 2.5 0 0 1 6 3h5a2 2 0 0 1 2 2v15a2 2 0 0 0-2-2H6a2.5 2.5 0 0 0-2.5 2.5v-15Z" {...common} />
          <Path d="M20.5 5.5A2.5 2.5 0 0 0 18 3h-5a2 2 0 0 0-2 2v15a2 2 0 0 1 2-2h5a2.5 2.5 0 0 1 2.5 2.5v-15Z" {...common} />
        </>
      ) : name === 'home' ? (
        <Path d="m3 11 9-7 9 7M5 10v10h14V10M9 20v-6h6v6" {...common} />
      ) : name === 'image' ? (
        <>
          <Rect x="3" y="4" width="18" height="16" rx="2" {...common} />
          <Circle cx="8.5" cy="9" r="1.5" {...common} />
          <Path d="m3 17 5-5 4 4 3-3 6 6" {...common} />
        </>
      ) : name === 'clock' ? (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M12 7v5l3 2" {...common} />
        </>
      ) : name === 'sunrise' ? (
        <>
          <Path d="M3 18h18M5 15a7 7 0 0 1 14 0M12 3v3M5.6 6.6l2.1 2.1M18.4 6.6l-2.1 2.1" {...common} />
        </>
      ) : name === 'star' ? (
        <Path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" {...common} />
      ) : name === 'layers' ? (
        <Path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" {...common} />
      ) : name === 'music' ? (
        <>
          <Path d="M9 18V5l10-2v13" {...common} />
          <Circle cx="6" cy="18" r="3" {...common} />
          <Circle cx="16" cy="16" r="3" {...common} />
        </>
      ) : name === 'crosshair' ? (
        <>
          <Circle cx="12" cy="12" r="7" {...common} />
          <Circle cx="12" cy="12" r="2" {...common} />
          <Line x1="12" y1="2" x2="12" y2="5" {...common} />
          <Line x1="12" y1="19" x2="12" y2="22" {...common} />
          <Line x1="2" y1="12" x2="5" y2="12" {...common} />
          <Line x1="19" y1="12" x2="22" y2="12" {...common} />
        </>
      ) : name === 'rss' ? (
        <>
          <Circle cx="5.5" cy="18.5" r="1.2" fill={color} />
          <Path d="M5 13a6 6 0 0 1 6 6M5 7a12 12 0 0 1 12 12" {...common} />
        </>
      ) : name === 'cross' ? (
        <Path d="M12 3v18M7.5 7.5h9" {...common} />
      ) : name === 'compass' ? (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="m14.8 9.2-2 5-5 2 2-5 5-2Z" {...common} />
        </>
      ) : name === 'coffee' ? (
        <>
          <Path d="M4 9h12v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9ZM16 11h2a2.5 2.5 0 0 1 0 5h-2M8 5c0 1 1 1 1 2M12 5c0 1 1 1 1 2" {...common} />
          <Line x1="3" y1="20" x2="19" y2="20" {...common} />
        </>
      ) : name === 'headphones' ? (
        <>
          <Path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14v4a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2ZM20 14v4a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2Z" {...common} />
        </>
      ) : name === 'users' ? (
        <>
          <Circle cx="9" cy="8" r="3" {...common} /><Path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M16 14.5a5 5 0 0 1 4.5 5.5" {...common} />
        </>
      ) : name === 'bell' ? (
        <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" {...common} />
      ) : name === 'search' ? (
        <>
          <Circle cx="10.8" cy="10.8" r="6.8" {...common} /><Line x1="16" y1="16" x2="21" y2="21" {...common} />
        </>
      ) : name === 'bookmark' ? (
        <Path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z" {...common} />
      ) : name === 'share' ? (
        <>
          <Circle cx="18" cy="5" r="2.5" {...common} /><Circle cx="6" cy="12" r="2.5" {...common} /><Circle cx="18" cy="19" r="2.5" {...common} />
          <Path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" {...common} />
        </>
      ) : name === 'play' ? (
        <Path d="m8 5 11 7-11 7V5Z" {...common} />
      ) : name === 'pause' ? (
        <>
          <Line x1="8" y1="5" x2="8" y2="19" {...common} />
          <Line x1="16" y1="5" x2="16" y2="19" {...common} />
        </>
      ) : name === 'church' ? (
        <>
          <Path d="M12 3v4M9.5 5h5M5 10l7-4 7 4v10H5V10ZM9 20v-5h6v5M7 10h10" {...common} />
        </>
      ) : name === 'close' ? (
        <Path d="m6 6 12 12M18 6 6 18" {...common} />
      ) : (
        <Path d={name === 'arrow-left' ? 'M19 12H5m7-7-7 7 7 7' : 'M5 12h14m-7-7 7 7-7 7'} {...common} />
      )}
    </Svg>
  );
}

function localizeNumber(value: number, language: 'ar' | 'en' | 'el') {
  const number = String(value);
  return language === 'ar' ? number.replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]) : number;
}

function formatHomeDate(
  date: Date,
  language: 'ar' | 'en' | 'el',
  months: readonly string[],
  weekdays: readonly string[],
) {
  const civilDateKey = dateKeyFromDate(date);
  const [year, month, day] = civilDateKey.split('-').map(Number);
  const separator = language === 'ar' ? '،' : ',';
  return `${weekdays[date.getDay()]}${separator} ${localizeNumber(day, language)} ${months[month - 1]} ${localizeNumber(year, language)}`;
}

function DailyGospelAudioControl({
  sourceUrl,
  stopPlayerRef,
}: {
  sourceUrl: string;
  stopPlayerRef: MutableRefObject<(() => void) | null>;
}) {
  const colors = useColors();
  const { t } = useI18n();
  const player = useAudioPlayer(null, {
    updateInterval: 250,
    keepAudioSessionActive: true,
  });
  const audioStatus = useAudioPlayerStatus(player);
  const sourceLoaded = useRef(false);
  const isActiveRef = useRef(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    isActiveRef.current = true;
    stopPlayerRef.current = () => {
      player.pause();
      setIsPreparing(false);
    };
    return () => {
      isActiveRef.current = false;
      stopPlayerRef.current = null;
    };
  }, [player, stopPlayerRef]);

  useEffect(() => {
    if (audioStatus.playing) {
      setIsPreparing(false);
      setHasError(false);
    } else if (audioStatus.playbackState.toLowerCase().includes('error')) {
      setIsPreparing(false);
      setHasError(true);
    } else if (audioStatus.isLoaded && !audioStatus.isBuffering) {
      setIsPreparing(false);
    }
  }, [audioStatus.isBuffering, audioStatus.isLoaded, audioStatus.playbackState, audioStatus.playing]);

  const isLoading = isPreparing || audioStatus.isBuffering;
  const label = hasError
    ? t.home.gospelAudioError
    : isLoading
      ? t.home.gospelAudioLoading
      : audioStatus.playing
        ? t.home.gospelStop
        : t.home.gospelListen;

  const togglePlayback = async () => {
    if (audioStatus.playing) {
      player.pause();
      return;
    }

    setHasError(false);
    setIsPreparing(true);
    try {
      if (!sourceLoaded.current || hasError) {
        player.replace({ uri: sourceUrl });
        sourceLoaded.current = true;
      }
      if (
        audioStatus.didJustFinish ||
        (audioStatus.duration > 0 && audioStatus.currentTime >= audioStatus.duration)
      ) {
        await player.seekTo(0);
      }
      if (!isActiveRef.current) return;
      player.play();
    } catch {
      setIsPreparing(false);
      setHasError(true);
    }
  };

  return (
    <Pressable
      testID="gospel-speech-toggle"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isLoading, busy: isLoading }}
      disabled={isLoading}
      onPress={togglePlayback}
      style={({ pressed }) => [
        styles.gospelSpeakButton,
        {
          backgroundColor: colors.secondary,
          borderColor: colors.border,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <HomeIcon
        name={audioStatus.playing ? 'pause' : 'play'}
        size={18}
        color={colors.primary}
      />
      <Text style={[styles.gospelSpeakText, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useI18n();
  const { calendarType } = usePreferences();
  const { isPlaying, isLoading, hasError, toggle } = useHymnPlayer();
  const libraryRailRef = useRef<ScrollView | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [dailyContentView, setDailyContentView] = useState<'verse' | 'gospel'>('verse');
  const [gospelModalVisible, setGospelModalVisible] = useState(false);
  const gospelAudioStopRef = useRef<(() => void) | null>(null);
  const webTopInset = 67;
  const offlineToday = getDailyWidgetContent(now, calendarType);
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
  const dailyGospelParams = { locale: language };
  const dailyGospelQuery = useGetSynaxarionDailyGospel(dailyGospelParams, {
    query: {
      queryKey: getGetSynaxarionDailyGospelQueryKey(dailyGospelParams),
      ...(Platform.OS === 'web'
        ? {}
        : {
            queryFn: ({ signal }: { signal: AbortSignal }) =>
              fetchDailyGospelFromSource(language, signal),
          }),
      staleTime: 5 * 60 * 1000,
      retry: 1,
      enabled: Platform.OS !== 'web' || Boolean(process.env.EXPO_PUBLIC_DOMAIN),
    },
  });
  useEffect(() => {
    const refreshDate = () => setNow(new Date());
    const timer = setInterval(refreshDate, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshDate();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  const currentDate = formatHomeDate(now, language, t.calendar.months, t.calendar.dateWeekdays);
  const civilToday = dateKeyFromDate(now);
  const todayEntry = getCalendarEntryForType(civilToday, calendarType);
  const todaySaintLabels = language === 'ar'
    ? todayEntry.saints
    : todayEntry.saints.map((_, index) => language === 'en' ? `Saint of the day ${index + 1}` : `Άγιος της ημέρας ${index + 1}`);
  const todayCardTitle = language === 'ar'
    ? todayEntry.feast ?? todayEntry.saints[0] ?? t.calendar.noOccasion
    : todayEntry.feast
      ? language === 'en' ? 'Church feast' : 'Εκκλησιαστική εορτή'
      : todayEntry.saints.length ? t.calendar.saints : t.calendar.noOccasion;
  const todayCardDescription = todayEntry.feast
    ? todaySaintLabels.join(language === 'ar' ? '، ' : ' · ') || t.home.todayDescription
    : todayEntry.saints.length
      ? language === 'ar'
        ? todaySaintLabels.slice(1).join('، ') || t.home.todayDescription
        : todaySaintLabels.join(' · ')
      : t.calendar.noNames;
  const todayVerseHeading = t.home.todayVerse.replace(/\s*·.*$/, '');
  const fallbackVerseReference =
    t.home.todayVerse.split('·').slice(1).join('·').trim() ||
    offlineToday.verseReference;
  const homeDailyContent = resolveHomeDailyContent(synaxarionQuery.data, {
    verseHeading: todayVerseHeading,
    verse: language === 'ar' ? offlineToday.verse : t.home.verse,
    verseReference: fallbackVerseReference,
    occasionTitle: todayCardTitle,
    occasionDescription: todayCardDescription,
  });
  const dailyGospel = dailyGospelQuery.data ?? null;
  const dailyGospelAudioUrl = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/synaxarion/daily-gospel/audio`
    : '/api/synaxarion/daily-gospel/audio';
  const shareDailyContent = async () => {
    const isVerse = dailyContentView === 'verse';
    if (!isVerse && !dailyGospel?.text) return;

    const title = isVerse ? t.home.verseTab : dailyGospel?.title ?? t.home.gospelTab;
    const message = isVerse
      ? [title, homeDailyContent.verse, homeDailyContent.verseReference, 'OrthoTypikon']
          .filter(Boolean)
          .join('\n\n')
      : [title, dailyGospel?.text, dailyGospel?.sourceUrl]
          .filter(Boolean)
          .join('\n\n');

    try {
      if (Platform.OS === 'web') {
        const webNavigator =
          typeof navigator !== 'undefined'
            ? (navigator as typeof navigator & {
                share?: (data: { title?: string; text?: string }) => Promise<void>;
              })
            : undefined;

        if (webNavigator?.share) {
          try {
            await webNavigator.share({ title, text: message });
            return;
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') return;
          }
        }

        if (webNavigator?.clipboard?.writeText) {
          await webNavigator.clipboard.writeText(message);
          Alert.alert(t.home.shareCopiedTitle, t.home.shareCopiedMessage);
          return;
        }

        throw new Error('Browser sharing and clipboard are unavailable.');
      }

      await Share.share({ title, message });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      Alert.alert(t.home.shareErrorTitle, t.home.shareErrorMessage);
    }
  };
  const openDailyGospel = () => {
    if (!dailyGospel?.text) {
      void Linking.openURL(dailyGospel?.sourceUrl ?? DAILY_GOSPEL_SOURCE_URL)
        .catch(() => router.push('/library'));
      return;
    }
    setGospelModalVisible(true);
  };
  const closeGospelModal = () => {
    gospelAudioStopRef.current?.();
    setGospelModalVisible(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + (insets.top === 0 ? webTopInset : 18), paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.identity}>
            <Image
              source={require('../../assets/images/icon.png')}
              accessibilityLabel="OrthoTypikon"
              resizeMode="contain"
              style={styles.brandMark}
            />
            <View style={styles.identityCopy}>
              <Text style={[styles.brandName, { color: colors.foreground }]}>OrthoTypikon</Text>
              <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>{currentDate}</Text>
            </View>
          </View>
          <Pressable testID="notifications" style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <HomeIcon name="bell" size={19} color={colors.primary} />
            <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          </Pressable>
        </View>

        <View style={styles.dailySectionHeading}>
          <View
            style={[
              styles.dailyTabs,
              { backgroundColor: colors.card, borderColor: colors.border, flexDirection: language === 'ar' ? 'row-reverse' : 'row' },
            ]}
          >
            <Pressable
              testID="daily-verse-tab"
              accessibilityRole="tab"
              accessibilityState={{ selected: dailyContentView === 'verse' }}
              onPress={() => setDailyContentView('verse')}
              style={[
                styles.dailyTab,
                { backgroundColor: dailyContentView === 'verse' ? colors.primary : 'transparent' },
              ]}
            >
              <Text style={[styles.dailyTabLabel, { color: dailyContentView === 'verse' ? colors.primaryForeground : colors.mutedForeground }]}>
                {t.home.verseTab}
              </Text>
            </Pressable>
            <Pressable
              testID="daily-gospel-tab"
              accessibilityRole="tab"
              accessibilityState={{ selected: dailyContentView === 'gospel' }}
              onPress={() => setDailyContentView('gospel')}
              style={[
                styles.dailyTab,
                { backgroundColor: dailyContentView === 'gospel' ? colors.primary : 'transparent' },
              ]}
            >
              <Text style={[styles.dailyTabLabel, { color: dailyContentView === 'gospel' ? colors.primaryForeground : colors.mutedForeground }]}>
                {t.home.gospelTab}
              </Text>
            </Pressable>
          </View>
          <View style={styles.hymnActionRow}>
            <Pressable
              testID="morning-hymn-toggle"
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? t.hymn.stop : t.hymn.title}
              onPress={toggle}
              style={({ pressed }) => [
                styles.hymnButton,
                {
                  backgroundColor: isPlaying ? colors.primary : colors.secondary,
                  borderColor: isPlaying ? colors.primary : colors.border,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <HomeIcon name={isPlaying ? 'pause' : 'play'} size={14} color={isPlaying ? colors.primaryForeground : colors.primary} />
              <Text style={[styles.hymnButtonText, { color: isPlaying ? colors.primaryForeground : colors.primary }]}>
                {isLoading ? t.hymn.loading : hasError ? t.hymn.retry : isPlaying ? t.hymn.stop : t.hymn.title}
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={[styles.verseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.verseAccent, { backgroundColor: colors.accent }]} />
          {dailyContentView === 'verse' ? (
            <>
              <View style={styles.verseTop}>
                <HomeIcon name="bookmark" size={17} color={colors.accent} />
                <Text style={[styles.verseLabel, { color: colors.mutedForeground }]}>{homeDailyContent.verseReference}</Text>
              </View>
                <Text numberOfLines={3} style={[styles.verse, { color: colors.foreground }]}>{homeDailyContent.verse}</Text>
              <View style={styles.verseBottom}>
                <Pressable
                  testID="share-verse"
                  accessibilityRole="button"
                  accessibilityLabel={t.home.shareVerse}
                  onPress={() => void shareDailyContent()}
                  style={({ pressed }) => [styles.shareButton, { opacity: pressed ? 0.65 : 1 }]}
                >
                  <HomeIcon name="share" size={17} color={colors.primary} />
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.verseTop}>
                <HomeIcon name="book-open" size={17} color={colors.accent} />
                  <Text numberOfLines={2} style={[styles.verseLabel, { color: colors.foreground }]}>
                    {dailyGospel?.title ?? (dailyGospelQuery.isLoading ? t.home.gospelLoading : t.home.gospelUnavailable)}
                </Text>
              </View>
                <Text numberOfLines={3} style={[styles.gospelPrompt, { color: colors.foreground }]}>
                  {dailyGospel?.text ?? (dailyGospelQuery.isLoading ? t.home.gospelLoading : t.home.gospelUnavailable)}
              </Text>
              <View style={styles.gospelBottom}>
                <Pressable
                  testID="share-gospel"
                  accessibilityRole="button"
                  accessibilityLabel={t.home.shareGospel}
                  accessibilityState={{ disabled: !dailyGospel?.text }}
                  disabled={!dailyGospel?.text}
                  onPress={() => void shareDailyContent()}
                  style={({ pressed }) => [
                    styles.shareButton,
                    { opacity: !dailyGospel?.text ? 0.4 : pressed ? 0.65 : 1 },
                  ]}
                >
                  <HomeIcon name="share" size={17} color={colors.primary} />
                </Pressable>
                <Pressable
                  testID="open-daily-gospel"
                  accessibilityRole={dailyGospel ? 'button' : 'link'}
                  accessibilityLabel={dailyGospel ? t.home.gospelReadMore : t.home.gospelOpenSource}
                  onPress={openDailyGospel}
                  style={({ pressed }) => [
                    styles.gospelAction,
                    { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.76 : 1 },
                  ]}
                >
                  <Text style={[styles.gospelActionLabel, { color: colors.primary }]}>{dailyGospel ? t.home.gospelReadMore : t.home.gospelOpenSource}</Text>
                  <HomeIcon name={language === 'ar' ? 'arrow-left' : 'arrow-right'} size={16} color={colors.primary} />
                </Pressable>
              </View>
            </>
          )}
        </View>

        <SynaxarionPreview dailyContent={homeDailyContent} />

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.home.explore}</Text>
          <Pressable onPress={() => router.push('/library')}>
            <Text style={[styles.link, { color: colors.primary }]}>{t.home.all}</Text>
          </Pressable>
        </View>
        <ScrollView
          ref={libraryRailRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          directionalLockEnabled
          onContentSizeChange={() => libraryRailRef.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={styles.libraryRail}
          style={styles.libraryRailScroll}
        >
          {Array.from({ length: Math.ceil(exploreItems.length / 2) }, (_, groupIndex) => {
            const startIndex = groupIndex * 2;

            return (
              <View key={`explore-group-${groupIndex}`} style={styles.libraryRailGroup}>
                {exploreItems.slice(startIndex, startIndex + 2).map((item, groupItemIndex) => (
                  <Pressable
                    key={item.key}
                    testID={`explore-${item.key}`}
                    accessibilityRole="button"
                    accessibilityLabel={t.home.exploreItems[startIndex + groupItemIndex]}
                    onPress={() => {
                      if (item.key === 'prayers') {
                        router.push({ pathname: '/library', params: { section: 'prayers' } });
                        return;
                      }
                      router.push(item.route);
                    }}
                    style={({ pressed }) => [
                      styles.librarySection,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: pressed ? 0.76 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.librarySectionArtwork, { backgroundColor: item.color }]}>
                      {'imageUrl' in item ? (
                        <Image
                          source={{ uri: item.imageUrl }}
                          resizeMode={item.imageResizeMode}
                          style={styles.librarySectionImage}
                        />
                      ) : 'icon' in item ? (
                        <HomeIcon name={item.icon} color={colors.primaryForeground} size={38} />
                      ) : null}
                    </View>
                    <Text style={[styles.librarySectionLabel, { color: colors.foreground }]} numberOfLines={2}>
                      {t.home.exploreItems[startIndex + groupItemIndex]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            );
          })}
        </ScrollView>

        <RegionalNewsSection />

      </ScrollView>
      <Modal
        visible={gospelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeGospelModal}
        statusBarTranslucent
      >
        <View style={styles.gospelModalBackdrop}>
          <View style={[styles.gospelModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.gospelModalHeader}>
              <Text style={[styles.gospelModalTitle, { color: colors.foreground }]} numberOfLines={2}>
                {dailyGospel?.title ?? t.home.gospelTab}
              </Text>
              <Pressable
                testID="close-daily-gospel"
                accessibilityRole="button"
                accessibilityLabel={t.home.gospelClose}
                onPress={closeGospelModal}
                style={[styles.gospelModalClose, { backgroundColor: colors.secondary }]}
              >
                <HomeIcon name="close" size={18} color={colors.primary} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.gospelModalScroll}
              contentContainerStyle={styles.gospelModalTextContent}
              showsVerticalScrollIndicator
            >
              <Text style={[styles.gospelFullText, { color: colors.foreground }]}>
                {dailyGospel?.text ?? t.home.gospelUnavailable}
              </Text>
            </ScrollView>
            {dailyGospel?.text && language === 'ar' ? (
              <DailyGospelAudioControl
                sourceUrl={dailyGospelAudioUrl}
                stopPlayerRef={gospelAudioStopRef}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 18 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  identity: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11, flex: 1 },
  brandMark: { width: 42, height: 42, borderRadius: 14, overflow: 'hidden' },
  identityCopy: { alignItems: 'flex-end', flex: 1 },
  brandName: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  eyebrow: { fontSize: 11, fontWeight: '500', textAlign: 'right', marginTop: 3 },
  hymnButton: { minHeight: 38, borderRadius: 14, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  hymnButtonText: { fontSize: 12, fontWeight: '800' },
  iconButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  dot: { width: 7, height: 7, borderRadius: 4, position: 'absolute', top: 8, right: 9 },
  dailySectionHeading: { gap: 9, marginTop: 2 },
  dailyTabs: { borderWidth: 1, borderRadius: 16, padding: 4, gap: 4 },
  dailyTab: { flex: 1, minHeight: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  dailyTabLabel: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  sectionHeading: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  hymnActionRow: { width: '100%', alignItems: 'flex-end' },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  link: { fontSize: 12, fontWeight: '600' },
  verseCard: { height: 196, borderRadius: 22, borderWidth: 1, padding: 18, gap: 8, justifyContent: 'space-between', overflow: 'hidden', position: 'relative' },
  verseAccent: { width: 4, position: 'absolute', top: 18, bottom: 18, right: 0, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  shareButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  verseTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  verseLabel: { fontSize: 12, textAlign: 'right' },
  verse: { fontSize: 19, lineHeight: 31, fontWeight: '500', textAlign: 'right' },
  verseBottom: { flexDirection: 'row-reverse', justifyContent: 'flex-end', alignItems: 'center' },
  gospelPrompt: { fontSize: 15, lineHeight: 24, textAlign: 'right' },
  gospelBottom: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gospelAction: { minHeight: 40, borderRadius: 14, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  gospelActionLabel: { fontSize: 13, fontWeight: '700' },
  gospelModalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: 'rgba(12, 20, 29, 0.58)' },
  gospelModal: { width: '100%', maxWidth: 680, height: '82%', maxHeight: '88%', borderRadius: 24, borderWidth: 1, padding: 20, overflow: 'hidden' },
  gospelModalHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(100,100,100,0.24)' },
  gospelModalTitle: { flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'right' },
  gospelModalClose: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  gospelModalScroll: { flex: 1, marginVertical: 14 },
  gospelModalTextContent: { paddingBottom: 14 },
  gospelFullText: { fontSize: 17, lineHeight: 32, textAlign: 'right', writingDirection: 'rtl' },
  gospelSpeakButton: { minHeight: 50, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10 },
  gospelSpeakText: { fontSize: 15, fontWeight: '800' },
  libraryRailScroll: { marginHorizontal: -18 },
  libraryRail: { flexDirection: 'row-reverse', gap: 10, paddingHorizontal: 18 },
  libraryRailGroup: { width: 137, flexDirection: 'column', gap: 8 },
  librarySection: { width: '100%', height: 148, borderRadius: 15, borderWidth: 1, padding: 6, flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 5, overflow: 'hidden' },
  librarySectionArtwork: { width: '100%', height: 97, borderRadius: 11, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  librarySectionImage: { width: '100%', height: '100%' },
  librarySectionLabel: { width: '100%', fontSize: 12, lineHeight: 16, fontWeight: '700', textAlign: 'center' },
});