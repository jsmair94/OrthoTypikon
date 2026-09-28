import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const HYMN_AUDIO = require('../assets/audio/kyrie-eleison.mp3');

type HymnPlayerValue = {
  isPlaying: boolean;
  isLoading: boolean;
  hasError: boolean;
  toggle: () => void;
  stop: () => void;
};

const HymnPlayerContext = createContext<HymnPlayerValue | null>(null);

export function HymnPlayerProvider({ children }: { children: ReactNode }) {
  const audioPlayer = useAudioPlayer(HYMN_AUDIO, {
    updateInterval: 500,
    keepAudioSessionActive: true,
  });
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (audioStatus.playbackState.toLowerCase().includes('error')) setHasError(true);
  }, [audioStatus.playbackState]);

  const toggle = useCallback(async () => {
    setHasError(false);
    try {
      if (audioStatus.playing) {
        audioPlayer.pause();
        return;
      }

      if (
        audioStatus.didJustFinish ||
        (audioStatus.duration > 0 && audioStatus.currentTime >= audioStatus.duration)
      ) {
        await audioPlayer.seekTo(0);
      }

      audioPlayer.volume = 1;
      audioPlayer.play();
    } catch {
      setHasError(true);
    }
  }, [
    audioPlayer,
    audioStatus.currentTime,
    audioStatus.didJustFinish,
    audioStatus.duration,
    audioStatus.playing,
    hasError,
  ]);

  const stop = useCallback(() => {
    audioPlayer.pause();
  }, [audioPlayer]);

  const value = useMemo(
    () => ({
      isPlaying: audioStatus.playing,
      isLoading: audioStatus.isBuffering,
      hasError,
      toggle,
      stop,
    }),
    [audioStatus.isBuffering, audioStatus.playing, hasError, stop, toggle],
  );

  return <HymnPlayerContext.Provider value={value}>{children}</HymnPlayerContext.Provider>;
}

export function useHymnPlayer() {
  const value = useContext(HymnPlayerContext);
  if (!value) throw new Error('useHymnPlayer must be used within HymnPlayerProvider');
  return value;
}