"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type ActiveMusicTrack = {
  id: string;
  title: string;
  artist: string;
  source: string;
} | null;

type MusicPlaybackContextValue = {
  isPlaying: boolean;
  currentTrack: ActiveMusicTrack;
  setPlayback: (state: { isPlaying: boolean; currentTrack: ActiveMusicTrack }) => void;
};

const MusicPlaybackContext = createContext<MusicPlaybackContextValue | null>(null);

export function MusicPlaybackProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<ActiveMusicTrack>(null);

  const setPlayback = useCallback(({ isPlaying: nextIsPlaying, currentTrack: nextTrack }: { isPlaying: boolean; currentTrack: ActiveMusicTrack }) => {
    setIsPlaying((current) => current === nextIsPlaying ? current : nextIsPlaying);
    setCurrentTrack((current) => {
      const normalizedTrack = nextIsPlaying ? nextTrack : null;
      return current?.id === normalizedTrack?.id && current?.title === normalizedTrack?.title && current?.artist === normalizedTrack?.artist && current?.source === normalizedTrack?.source
        ? current
        : normalizedTrack;
    });
  }, []);

  const value = useMemo(() => ({ isPlaying, currentTrack, setPlayback }), [currentTrack, isPlaying, setPlayback]);
  return <MusicPlaybackContext.Provider value={value}>{children}</MusicPlaybackContext.Provider>;
}

export function useMusicPlayback() {
  const context = useContext(MusicPlaybackContext);
  if (!context) throw new Error("useMusicPlayback must be used within MusicPlaybackProvider.");
  return context;
}
