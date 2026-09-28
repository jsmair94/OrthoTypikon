import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Vibration } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/usePreferences';

const BEAD_COUNT = 33;
const STORAGE_KEY = 'orthotypikon-prayer-count';
const PRAYER_AUDIO = require('../assets/audio/jesus-prayer-rosary.mp3');

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
  const { t } = useI18n();
  const [count, setCount] = useState(0);
  const audioPlayer = useAudioPlayer(PRAYER_AUDIO, { updateInterval: 500, keepAudioSessionActive: true });
  const audioStatus = useAudioPlayerStatus(audioPlayer);

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

  const progress = count / BEAD_COUNT;
  const audioProgress = audioStatus.duration > 0 ? Math.min(audioStatus.currentTime / audioStatus.duration, 1) : 0;
  const audioButtonLabel = audioStatus.playing ? t.prayer.audioPause : audioStatus.didJustFinish ? t.prayer.audioPlay : t.prayer.audioPlay;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]} hitSlop={10}>
          <Feather name="arrow-right" size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.topCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{t.prayer.eyebrow}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{t.prayer.title}</Text>
        </View>
      </View>

      <View style={[styles.introCard, { backgroundColor: colors.primary }]}>
        <View style={styles.iconCircle}><Feather name="heart" size={22} color={colors.accent} /></View>
         <Text style={styles.introTitle}>{t.prayer.introTitle}</Text>
         <Text style={styles.introText}>{t.prayer.introText}</Text>
      </View>

       <View style={[styles.audioCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
         <View style={styles.audioHeader}>
           <View style={[styles.audioIcon, { backgroundColor: colors.accent }]}>
             <Feather name={audioStatus.playing ? 'volume-2' : 'headphones'} size={19} color={colors.primary} />
           </View>
           <View style={styles.audioCopy}>
             <Text style={[styles.audioTitle, { color: colors.foreground }]}>{t.prayer.audioTitle}</Text>
             <Text style={[styles.audioSubtitle, { color: colors.mutedForeground }]}>
               {!audioStatus.isLoaded ? t.prayer.audioLoading : audioStatus.didJustFinish ? t.prayer.audioFinished : t.prayer.audioHint}
             </Text>
           </View>
         </View>
         <View style={styles.audioControls}>
           <Pressable
             testID="prayer-audio-toggle"
             accessibilityRole="button"
             accessibilityLabel={audioButtonLabel}
             onPress={toggleAudio}
             disabled={!audioStatus.isLoaded}
             style={({ pressed }) => [styles.audioButton, { backgroundColor: colors.primary, opacity: audioStatus.isLoaded ? (pressed ? 0.82 : 1) : 0.5 }]}
           >
             <Feather name={audioStatus.playing ? 'pause' : 'play'} size={18} color={colors.primaryForeground} />
             <Text style={[styles.audioButtonText, { color: colors.primaryForeground }]}>{audioButtonLabel}</Text>
           </Pressable>
           <Text style={[styles.audioTime, { color: colors.mutedForeground }]}>
             {formatTime(audioStatus.currentTime)} / {formatTime(audioStatus.duration)}
           </Text>
         </View>
         <View style={[styles.audioTrack, { backgroundColor: colors.muted }]}>
           <View style={[styles.audioProgress, { backgroundColor: colors.accent, width: `${audioProgress * 100}%` }]} />
         </View>
       </View>

      <View style={[styles.counterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
         <Text style={[styles.counterLabel, { color: colors.mutedForeground }]}>{t.prayer.completed}</Text>
        <Text style={[styles.counter, { color: colors.primary }]}>{count}</Text>
         <Text style={[styles.counterTotal, { color: colors.mutedForeground }]}>{t.prayer.of} {BEAD_COUNT}</Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}><View style={[styles.progress, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} /></View>
      </View>

      <Pressable testID="prayer-bead" onPress={pray} style={({ pressed }) => [styles.prayButton, { backgroundColor: colors.accent, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
        <Feather name="plus" size={25} color={colors.primary} />
         <Text style={[styles.prayButtonText, { color: colors.primary }]}>{t.prayer.next}</Text>
      </Pressable>

      <View style={[styles.prayerTextCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="message-circle" size={19} color={colors.accent} />
         <Text style={[styles.prayerText, { color: colors.foreground }]}>{t.prayer.prayerText}</Text>
         <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t.prayer.hint}</Text>
      </View>

       <Pressable onPress={reset} style={styles.resetButton}><Text style={[styles.resetText, { color: colors.mutedForeground }]}>{t.prayer.reset}</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  topBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  topCopy: { flex: 1, alignItems: 'flex-end' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  introCard: { borderRadius: 24, padding: 22, alignItems: 'flex-end', gap: 9 },
  iconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(228,185,103,0.18)', alignItems: 'center', justifyContent: 'center' },
  introTitle: { color: '#FFF', fontSize: 21, fontWeight: '700', textAlign: 'right' },
  introText: { color: '#D9E0E3', fontSize: 13, lineHeight: 21, textAlign: 'right' },
  counterCard: { borderWidth: 1, borderRadius: 22, padding: 22, alignItems: 'center' },
  counterLabel: { fontSize: 12 },
  counter: { fontSize: 62, fontWeight: '700', lineHeight: 75, marginTop: 3 },
  counterTotal: { fontSize: 12, marginBottom: 16 },
  progressTrack: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden' },
  progress: { height: '100%', borderRadius: 4 },
  prayButton: { minHeight: 64, borderRadius: 18, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10 },
  prayButtonText: { fontSize: 16, fontWeight: '700' },
  prayerTextCard: { borderWidth: 1, borderRadius: 22, padding: 20, alignItems: 'center', gap: 12 },
  prayerText: { fontSize: 19, lineHeight: 32, fontWeight: '600', textAlign: 'center' },
  hint: { fontSize: 11, textAlign: 'center' },
  audioCard: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 14 },
  audioHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  audioIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  audioCopy: { flex: 1, alignItems: 'flex-end', gap: 4 },
  audioTitle: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
  audioSubtitle: { fontSize: 11, textAlign: 'right', lineHeight: 17 },
  audioControls: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  audioButton: { minHeight: 46, borderRadius: 15, paddingHorizontal: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1 },
  audioButtonText: { fontSize: 13, fontWeight: '700' },
  audioTime: { fontSize: 11, minWidth: 62, textAlign: 'left' },
  audioTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  audioProgress: { height: '100%', borderRadius: 3 },
  resetButton: { alignItems: 'center', padding: 8 },
  resetText: { fontSize: 12, textDecorationLine: 'underline' },
});