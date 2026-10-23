import { useCallback, useEffect, useState } from 'react';
import { isAudioPlaybackError, useAppAudio } from '@/hooks/useAppAudio';

const apiHost =
  process.env.EXPO_PUBLIC_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/+$/, '') ||
  'api.orthotypikon.org';
const HYMN_AUDIO_URL = `https://${apiHost}/api/audio/morning-hymn`;
const HYMN_AUDIO_ID = 'morning-hymn';

export function useHymnPlayer() {
  const { status, activeId, play, pause } = useAppAudio();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (activeId === HYMN_AUDIO_ID && isAudioPlaybackError(status.playbackState)) {
      setHasError(true);
    }
  }, [activeId, status.playbackState]);

  const toggle = useCallback(async () => {
    setHasError(false);
    try {
      if (activeId === HYMN_AUDIO_ID && status.playing) {
        pause(HYMN_AUDIO_ID);
        return;
      }
      await play(HYMN_AUDIO_ID, HYMN_AUDIO_URL);
    } catch {
      setHasError(true);
    }
  }, [activeId, pause, play, status.playing]);

  return {
    isPlaying: activeId === HYMN_AUDIO_ID && status.playing,
    isLoading: activeId === HYMN_AUDIO_ID && status.isBuffering,
    hasError,
    toggle,
  };
}
