import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View, Vibration } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/usePreferences';
import { ROSARY_PRAYER_CONTENT_ID, rosaryPrayerOptions, type RosaryPrayerId } from '@/data/rosaryPrayerOptions';

const BEAD_COUNT = 33;
const STORAGE_KEY = 'orthotypikon-prayer-count';
const PRAYER_AUDIO = require('../assets/audio/jesus-prayer-rosary.mp3');
const PRAYER_SERIF_REGULAR = Platform.OS === 'web' ? 'Amiri, Georgia, serif' : 'Amiri_400Regular';
const PRAYER_SERIF_BOLD = Platform.OS === 'web' ? 'Amiri, Georgia, serif' : 'Amiri_700Bold';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

export default function PrayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language } = useI18n();
  const isRtl = language === 'ar';
  const [count, setCount] = useState(0);
  const [selectedPrayerId, setSelectedPrayerId] = useState<RosaryPrayerId>(ROSARY_PRAYER_CONTENT_ID);
  const [prayerMenuOpen, setPrayerMenuOpen] = useState(false);
  const pendingAudioPause = useRef(false);
  const introAnimation = useRef(new Animated.Value(0)).current;
  const audioPlayer = useAudioPlayer(PRAYER_AUDIO, { updateInterval: 500, keepAudioSessionActive: true });
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const prayerOptions = rosaryPrayerOptions[language];
  const selectedPrayer = prayerOptions.find((option) => option.id === selectedPrayerId) ?? prayerOptions[0];
  const hasPrayerContent = selectedPrayer.id === ROSARY_PRAYER_CONTENT_ID;

  useEffect(() => {
    const animation = Animated.timing(introAnimation, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [introAnimation]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value) setCount(Math.min(Number(value) || 0, BEAD_COUNT));
    });
  }, []);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => undefined);
    return () => {
      audioPlayer.pause();
    };
  }, [audioPlayer]);

  useEffect(() => {
    if (!pendingAudioPause.current) return;
    if (!audioStatus.playing) {
      pendingAudioPause.current = false;
      return;
    }
    if (!hasPrayerContent && audioStatus.currentTime > 0) {
      pendingAudioPause.current = false;
      audioPlayer.pause();
    }
  }, [audioPlayer, audioStatus.currentTime, audioStatus.playing, hasPrayerContent]);

  const pray = async () => {
    const next = count >= BEAD_COUNT ? 1 : count + 1;
    setCount(next);
    await AsyncStorage.setItem(STORAGE_KEY, String(next));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    Vibration.vibrate(10);
  };

  const reset = async () => {
    setCount(0);
    await AsyncStorage.setItem(STORAGE_KEY, '0');
  };

  const selectPrayer = (id: RosaryPrayerId) => {
    if (id === ROSARY_PRAYER_CONTENT_ID) {
      pendingAudioPause.current = false;
    } else if (id !== selectedPrayerId && audioStatus.playing) {
      if (audioStatus.currentTime > 0) {
        audioPlayer.pause();
      } else {
        pendingAudioPause.current = true;
      }
    }
    setSelectedPrayerId(id);
    setPrayerMenuOpen(false);
  };

  const toggleAudio = async () => {
    if (audioStatus.playing) {
      audioPlayer.pause();
      return;
    }
    if (audioStatus.didJustFinish || (audioStatus.duration > 0 && audioStatus.currentTime >= audioStatus.duration)) {
      await audioPlayer.seekTo(0);
    }
    audioPlayer.play();
  };

  const audioProgress = audioStatus.duration > 0 ? Math.min(audioStatus.currentTime / audioStatus.duration, 1) : 0;
  const audioButtonLabel = audioStatus.playing ? t.prayer.audioPause : audioStatus.didJustFinish ? t.prayer.audioPlay : t.prayer.audioPlay;
  const introTranslateY = introAnimation.interpolate({ inputRange: [0, 1], outputRange: [9, 0] });
  const cardShadow = Platform.OS === 'web'
    ? { boxShadow: `0px 5px 15px ${colors.prayerShadow}0A` }
    : {
        elevation: 1,
        shadowColor: colors.prayerShadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      };
  const ringSize = 116;
  const ringRadius = 45;

  return (
    <ScrollView style={{ backgroundColor: colors.prayerMat }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.prayerPaperStart, borderColor: colors.prayerPaperBorder }]} hitSlop={10} accessibilityRole="button" accessibilityLabel={t.notFound.back}>
          <Feather name="arrow-right" size={19} color={colors.prayerAccent} />
        </Pressable>
        <View style={styles.topCopy}>
          <Text style={[styles.eyebrow, { color: colors.prayerKicker, fontFamily: PRAYER_SERIF_REGULAR }]}>{t.prayer.eyebrow}</Text>
          <Text style={[styles.title, { color: colors.prayerInk, fontFamily: PRAYER_SERIF_BOLD }]}>{t.prayer.title}</Text>
        </View>
      </View>

      <View style={[styles.introStage, { backgroundColor: colors.prayerMat }]}>
        <Animated.View
          style={[
            styles.introMotion,
            {
              opacity: introAnimation,
              transform: [{ translateY: introTranslateY }],
            },
            Platform.OS === 'web'
              ? { boxShadow: `0px 3px 14px ${colors.prayerShadow}17` }
              : {
                  elevation: 2,
                  shadowColor: colors.prayerShadow,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.09,
                  shadowRadius: 14,
                },
          ]}
        >
          <LinearGradient
            colors={[colors.prayerPaperStart, colors.prayerPaperMiddle, colors.prayerPaperEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.introCard, { borderColor: colors.prayerPaperBorder }]}
          >
            <View style={[styles.introOrbitOuter, { borderColor: colors.prayerOrbit }]} />
            <View style={[styles.introOrbitInner, { borderColor: colors.prayerOrbit }]} />
            <View style={[styles.introInsetFrame, { borderColor: colors.prayerInsetBorder }]} />
            <View style={[styles.introCornerTopRight, { borderColor: colors.prayerAccent }]} />
            <View style={[styles.introCornerBottomLeft, { borderColor: colors.prayerAccent }]} />

            <View style={[styles.introHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Text
                style={[
                  styles.introKicker,
                  { color: colors.prayerKicker, fontFamily: PRAYER_SERIF_REGULAR, textAlign: isRtl ? 'right' : 'left' },
                ]}
              >
                {t.prayer.introKicker}
              </Text>
              <View style={[styles.introMark, { backgroundColor: colors.prayerMat, borderColor: colors.prayerPaperBorder }]}>
                <Feather name="sun" size={13} color={colors.prayerAccent} />
              </View>
            </View>

            <View style={styles.introCopy}>
              <Text style={[styles.introTitle, { color: colors.prayerInk, fontFamily: PRAYER_SERIF_BOLD }]}>
                {t.prayer.introTitle}
              </Text>
              <View style={styles.introDivider}>
                <View style={[styles.introDividerLine, { backgroundColor: colors.prayerInsetBorder }]} />
                <Feather name="heart" size={12} color={colors.prayerAccent} />
                <View style={[styles.introDividerLine, { backgroundColor: colors.prayerInsetBorder }]} />
              </View>
              <Text style={[styles.introText, { color: colors.prayerMuted, fontFamily: PRAYER_SERIF_REGULAR }]}>
                 {hasPrayerContent ? t.prayer.introText : t.prayer.rosaryPendingIntro}
              </Text>
            </View>

            <View style={styles.introFooter}>
              <View style={[styles.introDot, { backgroundColor: colors.prayerAccent }]} />
              <Text style={[styles.introFooterText, { color: colors.prayerMuted, fontFamily: PRAYER_SERIF_REGULAR }]}>
                {t.prayer.introFooter}
              </Text>
              <View style={[styles.introDot, { backgroundColor: colors.prayerAccent }]} />
            </View>
          </LinearGradient>
        </Animated.View>
      </View>

       <LinearGradient
         colors={[colors.prayerPaperStart, colors.prayerPaperMiddle]}
         start={{ x: 0, y: 0 }}
         end={{ x: 1, y: 1 }}
         style={[styles.audioCard, { borderColor: colors.prayerPaperBorder }, cardShadow]}
       >
          <Text
            testID="rosary-prayer-picker-label"
            accessibilityRole="header"
            style={[styles.rosaryPickerPrompt, { color: colors.prayerKicker, fontFamily: PRAYER_SERIF_BOLD, textAlign: isRtl ? 'right' : 'left' }]}
          >
            {t.prayer.rosaryPickerPrompt}
          </Text>
         <Pressable
           testID="rosary-prayer-picker"
           accessibilityRole="button"
           accessibilityLabel={`${t.prayer.rosaryPickerLabel}: ${selectedPrayer.title}`}
           accessibilityState={{ expanded: prayerMenuOpen }}
           onPress={() => setPrayerMenuOpen((open) => !open)}
           style={[styles.audioHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}
         >
           <View style={[styles.audioIcon, { backgroundColor: colors.prayerMat, borderColor: colors.prayerPaperBorder }]}>
             <Feather name={hasPrayerContent && audioStatus.playing ? 'volume-2' : hasPrayerContent ? 'headphones' : 'book-open'} size={18} color={colors.prayerAccent} />
           </View>
           <View style={[styles.audioCopy, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
             <Text style={[styles.audioTitle, { color: colors.prayerInk, fontFamily: PRAYER_SERIF_BOLD, textAlign: isRtl ? 'right' : 'left' }]}>{selectedPrayer.title}</Text>
             <Text style={[styles.audioSubtitle, { color: colors.prayerMuted, fontFamily: PRAYER_SERIF_REGULAR, textAlign: isRtl ? 'right' : 'left' }]}>
               {!hasPrayerContent
                 ? t.prayer.rosaryPendingAudio
                 : !audioStatus.isLoaded
                   ? t.prayer.audioLoading
                   : audioStatus.didJustFinish
                     ? t.prayer.audioFinished
                     : t.prayer.audioHint}
             </Text>
           </View>
           <Feather name={prayerMenuOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.prayerMuted} />
         </Pressable>

         {prayerMenuOpen && (
           <View style={[styles.prayerOptionsMenu, { borderColor: colors.prayerPaperBorder, backgroundColor: colors.prayerPaperStart }]}>
             {prayerOptions.map((option, index) => {
               const selected = option.id === selectedPrayerId;
               return (
                 <Pressable
                   key={option.id}
                   testID={`rosary-prayer-option-${option.id}`}
                   accessibilityRole="button"
                   accessibilityState={{ selected }}
                   onPress={() => selectPrayer(option.id)}
                   style={[
                     styles.prayerOption,
                     {
                       backgroundColor: selected ? colors.prayerMat : 'transparent',
                       borderBottomColor: colors.prayerPaperBorder,
                       borderBottomWidth: index === prayerOptions.length - 1 ? 0 : StyleSheet.hairlineWidth,
                       flexDirection: isRtl ? 'row-reverse' : 'row',
                     },
                   ]}
                 >
                   <Text style={[styles.prayerOptionText, { color: colors.prayerInk, fontFamily: PRAYER_SERIF_REGULAR, textAlign: isRtl ? 'right' : 'left' }]}>
                     {option.title}
                   </Text>
                   {selected && <Feather name="check" size={15} color={colors.prayerAccent} />}
                 </Pressable>
               );
             })}
           </View>
         )}

         {hasPrayerContent && (
           <>
             <View style={styles.audioControls}>
               <Pressable
                 testID="prayer-audio-toggle"
                 accessibilityRole="button"
                 accessibilityLabel={audioButtonLabel}
                 onPress={toggleAudio}
                 disabled={!audioStatus.isLoaded}
                 style={({ pressed }) => [styles.audioButton, { backgroundColor: colors.prayerAccent, borderColor: colors.prayerPaperBorder, opacity: audioStatus.isLoaded ? (pressed ? 0.82 : 1) : 0.5 }]}
               >
                 <Feather name={audioStatus.playing ? 'pause' : 'play'} size={16} color={colors.prayerInk} />
                 <Text style={[styles.audioButtonText, { color: colors.prayerInk, fontFamily: PRAYER_SERIF_BOLD }]}>{audioButtonLabel}</Text>
               </Pressable>
               <Text style={[styles.audioTime, { color: colors.prayerMuted }]}>
                 {formatTime(audioStatus.currentTime)} / {formatTime(audioStatus.duration)}
               </Text>
             </View>
             <View style={[styles.audioTrack, { backgroundColor: colors.prayerPaperBorder }]}>
               <View style={[styles.audioProgress, { backgroundColor: colors.prayerAccent, width: `${audioProgress * 100}%` }]} />
             </View>
           </>
         )}
       </LinearGradient>

      {hasPrayerContent && (
        <>
      <LinearGradient
        colors={[colors.prayerPaperStart, colors.prayerPaperMiddle]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.counterCard, { borderColor: colors.prayerPaperBorder }, cardShadow]}
      >
        <View style={styles.counterCopy}>
          <Text style={[styles.counterLabel, { color: colors.prayerKicker, fontFamily: PRAYER_SERIF_REGULAR }]}>{t.prayer.completed}</Text>
          <View style={styles.counterValueRow}>
            <Text style={[styles.counter, { color: colors.prayerInk, fontFamily: PRAYER_SERIF_BOLD }]}>{count}</Text>
            <Text style={[styles.counterTotal, { color: colors.prayerMuted, fontFamily: PRAYER_SERIF_REGULAR }]}>{t.prayer.of} {BEAD_COUNT}</Text>
          </View>
        </View>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${t.prayer.completed}: ${count} ${t.prayer.of} ${BEAD_COUNT}`}
          accessibilityValue={{ min: 0, max: BEAD_COUNT, now: count }}
          style={[styles.progressWheel, { width: ringSize, height: ringSize }]}
        >
          <View style={[styles.wheelCenter, { backgroundColor: colors.prayerPaperStart, borderColor: colors.prayerPaperBorder }]}>
            <Feather name="plus" size={17} color={colors.prayerAccent} />
          </View>
          {Array.from({ length: BEAD_COUNT }, (_, index) => {
            const angle = (index / BEAD_COUNT) * Math.PI * 2 - Math.PI / 2;
            const x = ringSize / 2 + Math.cos(angle) * ringRadius;
            const y = ringSize / 2 + Math.sin(angle) * ringRadius;
            return (
              <View
                key={index}
                style={[
                  styles.progressBead,
                  {
                    left: x - 2.5,
                    top: y - 2.5,
                    width: index < count ? 6 : 5,
                    height: index < count ? 6 : 5,
                    borderRadius: index < count ? 3 : 2.5,
                    backgroundColor: index < count ? colors.prayerAccent : colors.prayerInsetBorder,
                    opacity: index < count ? 1 : 0.46,
                  },
                ]}
              />
            );
          })}
        </View>
      </LinearGradient>

      <Pressable testID="prayer-bead" accessibilityRole="button" onPress={pray} style={({ pressed }) => [styles.prayButton, { backgroundColor: colors.prayerAccent, borderColor: colors.prayerInsetBorder, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
        <Feather name="plus" size={20} color={colors.prayerInk} />
         <Text style={[styles.prayButtonText, { color: colors.prayerInk, fontFamily: PRAYER_SERIF_BOLD }]}>{t.prayer.next}</Text>
      </Pressable>

      <LinearGradient
        colors={[colors.prayerPaperStart, colors.prayerPaperMiddle]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.prayerTextCard, { borderColor: colors.prayerPaperBorder }, cardShadow]}
      >
        <Feather name="heart" size={17} color={colors.prayerAccent} />
         <Text style={[styles.prayerText, { color: colors.prayerInk, fontFamily: PRAYER_SERIF_BOLD }]}>{t.prayer.prayerText}</Text>
         <Text style={[styles.hint, { color: colors.prayerMuted, fontFamily: PRAYER_SERIF_REGULAR }]}>{t.prayer.hint}</Text>
      </LinearGradient>

       <Pressable onPress={reset} accessibilityRole="button" style={styles.resetButton}>
         <Feather name="rotate-ccw" size={13} color={colors.prayerMuted} />
         <Text style={[styles.resetText, { color: colors.prayerMuted, fontFamily: PRAYER_SERIF_REGULAR }]}>{t.prayer.reset}</Text>
       </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, gap: 11 },
  topBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11, minHeight: 46 },
  topCopy: { flex: 1, alignItems: 'flex-end' },
  backButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 11, fontWeight: '600', lineHeight: 16 },
  title: { fontSize: 25, fontWeight: '700', marginTop: 1, lineHeight: 33 },
  introStage: { borderRadius: 24, padding: 0 },
  introMotion: { borderRadius: 20 },
  introCard: { position: 'relative', minHeight: 172, borderWidth: 1, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 11, justifyContent: 'space-between', overflow: 'hidden' },
  introInsetFrame: { position: 'absolute', top: 9, right: 9, bottom: 9, left: 9, borderWidth: 1, borderRadius: 15, opacity: 0.3 },
  introOrbitOuter: { position: 'absolute', left: -126, bottom: -144, width: 230, height: 230, borderWidth: 1, borderRadius: 115, opacity: 0.14 },
  introOrbitInner: { position: 'absolute', left: -143, bottom: -161, width: 264, height: 264, borderWidth: 1, borderRadius: 132, opacity: 0.06 },
  introCornerTopRight: { position: 'absolute', top: 17, right: 17, width: 17, height: 17, borderTopWidth: 1, borderRightWidth: 1, borderTopRightRadius: 6, opacity: 0.5 },
  introCornerBottomLeft: { position: 'absolute', bottom: 17, left: 17, width: 17, height: 17, borderBottomWidth: 1, borderLeftWidth: 1, borderBottomLeftRadius: 6, opacity: 0.5 },
  introHeader: { minHeight: 28, alignItems: 'center', justifyContent: 'space-between' },
  introKicker: { fontSize: 11, lineHeight: 18 },
  introMark: { width: 28, height: 28, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  introCopy: { alignItems: 'center', paddingVertical: 5 },
  introTitle: { fontSize: 24, lineHeight: 36, textAlign: 'center' },
  introDivider: { width: 88, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 1, marginBottom: 4 },
  introDividerLine: { height: 1, flex: 1, opacity: 0.65 },
  introText: { maxWidth: '100%', fontSize: 15, lineHeight: 23, textAlign: 'center' },
  introFooter: { minHeight: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 3 },
  introFooterText: { fontSize: 11, lineHeight: 16 },
  introDot: { width: 3, height: 3, borderRadius: 2, opacity: 0.85 },
  counterCard: { minHeight: 124, borderWidth: 1, borderRadius: 19, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  counterCopy: { flex: 1, alignItems: 'flex-start', paddingStart: 2 },
  counterLabel: { fontSize: 12 },
  counterValueRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 7, marginTop: 1 },
  counter: { fontSize: 46, fontWeight: '700', lineHeight: 57 },
  counterTotal: { fontSize: 13 },
  progressWheel: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  wheelCenter: { position: 'absolute', width: 58, height: 58, borderWidth: 1, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  progressBead: { position: 'absolute' },
  prayButton: { minHeight: 56, borderWidth: 1, borderRadius: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9 },
  prayButtonText: { fontSize: 16, fontWeight: '700' },
  prayerTextCard: { borderWidth: 1, borderRadius: 19, minHeight: 93, paddingHorizontal: 17, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', gap: 5 },
  prayerText: { fontSize: 17, lineHeight: 27, fontWeight: '600', textAlign: 'center' },
  hint: { fontSize: 10, lineHeight: 15, textAlign: 'center' },
  audioCard: { borderWidth: 1, borderRadius: 19, paddingHorizontal: 14, paddingVertical: 12, gap: 10, overflow: 'hidden' },
  rosaryPickerPrompt: { fontSize: 12, lineHeight: 18, paddingHorizontal: 2 },
  audioHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, minHeight: 44 },
  audioIcon: { width: 36, height: 36, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  audioCopy: { flex: 1, alignItems: 'flex-end', gap: 2 },
  audioTitle: { fontSize: 16, fontWeight: '700', textAlign: 'right', lineHeight: 23 },
  audioSubtitle: { fontSize: 11, textAlign: 'right', lineHeight: 16 },
  prayerOptionsMenu: { borderWidth: 1, borderRadius: 13, padding: 4, marginTop: -2 },
  prayerOption: { minHeight: 42, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderRadius: 9 },
  prayerOptionText: { flex: 1, fontSize: 13, lineHeight: 19 },
  audioControls: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  audioButton: { minHeight: 38, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, flex: 1 },
  audioButtonText: { fontSize: 13, fontWeight: '700' },
  audioTime: { fontSize: 10, minWidth: 62, textAlign: 'left' },
  audioTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  audioProgress: { height: '100%', borderRadius: 3 },
  resetButton: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  resetText: { fontSize: 12 },
});