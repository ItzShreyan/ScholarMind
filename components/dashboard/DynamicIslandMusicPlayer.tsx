"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Volume2, X, Music, ExternalLink, LogOut, Radio, Search, ChevronUp, ListMusic, ArrowLeft, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useSpotifyPlaybackContext } from "@/components/dashboard/useSpotifyPlayback";
import { formatTrackDuration } from "@/lib/music/spotify-catalog";
import { SpotifyPlaybackPanel } from "@/components/dashboard/SpotifyPlaybackPanel";

type SystemAudioTrack = {
  title: string;
  artist: string;
  source: string;
  sourcePageUrl?: string;
  isPlaying: boolean;
};

type PanelView = "now-playing" | "search" | "playlists" | "playlist-tracks" | "providers";

interface DynamicIslandMusicPlayerProps {
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  isCompact?: boolean;
}

const providerStatus = [
  { name: "Spotify", status: "Connect available • Premium recommended", key: "spotify", disabled: false },
  { name: "YouTube Music", status: "Unavailable in preview", key: "youtube", disabled: true },
  { name: "SoundCloud", status: "Account link unavailable", key: "soundcloud", disabled: true }
];

export function DynamicIslandMusicPlayer({ scrollContainerRef: _scrollContainerRef }: DynamicIslandMusicPlayerProps) {
  const spotifyContext = useSpotifyPlaybackContext();
  const [isMinimized, setIsMinimized] = useState(false);
  const [systemAudio, setSystemAudio] = useState<SystemAudioTrack | null>(null);
  const [externalAudioActive, setExternalAudioActive] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const systemAudioRef = useRef(systemAudio);
  const [localSearch, setLocalSearch] = useState("");
  const [panelView, setPanelView] = useState<PanelView>("now-playing");
  const [showPanel, setShowPanel] = useState(false);
  systemAudioRef.current = systemAudio;

  // ✅ Cross-tab / system audio detection using MediaSession API and heuristic polling
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    // Method 1: MediaSession metadata polling
    const pollMediaSession = () => {
      if (cancelled) return;
      try {
        const metadata = navigator.mediaSession.metadata;
        if (metadata?.title) {
          setSystemAudio({
            title: metadata.title || "Unknown Track",
            artist: metadata.artist || "Unknown Artist",
            source: metadata.album || "Browser Audio",
            sourcePageUrl: document.title,
            isPlaying: navigator.mediaSession.playbackState !== "paused"
          });
          return;
        }

        // If no metadata and we had a system audio source that was from this page, clear it
        const current = systemAudioRef.current;
        if (current && current.source !== "External tab" && current.source !== "Browser tab") {
          setSystemAudio(null);
          setExternalAudioActive(false);
        }
      } catch {
        // MediaSession not available — ignore
      }
    };

    const mediaSessionInterval = setInterval(pollMediaSession, 2000);

    // Method 2: Check for <video>/<audio> elements on our page
    const checkEmbeddedMedia = () => {
      if (cancelled) return;
      try {
        const videos = document.querySelectorAll<HTMLVideoElement>("video");
        const audios = document.querySelectorAll<HTMLAudioElement>("audio");
        for (const v of videos) {
          if (!v.paused && v.currentTime > 0 && !v.muted) {
            const title = v.title || document.title || "Video playing";
            setSystemAudio({ title, artist: "Embedded video", source: "This page", isPlaying: true });
            return;
          }
        }
        for (const a of audios) {
          if (!a.paused && a.currentTime > 0 && !a.muted) {
            setSystemAudio({ title: a.title || document.title || "Audio playing", artist: "Embedded audio", source: "This page", isPlaying: true });
            return;
          }
        }
      } catch {
        // Cross-origin
      }
    };
    const mediaElementsInterval = setInterval(checkEmbeddedMedia, 2500);

    // Method 3: Cross-tab detection via MediaSession action handlers
    if ("mediaSession" in navigator) {
      const handleExternalAction = () => {
        if (!spotifyContext?.state.playing && !systemAudioRef.current?.title) {
          setExternalAudioActive(true);
          setSystemAudio({
            title: "Audio playing in another tab",
            artist: "External tab",
            source: "External tab",
            isPlaying: true
          });
        }
      };

      try {
        navigator.mediaSession.setActionHandler("play", handleExternalAction);
        navigator.mediaSession.setActionHandler("pause", handleExternalAction);
        navigator.mediaSession.setActionHandler("nexttrack", handleExternalAction);
        navigator.mediaSession.setActionHandler("previoustrack", handleExternalAction);
      } catch {
        // Some browsers don't support all handlers
      }
    }

    // Method 4: Visibility API — detect audio in other tabs
    const handleVisibilityChange = () => {
      if (cancelled) return;
      if (!document.hidden) {
        // User came back — clear external detection if no MediaSession metadata confirms it
        setTimeout(() => {
          if (cancelled) return;
          if (!navigator.mediaSession.metadata?.title && !spotifyContext?.state.playing) {
            const current = systemAudioRef.current;
            if (current?.source === "External tab") {
              setSystemAudio(null);
              setExternalAudioActive(false);
            }
          }
        }, 3000);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Method 5: Periodic check for MediaSession playback state changes
    let lastPlaybackState = navigator.mediaSession.playbackState;
    const playbackStateCheck = setInterval(() => {
      if (cancelled) return;
      const newState = navigator.mediaSession.playbackState;
      if (newState !== lastPlaybackState) {
        lastPlaybackState = newState;
        if (newState === "playing" && !navigator.mediaSession.metadata?.title && !spotifyContext?.state.playing) {
          setExternalAudioActive(true);
          setSystemAudio({
            title: "Audio detected in another tab",
            artist: "Browser tab",
            source: "External tab",
            isPlaying: true
          });
        }
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(mediaSessionInterval);
      clearInterval(mediaElementsInterval);
      clearInterval(playbackStateCheck);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      try {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
      } catch {
        // Ignore cleanup errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Unlink Spotify handler
  const handleUnlink = useCallback(async () => {
    if (unlinking) return;
    setUnlinking(true);
    try {
      await fetch("/api/music/spotify/unlink", { method: "POST" });
      window.location.reload();
    } catch {
      setUnlinking(false);
    }
  }, [unlinking]);

  const spotifyState = spotifyContext?.state;
  const hasSpotify = spotifyState?.connected && (spotifyState?.track || spotifyState?.playing);
  const currentTrack = hasSpotify ? spotifyState?.track : systemAudio;
  const isPlaying = hasSpotify ? spotifyState?.playing : !!systemAudio?.isPlaying;
  const source = hasSpotify
    ? spotifyState?.playbackSource || "Spotify"
    : systemAudio?.source || "No music";
  const currentTrackTitle =
    currentTrack && "name" in currentTrack
      ? (currentTrack as { name: string }).name
      : currentTrack?.title ?? "Music Player";
  const currentTrackArtist =
    currentTrack && "artist" in currentTrack
      ? (currentTrack as { artist: string }).artist
      : "Unknown Artist";

  const {
    searchResults,
    searchLoading,
    playlists,
    playlistsLoading,
    playlistTracks,
    playlistTracksLoading,
    actionLoading,
    searchTracks,
    loadPlaylists,
    openPlaylist,
    closePlaylist,
    playTrack,
    playPlaylist,
    togglePlay,
    nextTrack,
    previousTrack
  } = spotifyContext;

  // Effect: auto-search when typing
  useEffect(() => {
    if (panelView !== "search" || !localSearch.trim()) return;
    const timeoutId = window.setTimeout(() => {
      void searchTracks(localSearch);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [localSearch, panelView, searchTracks]);

  // Effect: load playlists on view switch
  useEffect(() => {
    if (panelView === "playlists") {
      void loadPlaylists();
    }
  }, [panelView, loadPlaylists]);

  // Show nothing if no track, no Spotify, and no external audio
  if (!currentTrack && !spotifyState?.connected && !externalAudioActive && !showPanel) {
    return null;
  }

  const shouldShow = hasSpotify || systemAudio || externalAudioActive || spotifyState?.connected || showPanel;
  if (!shouldShow && !showPanel) return null;

  const activePlaylist = spotifyState?.activePlaylist;

  return (
    <AnimatePresence mode="wait">
      {isMinimized ? (
        // ✅ MINIMIZED: Tiny pill at bottom
        <motion.div
          key="minimized"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 400, damping: 25 }}
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
          onClick={() => setIsMinimized(false)}
        >
          <motion.div
            className="flex items-center gap-3 rounded-full bg-gradient-to-r from-[rgba(255,209,102,0.2)] to-[rgba(57,208,255,0.2)] border border-white/20 px-4 py-2 backdrop-blur-md cursor-pointer hover:border-white/40 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ rotate: isPlaying ? 360 : 0 }}
              transition={{ duration: 2, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
            >
              {externalAudioActive && !hasSpotify ? (
                <Radio className="h-4 w-4 text-[var(--accent-coral)]" />
              ) : (
                <Music className="h-4 w-4 text-[var(--accent-sky)]" />
              )}
            </motion.div>
            <span className="text-xs font-semibold text-white/80 max-w-[120px] truncate">
              {currentTrackTitle}
            </span>
            {systemAudio && !hasSpotify ? (
              <span className="text-[10px] text-white/40 whitespace-nowrap">• {systemAudio.source}</span>
            ) : null}
            <motion.div
              className="h-2 w-2 rounded-full"
              animate={{ backgroundColor: isPlaying ? ["rgba(121,247,199,1)", "rgba(121,247,199,0.3)", "rgba(121,247,199,1)"] : "rgba(255,255,255,0.3)" }}
              transition={{ duration: 1.5, repeat: isPlaying ? Infinity : 0, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      ) : (
        // ✅ EXPANDED: Full music player at bottom-center
        <motion.div
          key="expanded"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-6 left-1/2 z-40 w-[min(32rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-[24px] bg-gradient-to-br from-[rgba(255,255,255,0.1)] to-[rgba(255,255,255,0.05)] border border-white/20 p-4 backdrop-blur-xl shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {externalAudioActive && !hasSpotify ? (
                <Radio className="h-4 w-4 text-[var(--accent-coral)]" />
              ) : (
                <Music className="h-4 w-4 text-[var(--accent-sky)]" />
              )}
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                {source}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* View switcher */}
              {hasSpotify && spotifyState?.ready ? (
                <>
                  <button
                    onClick={() => { setPanelView("now-playing"); setShowPanel(true); }}
                    className={`p-1.5 rounded-full transition-colors ${panelView === "now-playing" ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10"}`}
                    title="Now Playing"
                  >
                    <Music className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { setPanelView("search"); setShowPanel(true); }}
                    className={`p-1.5 rounded-full transition-colors ${panelView === "search" ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10"}`}
                    title="Search Tracks"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { setPanelView("playlists"); setShowPanel(true); }}
                    className={`p-1.5 rounded-full transition-colors ${panelView === "playlists" || panelView === "playlist-tracks" ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10"}`}
                    title="Playlists"
                  >
                    <ListMusic className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : null}
              {/* Unlink Spotify button */}
              {spotifyState?.connected ? (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUnlink}
                  disabled={unlinking}
                  title="Unlink Spotify account"
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5 text-[var(--accent-coral)]" />
                </motion.button>
              ) : null}
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-white/60" />
              </button>
            </div>
          </div>

          {/* Now Playing Content */}
          {panelView === "now-playing" ? (
            <>
              {/* Track Info */}
              {currentTrack ? (
                <div className="mb-3">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <p className="font-semibold text-white line-clamp-2">{currentTrackTitle}</p>
                    <p className="text-xs text-white/60 mt-1">{currentTrackArtist}</p>
                    {systemAudio && !hasSpotify ? (
                      <p className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Playing from: {systemAudio.source}
                      </p>
                    ) : null}
                  </motion.div>
                </div>
              ) : (
                <div className="mb-3 text-center py-2">
                  <p className="text-sm text-white/60">No music playing</p>
                  {spotifyState?.connected ? (
                    <p className="text-[10px] text-white/40 mt-1">Spotify connected — search tracks or open a playlist</p>
                  ) : (
                    <a
                      href={`/api/music/spotify/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/16"
                    >
                      <Music className="h-3 w-3" />
                      Connect Spotify
                    </a>
                  )}
                </div>
              )}

              {/* Playback Controls – only for Spotify */}
              {hasSpotify ? (
                <div className="flex items-center justify-center gap-3 mb-3">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => previousTrack()}
                    disabled={actionLoading}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                  >
                    <SkipBack className="h-4 w-4 text-white/80" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => togglePlay()}
                    disabled={actionLoading}
                    className="p-3 bg-gradient-to-r from-[var(--accent-sky)] to-[var(--accent-mint)] rounded-full"
                  >
                    {actionLoading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    ) : isPlaying ? (
                      <Pause className="h-5 w-5 text-black" />
                    ) : (
                      <Play className="h-5 w-5 text-black ml-0.5" />
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => nextTrack()}
                    disabled={actionLoading}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                  >
                    <SkipForward className="h-4 w-4 text-white/80" />
                  </motion.button>
                </div>
              ) : null}

              {/* System Audio / Cross-tab indicator */}
              {systemAudio && !hasSpotify ? (
                <div className="flex items-center gap-2 text-xs text-white/60 mb-3 justify-center">
                  <span className={`inline-block h-2 w-2 rounded-full ${systemAudio.isPlaying ? 'bg-[var(--accent-mint)] animate-pulse' : 'bg-white/30'}`} />
                  <span>{systemAudio.isPlaying ? "Playing" : "Paused"}</span>
                  {externalAudioActive ? (
                    <>
                      <span className="text-white/30">•</span>
                      <span className="text-[var(--accent-coral)]">External tab</span>
                    </>
                  ) : null}
                  {!externalAudioActive ? (
                    <>
                      <span className="text-white/30">•</span>
                      <span>Browser audio</span>
                    </>
                  ) : null}
                </div>
              ) : null}

              {/* Volume indicator */}
              {hasSpotify ? (
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>85% Volume</span>
                </div>
              ) : null}

              {/* Connect Spotify if not connected */}
              {!spotifyState?.connected ? (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <a
                    href={`/api/music/spotify/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
                    className="flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold transition hover:bg-white/16"
                  >
                    <Music className="h-3.5 w-3.5" />
                    Connect Spotify to search tracks, playlists, and control playback
                  </a>
                </div>
              ) : null}

              {/* Spotify unlink */}
              {spotifyState?.connected && !hasSpotify ? (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <button
                    onClick={handleUnlink}
                    disabled={unlinking}
                    className="flex items-center justify-center gap-2 text-[11px] text-[var(--accent-coral)]/70 hover:text-[var(--accent-coral)] transition-colors w-full disabled:opacity-50"
                  >
                    <LogOut className="h-3 w-3" />
                    {unlinking ? "Unlinking..." : "Unlink Spotify account"}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {/* Search Panel */}
          {panelView === "search" && hasSpotify && spotifyState?.ready ? (
            <div className="space-y-2">
              <div className="rounded-[20px] border border-white/10 bg-black/10 px-3 py-3">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-[var(--accent-sky)]" />
                  <input
                    value={localSearch}
                    onChange={(event) => setLocalSearch(event.target.value)}
                    placeholder="Search Spotify tracks..."
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1 max-h-48 overflow-auto">
                {searchLoading ? (
                  <div className="flex items-center gap-2 rounded-[16px] bg-white/10 px-3 py-2 text-xs">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--accent-sky)] border-t-transparent" />
                    Searching...
                  </div>
                ) : searchResults.length ? (
                  searchResults.slice(0, 8).map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => void playTrack(track)}
                      disabled={actionLoading}
                      className="flex w-full items-center gap-2 rounded-[16px] bg-white/10 p-2 text-left transition hover:bg-white/16 disabled:opacity-50"
                    >
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-[10px] bg-white/10">
                        {track.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={track.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{track.name}</p>
                        <p className="muted truncate text-[10px]">{track.artist}</p>
                      </div>
                      <span className="text-[10px] text-white/40">{formatTrackDuration(track.durationMs)}</span>
                    </button>
                  ))
                ) : localSearch.trim() ? (
                  <div className="text-center text-xs text-white/40 py-3">No results found</div>
                ) : (
                  <div className="text-center text-xs text-white/40 py-3">Type to search tracks</div>
                )}
              </div>
            </div>
          ) : null}

          {/* Playlists Panel */}
          {panelView === "playlists" && hasSpotify && spotifyState?.ready ? (
            <div className="space-y-1 max-h-48 overflow-auto">
              {playlistsLoading ? (
                <div className="flex items-center gap-2 rounded-[16px] bg-white/10 px-3 py-2 text-xs">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--accent-sky)] border-t-transparent" />
                  Loading playlists...
                </div>
              ) : playlists.length ? (
                playlists.slice(0, 6).map((playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => {
                      setPanelView("playlist-tracks");
                      void openPlaylist(playlist);
                    }}
                    className="flex w-full items-center gap-2 rounded-[16px] bg-white/10 p-2 text-left transition hover:bg-white/16"
                  >
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-[10px] bg-white/10">
                      {playlist.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={playlist.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{playlist.name}</p>
                      <p className="muted truncate text-[10px]">{playlist.trackCount} tracks</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void playPlaylist(playlist);
                      }}
                      disabled={actionLoading}
                      className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] transition hover:bg-white/16 disabled:opacity-50"
                    >
                      Play all
                    </button>
                  </button>
                ))
              ) : (
                <div className="text-center text-xs text-white/40 py-3">No playlists found</div>
              )}
            </div>
          ) : null}

          {/* Playlist Tracks Panel */}
          {panelView === "playlist-tracks" && activePlaylist ? (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => { closePlaylist(); setPanelView("playlists"); }}
                className="flex items-center gap-1 text-xs font-semibold text-[var(--accent-sky)] mb-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to playlists
              </button>
              <div className="max-h-40 overflow-auto space-y-1">
                {playlistTracksLoading ? (
                  <div className="flex items-center gap-2 rounded-[16px] bg-white/10 px-3 py-2 text-xs">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--accent-sky)] border-t-transparent" />
                    Loading tracks...
                  </div>
                ) : playlistTracks.length ? (
                  playlistTracks.slice(0, 10).map((track, index) => (
                    <button
                      key={`${track.id}-${index}`}
                      type="button"
                      onClick={() => void playTrack(track, index)}
                      disabled={actionLoading}
                      className="flex w-full items-center gap-2 rounded-[16px] bg-white/10 p-2 text-left transition hover:bg-white/16 disabled:opacity-50"
                    >
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-[10px] bg-white/10">
                        {track.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={track.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{track.name}</p>
                        <p className="muted truncate text-[10px]">{track.artist}</p>
                      </div>
                      <span className="text-[10px] text-white/40">{formatTrackDuration(track.durationMs)}</span>
                    </button>
                  ))
                ) : (
                  <div className="text-center text-xs text-white/40 py-3">No playable tracks</div>
                )}
              </div>
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
