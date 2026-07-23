"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ListMusic, LoaderCircle, LogOut, Pause, Play, Radio, Search, SkipBack, SkipForward, X } from "lucide-react";
import { motion } from "framer-motion";
import { formatTrackDuration } from "@/lib/music/spotify-catalog";
import { useSpotifyPlaybackContext } from "@/components/dashboard/useSpotifyPlayback";

type PanelView = "search" | "playlists" | "playlist-tracks";

type SystemAudioTrack = {
  title: string;
  artist: string;
  source: string;
  isPlaying: boolean;
};

function useSystemAudioTrack() {
  const [systemAudio, setSystemAudio] = useState<SystemAudioTrack | null>(null);
  const systemAudioRef = useRef(systemAudio);
  systemAudioRef.current = systemAudio;

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    // Method 1: MediaSession metadata
    const updateMetadata = () => {
      if (cancelled) return;
      try {
        const metadata = navigator.mediaSession.metadata;
        if (metadata?.title) {
          setSystemAudio({
            title: metadata.title || "Unknown track",
            artist: metadata.artist || "Unknown artist",
            source: metadata.album || "Browser audio",
            isPlaying: navigator.mediaSession.playbackState !== "paused"
          });
        }
      } catch {
        // MediaSession not available
      }
    };

    const handlePlay = () => setSystemAudio((current) => (current ? { ...current, isPlaying: true } : current));
    const handlePause = () => setSystemAudio((current) => (current ? { ...current, isPlaying: false } : current));

    updateMetadata();

    // Method 2: MediaSession action handlers (cross-tab detection)
    if ("mediaSession" in navigator) {
      const handleExternalAction = () => {
        if (!systemAudioRef.current) {
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
        // Some browsers may not support all handlers
      }
    }

    // Method 3: Document title heuristics
    let lastTitle = document.title;
    const titleCheck = setInterval(() => {
      if (cancelled) return;
      const title = document.title;
      if (title !== lastTitle) {
        lastTitle = title;
        const indicators = ["♪", "▶", "♫", "Now Playing", "Spotify", "YouTube"];
        const hasIndicator = indicators.some((ind) => title.includes(ind));
        if (hasIndicator && !navigator.mediaSession.metadata?.title) {
          setSystemAudio({
            title: title.replace(/[♪▶♫]/g, "").trim() || "Audio playing",
            artist: "Current page",
            source: "Player embedded in page",
            isPlaying: true
          });
        }
      }
    }, 3000);

    // Method 4: Check for video/audio elements on our page
    const checkMedia = () => {
      if (cancelled) return;
      try {
        const videos = document.querySelectorAll<HTMLVideoElement>("video");
        const audios = document.querySelectorAll<HTMLAudioElement>("audio");
        for (const el of [...videos, ...audios]) {
          if (!el.paused && el.currentTime > 0 && !el.muted) {
            setSystemAudio({
              title: el.title || document.title || "Media playing",
              artist: el instanceof HTMLVideoElement ? "Embedded video" : "Embedded audio",
              source: "This page",
              isPlaying: true
            });
            return;
          }
        }
      } catch {
        // Cross-origin restrictions
      }
    };
    const mediaInterval = setInterval(checkMedia, 2500);

    const sessionInterval = setInterval(updateMetadata, 2000);

    return () => {
      cancelled = true;
      clearInterval(sessionInterval);
      clearInterval(titleCheck);
      clearInterval(mediaInterval);
      try {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
      } catch {
        // Ignore cleanup failures
      }
    };
  }, []);

  return systemAudio;
}

type SpotifyPlaybackPanelProps = {
  connected: boolean;
  loginHref: string;
  compact?: boolean;
  ultraCompact?: boolean;
  searchQuery?: string;
  onPlayingChange?: (playing: boolean) => void;
};

export function SpotifyPlaybackPanel(props: SpotifyPlaybackPanelProps) {
  if (!props.connected) {
    return <SpotifyPlaybackDisconnected {...props} />;
  }

  return <SpotifyPlaybackConnected {...props} />;
}

function SpotifyPlaybackDisconnected({
  loginHref,
  compact = false
}: SpotifyPlaybackPanelProps) {
  const systemAudio = useSystemAudioTrack();
  const playbackHint = systemAudio
    ? `${systemAudio.isPlaying ? "Playing" : "Paused"} ${systemAudio.title} by ${systemAudio.artist} from ${systemAudio.source}.`
    : "Premium accounts get full in-browser playback, search, and playlist browsing.";

  return (
    <div className={compact ? "min-w-0 flex-1" : "rounded-[22px] border border-dashed border-white/14 bg-white/6 px-4 py-4 text-sm"}>
      <p className="font-semibold">Connect Spotify to play music here</p>
      <p className="muted mt-2 text-xs">{playbackHint}</p>
      <a
        href={loginHref}
        className={`inline-flex items-center justify-center rounded-full bg-white/10 font-semibold transition hover:bg-white/16 ${
          compact ? "mt-0 px-3 py-2 text-xs" : "mt-4 px-4 py-2 text-sm"
        }`}
      >
        Connect Spotify
      </a>
    </div>
  );
}

function SpotifyPlaybackConnected({
  compact = false,
  ultraCompact = false,
  searchQuery = "",
  onPlayingChange
}: SpotifyPlaybackPanelProps) {
  const playback = useSpotifyPlaybackContext();
  const systemAudio = useSystemAudioTrack();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [view, setView] = useState<PanelView>("search");
  const [unlinking, setUnlinking] = useState(false);

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

  const { state } = playback;
  const isSystemAudioActive = !state.playing && !!systemAudio;
  const displayTrack = state.track
    ? state.track
    : systemAudio
      ? {
          id: "system-audio",
          name: systemAudio.title,
          uri: "",
          artist: systemAudio.artist,
          album: "",
          imageUrl: null,
          durationMs: 0
        }
      : null;
  const displayPlaying = state.playing || systemAudio?.isPlaying || false;
  const playbackSource = state.playbackSource || systemAudio?.source || "No music playing";
  const playbackOrigin = state.externalDevice
    ? `${state.externalDevice.type} • ${state.externalDevice.name}`
    : isSystemAudioActive
      ? "Browser audio"
      : state.ready
        ? "In-browser player"
        : state.track
          ? "Your linked Spotify account"
          : "";

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    onPlayingChange?.(state.playing);
  }, [onPlayingChange, state.playing]);

  useEffect(() => {
    if (view !== "search" || !localSearch.trim()) return;
    const timeoutId = window.setTimeout(() => {
      void playback.searchTracks(localSearch);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [localSearch, playback, view]);

  useEffect(() => {
    if (view !== "playlists") return;
    void playback.loadPlaylists();
  }, [playback, view]);

  const {
    searchResults,
    searchLoading,
    playlists,
    playlistsLoading,
    playlistTracks,
    playlistTracksLoading,
    actionLoading,
    playTrack,
    playPlaylist,
    togglePlay,
    nextTrack,
    previousTrack,
    openPlaylist,
    closePlaylist,
    clearError
  } = playback;

  const activePlaylist = state.activePlaylist;

  if (ultraCompact) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-[12px] bg-white/10">
          {displayTrack?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayTrack.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{displayTrack?.name || "Focus music"}</p>
          <p className="muted truncate text-[10px]">
            {displayTrack?.artist || playbackSource}
            {playbackOrigin ? ` • ${playbackOrigin}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void togglePlay()}
          className="rounded-full bg-white/10 p-2 transition hover:bg-white/16"
          aria-label={displayPlaying ? "Pause music" : "Play music"}
        >
          {actionLoading ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : state.playing ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={compact ? "flex min-w-0 flex-1 items-center gap-3" : "space-y-4"}>
      <div className={`flex items-center gap-3 ${compact ? "min-w-0 flex-1" : ""}`}>
        <div
          className={`${compact ? "h-9 w-9" : "h-12 w-12"} shrink-0 overflow-hidden rounded-[14px] bg-white/10`}
        >
          {state.track?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={state.track.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : activePlaylist?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activePlaylist.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate font-semibold ${compact ? "text-sm" : "text-base"}`}>
            {state.track?.name || activePlaylist?.name || "Ready for Spotify playback"}
          </p>
          <p className="muted truncate text-xs">
            {state.track
              ? `${state.track.artist} • ${state.track.album}`
              : activePlaylist
                ? `${activePlaylist.trackCount} track(s) • ${activePlaylist.owner}`
                : state.ready
                  ? "Search tracks or open one of your playlists."
                  : "Connecting Spotify player..."}
          </p>
          <p className="muted truncate text-[10px]">{playbackSource}{playbackOrigin ? ` • ${playbackOrigin}` : ""}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void previousTrack()}
            disabled={actionLoading}
            className="rounded-full bg-white/10 p-2 transition hover:bg-white/16 disabled:opacity-50"
            aria-label="Previous track"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void togglePlay()}
            disabled={actionLoading}
            className={`grid ${compact ? "h-10 w-10" : "h-11 w-11"} place-items-center rounded-full transition disabled:opacity-50 ${
              state.playing
                ? "bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-sky))] text-slate-950"
                : "bg-white/10 text-[var(--fg)]"
            }`}
            aria-label={state.playing ? "Pause Spotify playback" : "Play Spotify playback"}
          >
            {actionLoading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : state.playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => void nextTrack()}
            disabled={actionLoading}
            className="rounded-full bg-white/10 p-2 transition hover:bg-white/16 disabled:opacity-50"
            aria-label="Next track"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!compact ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setView("search");
                closePlaylist();
              }}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                view === "search" ? "bg-white/16 text-[var(--fg)]" : "bg-white/8 text-[var(--muted)] hover:bg-white/12"
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setView("playlists");
                closePlaylist();
              }}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                view === "playlists" || view === "playlist-tracks"
                  ? "bg-white/16 text-[var(--fg)]"
                  : "bg-white/8 text-[var(--muted)] hover:bg-white/12"
              }`}
            >
              <ListMusic className="h-3.5 w-3.5" />
              My playlists
            </button>
          </div>

          {view === "search" ? (
            <>
              <div className="rounded-[20px] border border-white/10 bg-black/10 px-3 py-3">
                <input
                  value={localSearch}
                  onChange={(event) => setLocalSearch(event.target.value)}
                  placeholder="Search Spotify tracks..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>

              <div className="space-y-2">
                {searchLoading ? (
                  <div className="flex items-center gap-2 rounded-[20px] bg-white/10 px-4 py-3 text-sm">
                    <LoaderCircle className="h-4 w-4 animate-spin text-[var(--accent-sky)]" />
                    Searching Spotify...
                  </div>
                ) : searchResults.length ? (
                  searchResults.map((track) => (
                    <TrackRow key={track.id} track={track} onPlay={() => void playTrack(track)} />
                  ))
                ) : (
                  <div className="rounded-[20px] border border-dashed border-white/14 bg-white/6 px-4 py-6 text-center text-sm">
                    Search for a song, artist, or album to start playback.
                  </div>
                )}
              </div>
            </>
          ) : null}

          {view === "playlists" ? (
            <div className="space-y-2">
              {playlistsLoading ? (
                <div className="flex items-center gap-2 rounded-[20px] bg-white/10 px-4 py-3 text-sm">
                  <LoaderCircle className="h-4 w-4 animate-spin text-[var(--accent-sky)]" />
                  Loading your playlists...
                </div>
              ) : playlists.length ? (
                playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className="flex items-center gap-3 rounded-[20px] bg-white/10 p-3"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setView("playlist-tracks");
                        void openPlaylist(playlist);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[12px] bg-white/10">
                        {playlist.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={playlist.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{playlist.name}</p>
                        <p className="muted truncate text-xs">
                          {playlist.trackCount} track(s) • {playlist.owner}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => void playPlaylist(playlist)}
                      disabled={actionLoading}
                      className="rounded-full bg-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition hover:bg-white/16 disabled:opacity-50"
                    >
                      Play all
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-white/14 bg-white/6 px-4 py-6 text-center text-sm">
                  No playlists found on this Spotify account yet. If you connected before playlists were added, reconnect Spotify to refresh permissions.
                </div>
              )}
            </div>
          ) : null}

          {view === "playlist-tracks" && activePlaylist ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-white/10 px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    closePlaylist();
                    setView("playlists");
                  }}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent-sky)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to playlists
                </button>
                <button
                  type="button"
                  onClick={() => void playPlaylist(activePlaylist)}
                  disabled={actionLoading}
                  className="rounded-full bg-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition hover:bg-white/16 disabled:opacity-50"
                >
                  Play playlist
                </button>
              </div>

              <div className="rounded-[20px] bg-white/8 px-4 py-3">
                <p className="text-sm font-semibold">{activePlaylist.name}</p>
                <p className="muted mt-1 text-xs">
                  {activePlaylist.trackCount} track(s) • {activePlaylist.owner}
                </p>
                {activePlaylist.description ? (
                  <p className="muted mt-2 line-clamp-2 text-xs">{activePlaylist.description}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                {playlistTracksLoading ? (
                  <div className="flex items-center gap-2 rounded-[20px] bg-white/10 px-4 py-3 text-sm">
                    <LoaderCircle className="h-4 w-4 animate-spin text-[var(--accent-sky)]" />
                    Loading playlist tracks...
                  </div>
                ) : playlistTracks.length ? (
                  playlistTracks.map((track, index) => (
                    <TrackRow
                      key={`${track.id}-${index}`}
                      track={track}
                      onPlay={() => void playTrack(track, index)}
                    />
                  ))
                ) : (
                  <div className="rounded-[20px] border border-dashed border-white/14 bg-white/6 px-4 py-6 text-center text-sm">
                    This playlist has no playable tracks right now.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {state.error ? (
        <div className={`flex items-start justify-between gap-3 rounded-[16px] bg-[rgba(255,125,89,0.14)] px-3 py-2 text-xs ${compact ? "hidden" : ""}`}>
          <p>{state.error}</p>
          <button type="button" onClick={clearError} className="rounded-full bg-white/10 p-1" aria-label="Dismiss error">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}
      {state.premiumRequired ? (
        <p className={`rounded-[16px] bg-[rgba(255,209,102,0.14)] px-3 py-2 text-xs ${compact ? "hidden" : ""}`}>
          Spotify Premium is required for full in-browser playback.
        </p>
      ) : null}
      {!compact ? (
        <div className="mt-2 flex items-center justify-between rounded-[16px] bg-white/8 px-3 py-2">
          <span className="text-[11px] text-white/50">Spotify connected</span>
          <button
            type="button"
            onClick={handleUnlink}
            disabled={unlinking}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent-coral)]/70 hover:text-[var(--accent-coral)] transition-colors disabled:opacity-50"
          >
            <LogOut className="h-3 w-3" />
            {unlinking ? "Unlinking..." : "Unlink account"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TrackRow({
  track,
  onPlay
}: {
  track: { id: string; name: string; artist: string; album: string; imageUrl: string | null; durationMs: number };
  onPlay: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPlay}
      whileHover={{ x: 3, scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="flex w-full items-center gap-3 rounded-[20px] bg-white/10 p-3 text-left transition-colors hover:bg-white/16"
    >
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[12px] bg-white/10">
        {track.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{track.name}</p>
        <p className="muted truncate text-xs">
          {track.artist} • {track.album}
        </p>
      </div>
      <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
        {formatTrackDuration(track.durationMs)}
      </span>
    </motion.button>
  );
}
