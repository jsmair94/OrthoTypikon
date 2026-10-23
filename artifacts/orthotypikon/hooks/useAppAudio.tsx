import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioPlayer,
  type AudioSource,
  type AudioStatus,
} from 'expo-audio';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

type ExternalStopper = () => void | Promise<void>;

type AppAudioValue = {
  player: AudioPlayer;
  status: AudioStatus;
  activeId: string | null;
  play: (id: string, source: AudioSource) => Promise<void>;
  pause: (id?: string) => void;
  claimExternal: (id: string) => void;
  registerExternalStopper: (id: string, stop: ExternalStopper) => () => void;
};

const AppAudioContext = createContext<AppAudioValue | null>(null);

export function isAudioPlaybackError(playbackState: unknown): boolean {
  return typeof playbackState === 'string' && playbackState.toLowerCase().includes('error');
}

export function AppAudioProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null, { updateInterval: 250, keepAudioSessionActive: true });
  const status = useAudioPlayerStatus(player);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const pendingExternalPause = useRef(false);
  const externalStoppers = useRef(new Map<string, ExternalStopper>());

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!pendingExternalPause.current) return;
    if (!status.playing) {
      pendingExternalPause.current = false;
      return;
    }
    if (status.currentTime > 0) {
      pendingExternalPause.current = false;
      player.pause();
    }
  }, [player, status.currentTime, status.playing]);

  const setActive = useCallback((id: string | null) => {
    activeIdRef.current = id;
    setActiveId(id);
  }, []);

  const stopExternalAudio = useCallback((exceptId?: string) => {
    for (const [id, stop] of externalStoppers.current) {
      if (id !== exceptId) void Promise.resolve(stop()).catch(() => undefined);
    }
  }, []);

  const play = useCallback(async (id: string, source: AudioSource) => {
    stopExternalAudio();
    if (activeIdRef.current !== id) {
      pendingExternalPause.current = false;
      player.replace(source);
      setActive(id);
    } else if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) {
      await player.seekTo(0);
    }
    player.play();
  }, [player, setActive, status.currentTime, status.didJustFinish, status.duration, stopExternalAudio]);

  const pause = useCallback((id?: string) => {
    if (id && activeIdRef.current !== id) return;
    player.pause();
  }, [player]);

  const claimExternal = useCallback((id: string) => {
    stopExternalAudio(id);
    pendingExternalPause.current = Platform.OS === 'web' && status.playing && status.currentTime <= 0;
    if (!pendingExternalPause.current) player.pause();
    setActive(id);
  }, [player, setActive, status.currentTime, status.playing, stopExternalAudio]);

  const registerExternalStopper = useCallback((id: string, stop: ExternalStopper) => {
    externalStoppers.current.set(id, stop);
    return () => {
      if (externalStoppers.current.get(id) === stop) externalStoppers.current.delete(id);
    };
  }, []);

  const value = useMemo(
    () => ({ player, status, activeId, play, pause, claimExternal, registerExternalStopper }),
    [player, status, activeId, play, pause, claimExternal, registerExternalStopper],
  );

  return <AppAudioContext.Provider value={value}>{children}</AppAudioContext.Provider>;
}

export function useAppAudio() {
  const value = useContext(AppAudioContext);
  if (!value) throw new Error('useAppAudio must be used within AppAudioProvider');
  return value;
}
