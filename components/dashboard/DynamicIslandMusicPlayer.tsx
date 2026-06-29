"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Volume2, X, Music } from "lucide-react";
import { useSpotifyPlaybackContext } from "@/components/dashboard/useSpotifyPlayback";

type SystemAudioTrack = {
  title: string;
  artist: string;
  source: string;
  isPlaying: boolean;
};

interface DynamicIslandMusicPlayerProps {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  isCompact?: boolean;
}

export function DynamicIslandMusicPlayer({ scrollContainerRef, isCompact = false }: DynamicIslandMusicPlayerProps) {
  const spotifyContext = useSpotifyPlaybackContext();
  const [isMinimized, setIsMinimized] = useState(true);
  const [systemAudio, setSystemAudio] = useState<SystemAudioTrack | null>(null);
  const [lastScrollY, setLastScrollY] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // ✅ Detect system audio from browser tabs/apps using Media Session API
  useEffect(() => {
    if (!navigator.mediaSession) return;

    const handleMetadataChange = () => {
      const metadata = navigator.mediaSession.metadata;
      if (metadata) {
        setSystemAudio({
          title: metadata.title || "Unknown Track",
          artist: metadata.artist || "Unknown Artist",
          source: "Browser Audio",
          isPlaying: true
        });
      }
    };

    navigator.mediaSession.setActionHandler("play", () => {
      setSystemAudio((current) => current ? { ...current, isPlaying: true } : null);
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      setSystemAudio((current) => current ? { ...current, isPlaying: false } : null);
    });

    // Listen for metadata changes
    if (navigator.mediaSession.metadata) {
      handleMetadataChange();
    }

    // Fallback: Poll for audio context activity every 2 seconds
    const audioCheckInterval = setInterval(() => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === "running") {
          // Audio is playing somewhere
          if (!systemAudio) {
            setSystemAudio({
              title: "Audio Playing",
              artist: "Browser or App",
              source: "System Audio",
              isPlaying: true
            });
          }
        }
      } catch {
        // AudioContext not available
      }
    }, 2000);

    return () => clearInterval(audioCheckInterval);
  }, [systemAudio]);

  // ✅ Scroll detection for Dynamic Island collapse/expand
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollY = scrollContainer.scrollTop;
      const scrollDelta = Math.abs(scrollY - lastScrollY);

      // Minimize when scrolling up (scroll delta > 20px)
      if (scrollY > lastScrollY + 20) {
        setIsMinimized(true);
      }
      // Expand when scrolling down or at bottom
      else if (scrollY < lastScrollY - 20 || scrollY + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 100) {
        setIsMinimized(false);
      }

      setLastScrollY(scrollY);

      // Debounce scroll updates
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        // Reset after scroll stops
      }, 500);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [scrollContainerRef, lastScrollY]);

  const spotifyState = spotifyContext?.state;
  const currentTrack = spotifyState?.track || systemAudio;
  const isPlaying = spotifyState?.playing || systemAudio?.isPlaying;
  const source = spotifyState?.playbackSource || systemAudio?.source || "No music";

  if (!currentTrack && !spotifyState?.connected) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {isMinimized ? (
        // ✅ Minimized Dynamic Island style
        <motion.div
          key="minimized"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
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
              <Music className="h-4 w-4 text-[var(--accent-sky)]" />
            </motion.div>
            <span className="text-xs font-semibold text-white/80 max-w-[120px] truncate">
              {currentTrack?.title || "Music Player"}
            </span>
          </motion.div>
        </motion.div>
      ) : (
        // ✅ Expanded music player panel
        <motion.div
          key="expanded"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-6 right-6 z-40 w-80 rounded-[24px] bg-gradient-to-br from-[rgba(255,255,255,0.1)] to-[rgba(255,255,255,0.05)] border border-white/20 p-4 backdrop-blur-xl shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-[var(--accent-sky)]" />
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">{source}</span>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-white/60" />
            </button>
          </div>

          {/* Track Info */}
          {currentTrack ? (
            <div className="mb-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <p className="font-semibold text-white line-clamp-2">{currentTrack.title}</p>
                <p className="text-xs text-white/60 mt-1">{currentTrack.artist}</p>
              </motion.div>
            </div>
          ) : (
            <div className="mb-4 text-center py-4">
              <p className="text-sm text-white/60">No music playing</p>
            </div>
          )}

          {/* Playback Controls */}
          {currentTrack && (
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
          )}

          {/* Volume Indicator */}
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Volume2 className="h-3.5 w-3.5" />
            <span>85% Volume</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
