"use client";

import { useEffect, useState, useRef } from "react";
import { SpotifyPlaybackProvider } from "@/components/dashboard/useSpotifyPlayback";
import { DynamicIslandMusicPlayer } from "@/components/dashboard/DynamicIslandMusicPlayer";

export function DashboardMusicLayout({ children }: { children: React.ReactNode }) {
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void fetch("/api/music/spotify/status")
      .then((response) => response.json())
      .then((json) => setSpotifyConnected(Boolean(json.connected)))
      .catch(() => setSpotifyConnected(false));
  }, []);

  return (
    <SpotifyPlaybackProvider connected={spotifyConnected}>
      {children}
      <DynamicIslandMusicPlayer />
    </SpotifyPlaybackProvider>
  );
}
