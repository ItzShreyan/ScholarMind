"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { SpotifyPlaybackProvider } from "@/components/dashboard/useSpotifyPlayback";
import { DynamicIslandMusicPlayer } from "@/components/dashboard/DynamicIslandMusicPlayer";
import { MusicPlaybackProvider } from "@/components/dashboard/MusicPlaybackContext";

export function DashboardMusicLayout({ children }: { children: React.ReactNode }) {
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const fetchedRef = useRef(false);
  const pathname = usePathname() || "";

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void fetch("/api/music/spotify/status")
      .then((response) => response.json())
      .then((json) => setSpotifyConnected(Boolean(json.connected)))
      .catch(() => setSpotifyConnected(false));
  }, []);

  const isAuthRoute =
    pathname.startsWith("/studio") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/schedule") ||
    pathname.startsWith("/security-check");

  if (!isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <SpotifyPlaybackProvider connected={spotifyConnected}>
      <MusicPlaybackProvider>
        {children}
        <DynamicIslandMusicPlayer />
      </MusicPlaybackProvider>
    </SpotifyPlaybackProvider>
  );
}
