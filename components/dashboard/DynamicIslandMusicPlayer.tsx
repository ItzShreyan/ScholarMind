"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Volume2, X, Music, ExternalLink, LogOut, Radio } from "lucide-react";
import { useSpotifyPlaybackContext } from "@/components/dashboard/useSpotifyPlayback";

type SystemAudioTrack = {
  title: string;
  artist: string;
  source: string;
  sourcePageUrl?: string;
  isPlaying: boolean;
};

interface DynamicIslandMusicPlayerProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  isCompact?: boolean;
}

export function DynamicIslandMusicPlayer({ scrollContainerRef }: DynamicIslandMusicPlayerProps) {
  const spotifyContext = useSpotifyPlaybackContext();
  const [isMinimized, setIsMinimized] = useState(true);
  const [systemAudio, setSystemAudio] = useState<SystemAudioTrack | null>(null);
  const [externalAudioActive, setExternalAudioActive] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [, setIsAtBottom] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const systemAudioRef = useRef(systemAudio);
  systemAudioRef.current = systemAudio;

  // ✅ Cross-tab / system audio detection
  // Uses: MediaSession API (same-origin embeds), MediaSession action handlers
  // (browser media notification → detects external media activity),
  // and document.title heuristics
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    // Method 1: MediaSession metadata polling for same-origin / embedded media
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
        } else {
          // If no MediaSession metadata, clear only if we're not in a
          // cross-tab detection scenario
          const current = systemAudioRef.current;
          if (current && current.source !== "External tab") {
            setSystemAudio(null);
          }
        }
      } catch {
        // MediaSession not available
      }
    };

    const mediaSessionInterval = setInterval(pollMediaSession, 2000);

    // Method 2: MediaSession action handlers detect cross-tab audio.
    // When another tab (e.g. YouTube, Spotify web) plays audio and the
    // user clicks the browser's media notification, our handlers fire.
    if ("mediaSession" in navigator) {
      const handleMediaAction = () => {
        // We received a media action while we aren't playing anything →
        // external audio is active
        if (!spotifyContext?.state.playing && !systemAudioRef.current?.title) {
          setExternalAudioActive(true);
          setSystemAudio({
            title: "Audio playing in another tab",
            artist: "External tab",
            source: "External tab",
            sourcePageUrl: document.referrer || undefined,
            isPlaying: true
          });
        }
      };

      try {
        navigator.mediaSession.setActionHandler("play", handleMediaAction);
        navigator.mediaSession.setActionHandler("pause", handleMediaAction);
        navigator.mediaSession.setActionHandler("nexttrack", handleMediaAction);
        navigator.mediaSession.setActionHandler("previoustrack", handleMediaAction);
      } catch {
        // Some browsers don't support all handlers
      }
    }

    // Method 3: Document title heuristics – some pages embed players that
    // update the title with play indicators
    let lastTitle = document.title;
    const titleCheck = setInterval(() => {
      if (cancelled) return;
      const title = document.title;
      if (title !== lastTitle) {
        lastTitle = title;
        const audioIndicators = ["♪", "▶", "♫", "Now Playing", "Spotify", "YouTube"];
        const hasIndicator = audioIndicators.some((ind) => title.includes(ind));
        if (hasIndicator && !spotifyContext?.state.playing && !navigator.mediaSession.metadata?.title) {
          setSystemAudio({
            title: title.replace(/[♪▶♫]/g, "").trim() || "Audio playing",
            artist: "Current page",
            source: "Player embedded in page",
            isPlaying: true
          });
        }
      }
    }, 3000);

    // Method 4: Check for <video>/<audio> elements on our page
    const checkEmbeddedMedia = () => {
      if (cancelled) return;
      try {
        const videos = document.querySelectorAll<HTMLVideoElement>("video");
        const audios = document.querySelectorAll<HTMLAudioElement>("audio");
        for (const v of videos) {
          if (!v.paused && v.currentTime > 0 && !v.muted) {
            const title = v.title || document.title || "Video playing";
            setSystemAudio({
              title,
              artist: "Embedded video",
              source: "This page",
              isPlaying: true
            });
            return;
          }
        }
        for (const a of audios) {
          if (!a.paused && a.currentTime > 0 && !a.muted) {
            setSystemAudio({
              title: a.title || document.title || "Audio playing",
              artist: "Embedded audio",
              source: "This page",
              isPlaying: true
            });
            return;
          }
        }
      } catch {
        // Cross-origin restrictions might prevent access
      }
    };
    const mediaElementsInterval = setInterval(checkEmbeddedMedia, 2500);

    return () => {
      cancelled = true;
      clearInterval(mediaSessionInterval);
      clearInterval(titleCheck);
      clearInterval(mediaElementsInterval);
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
      // Reload the page to reset all state cleanly
      window.location.reload();
    } catch {
      setUnlinking(false);
    }
  }, [unlinking]);

  // ✅ Scroll-based expand/minimize
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const currentScrollY = scrollContainer.scrollTop;
        const scrollHeight = scrollContainer.scrollHeight;
        const clientHeight = scrollContainer.clientHeight;
        const atBottom = currentScrollY + clientHeight >= scrollHeight - 60;

        setIsAtBottom(atBottom);

        // Scroll UP → minimize to Dynamic Island
        if (currentScrollY < lastScrollY - 15) {
          setIsMinimized(true);
        }
        // Scroll DOWN → expand
        else if (currentScrollY > lastScrollY + 15) {
          setIsMinimized(false);
        }

        // At bottom → always expand
        if (atBottom) {
          setIsMinimized(false);
        }

        setLastScrollY(currentScrollY);

        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {}, 300);
      });
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [scrollContainerRef, lastScrollY]);

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

  // Show nothing if no track, no Spotify, and no external audio
  if (!currentTrack && !spotifyState?.connected && !externalAudioActive) {
    return null;
  }

  // If Spotify is connected but no track is playing, still show if external audio is active
  const shouldShow = hasSpotify || systemAudio || externalAudioActive || spotifyState?.connected;

  if (!shouldShow) return null;

  return (
    <AnimatePresence mode="wait">
      {isMinimized ? (
        // ✅ MINIMIZED: Dynamic Island pill at top-center
        <motion.div
          key="minimized"
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 400, damping: 25 }}
          className="fixed top-6 left-1/2 z-40 -translate-x-1/2"
          onClick={() => {
            setIsMinimized(false);
            const container = scrollContainerRef.current;
            if (container) {
              container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
            }
          }}
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
          </motion.div>
        </motion.div>
      ) : (
        // ✅ EXPANDED: Full music player panel at bottom-right
        <motion.div
          key="expanded"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-6 right-6 z-40 w-80 rounded-[24px] bg-gradient-to-br from-[rgba(255,255,255,0.1)] to-[rgba(255,255,255,0.05)] border border-white/20 p-4 backdrop-blur-xl shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {externalAudioActive && !hasSpotify ? (
                <Radio className="h-4 w-4 text-[var(--accent-coral)]" />
              ) : (
                <Music className="h-4 w-4 text-[var(--accent-sky)]" />
              )}
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                {source}
              </span>
              {systemAudio && !hasSpotify ? (
                <span className="text-[10px] text-white/40 ml-1">
                  ({systemAudio.sourcePageUrl ? "from this page" : "system audio"})
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              {/* Unlink Spotify button – only when Spotify is connected */}
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

          {/* Track Info */}
          {currentTrack ? (
            <div className="mb-4">
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
            <div className="mb-4 text-center py-4">
              <p className="text-sm text-white/60">No music playing</p>
              {spotifyState?.connected ? (
                <p className="text-[10px] text-white/40 mt-1">Spotify connected — open the music dock to play something</p>
              ) : null}
            </div>
          )}

          {/* Playback Controls – only for Spotify (we can't control cross-tab audio) */}
          {hasSpotify ? (
            <div className="flex items-center justify-center gap-3 mb-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => spotifyContext?.previousTrack()}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <SkipBack className="h-4 w-4 text-white/80" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => spotifyContext?.togglePlay()}
                className="p-3 bg-gradient-to-r from-[var(--accent-sky)] to-[var(--accent-mint)] rounded-full"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 text-black" />
                ) : (
                  <Play className="h-5 w-5 text-black ml-0.5" />
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => spotifyContext?.nextTrack()}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <SkipForward className="h-4 w-4 text-white/80" />
              </motion.button>
            </div>
          ) : null}

          {/* System Audio / Cross-tab indicator */}
          {systemAudio && !hasSpotify ? (
            <div className="flex items-center gap-2 text-xs text-white/60 mb-4 justify-center">
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
                  <span>Browser audio (no remote controls available)</span>
                </>
              ) : null}
            </div>
          ) : null}

          {/* Volume / Status indicator */}
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Volume2 className="h-3.5 w-3.5" />
            <span>
              {hasSpotify
                ? "85% Volume"
                : systemAudio?.isPlaying
                  ? externalAudioActive
                    ? "Audio detected in another tab"
                    : "Page audio detected"
                  : spotifyState?.connected
                    ? "Spotify ready"
                    : "No audio"}
            </span>
          </div>

          {/* Unlink text button (as alternative to icon) */}
          {spotifyState?.connected && !hasSpotify ? (
            <div className="mt-3 pt-3 border-t border-white/10">
              <button
                onClick={handleUnlink}
                disabled={unlinking}
                className="flex items-center gap-2 text-[11px] text-[var(--accent-coral)]/70 hover:text-[var(--accent-coral)] transition-colors disabled:opacity-50"
              >
                <LogOut className="h-3 w-3" />
                {unlinking ? "Unlinking..." : "Unlink Spotify account"}
              </button>
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
