import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useAppAudio } from '@/hooks/useAppAudio';

type Language = 'ar' | 'en' | 'el';

export function BibleAudioControl({ url, audioId, language }: { url: string; audioId: string; language: Language }) {
  const isRTL = language === 'ar';
  const colors = useColors();
  const { player, status: globalStatus, activeId, play, pause } = useAppAudio();
  const isCurrentTrack = activeId === audioId;
  const status = isCurrentTrack
    ? globalStatus
    : { ...globalStatus, currentTime: 0, duration: 0, playing: false, didJustFinish: false };
  const trackWidth = useRef(1);
  const listenLabel = language === 'ar' ? 'استمع' : language === 'el' ? 'Ακούστε' : 'Listen';
  const stopLabel = language === 'ar' ? 'أوقف' : language === 'el' ? 'Διακοπή' : 'Stop';
  const formatTime = (seconds: number) => {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
  };
  const seekToX = (x: number) => {
    if (!status.duration) return;
    const relativePosition = x / trackWidth.current;
    const progress = Math.max(0, Math.min(1, isRTL ? 1 - relativePosition : relativePosition));
    void player.seekTo(progress * status.duration);
  };
  const seekResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: (event) => seekToX(event.nativeEvent.locationX),
      onPanResponderMove: (event) => seekToX(event.nativeEvent.locationX),
    }),
    [isRTL, player, status.duration],
  );

  useEffect(() => {
    if (activeId?.startsWith('bible:') && activeId !== audioId) pause(activeId);
  }, [activeId, audioId, pause]);

  const listen = async () => {
    if (isCurrentTrack && status.duration > 0 && status.currentTime >= status.duration) {
      void player.seekTo(0);
    }
    await play(audioId, { uri: url });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.buttons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable
          testID="bible-audio-listen"
          accessibilityRole="button"
          accessibilityLabel={language === 'ar' ? 'استمع إلى الإصحاح' : language === 'el' ? 'Ακούστε το κεφάλαιο' : 'Listen to chapter'}
          onPress={listen}
          style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 }]}
        >
          <Feather name="play" size={15} color={colors.primaryForeground} />
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{listenLabel}</Text>
        </Pressable>
        <Pressable
          testID="bible-audio-stop"
          accessibilityRole="button"
          accessibilityLabel={language === 'ar' ? 'أوقف التشغيل' : language === 'el' ? 'Διακοπή αναπαραγωγής' : 'Stop playback'}
          onPress={() => pause(audioId)}
          style={({ pressed }) => [styles.button, styles.stopButton, { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.82 : 1 }]}
        >
          <Feather name="square" size={13} color={colors.foreground} />
          <Text style={[styles.buttonText, { color: colors.foreground }]}>{stopLabel}</Text>
        </Pressable>
      </View>
      <View
        testID="bible-audio-seek"
        accessibilityRole="adjustable"
        accessibilityLabel={isRTL ? 'موضع التسجيل الصوتي' : 'Audio position'}
        accessibilityValue={{ min: 0, max: status.duration || 0, now: status.currentTime || 0 }}
        onLayout={(event) => { trackWidth.current = Math.max(1, event.nativeEvent.layout.width); }}
        {...seekResponder.panHandlers}
        style={styles.seekTouchArea}
      >
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progress,
              {
                backgroundColor: colors.primary,
                width: `${status.duration > 0 ? Math.min(100, (status.currentTime / status.duration) * 100) : 0}%`,
                alignSelf: isRTL ? 'flex-end' : 'flex-start',
              },
            ]}
          />
        </View>
      </View>
      <View style={[styles.times, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{formatTime(status.currentTime)}</Text>
        <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{formatTime(status.duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12, gap: 7 },
  buttons: { gap: 8 },
  button: { minHeight: 40, paddingHorizontal: 16, borderRadius: 12, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  stopButton: { borderWidth: 1 },
  buttonText: { fontSize: 13, fontWeight: '700' },
  seekTouchArea: { height: 30, justifyContent: 'center', paddingHorizontal: 2 },
  track: { height: 6, borderRadius: 4, overflow: 'hidden' },
  progress: { height: '100%', borderRadius: 4 },
  times: { justifyContent: 'space-between', marginTop: -4 },
  timeText: { fontSize: 10, fontVariant: ['tabular-nums'] },
});
