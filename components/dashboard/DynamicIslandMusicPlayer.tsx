"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, X, Music, ExternalLink,
  LogOut, Radio, Search, ChevronUp, ListMusic, ArrowLeft, ChevronDown,
  Repeat, Repeat1, Plus, Trash2, Save, Upload, Forward, Rewind,
  FolderOpen, ListOrdered, Zap
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useSpotifyPlaybackContext } from "@/components/dashboard/useSpotifyPlayback";
import { useMusicPlayback } from "@/components/dashboard/MusicPlaybackContext";
import { formatTrackDuration } from "@/lib/music/spotify-catalog";
import { BeatReactiveBorder } from "@/components/dashboard/BeatReactiveBorder";
import { useBeatAnalyserNode } from "@/hooks/useBeatAnalyserNode";
import { useSpotifyBeatClock, stringToHue } from "@/hooks/useSpotifyBeatClock";
import type { BeatSignal } from "@/hooks/useSpotifyBeatClock";

type SystemAudioTrack = {
  title: string;
  artist: string;
  source: string;
  sourcePageUrl?: string;
  isPlaying: boolean;
};

type PanelView = "now-playing" | "search" | "playlists" | "playlist-tracks" | "queue";

type UploadedTrack = {
  id: string;
  name: string;
  artist: string;
  file_name: string;
  playback_url: string;
  duration: number;
};

type LoopMode = "none" | "all" | "one";

interface DynamicIslandMusicPlayerProps {
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  isCompact?: boolean;
}

export function DynamicIslandMusicPlayer({ scrollContainerRef: _scrollContainerRef }: DynamicIslandMusicPlayerProps) {
  const spotifyContext = useSpotifyPlaybackContext();
  const { setPlayback } = useMusicPlayback();
  const [isMinimized, setIsMinimized] = useState(false);
  const [systemAudio, setSystemAudio] = useState<SystemAudioTrack | null>(null);
  const [externalAudioActive, setExternalAudioActive] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const systemAudioRef = useRef(systemAudio);
  const [localSearch, setLocalSearch] = useState("");
  const pathname = usePathname();

  // ── Beat-reactive border toggle (persisted in localStorage) ─────────────────
  const [beatReactiveEnabled, setBeatReactiveEnabled] = useState(false);
  const beatReactiveLoadedRef = useRef(false);
  const beatReactiveStorageKey = "scholarmind_beat_reactive_border";

  useEffect(() => {
    try {
      const stored = localStorage.getItem(beatReactiveStorageKey);
      if (stored === "true") setBeatReactiveEnabled(true);
      beatReactiveLoadedRef.current = true;
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!beatReactiveLoadedRef.current) return;
    try {
      localStorage.setItem(beatReactiveStorageKey, beatReactiveEnabled ? "true" : "false");
    } catch { /* ignore */ }
  }, [beatReactiveEnabled]);

  // Uploaded audio track state
  const [uploadedTracks, setUploadedTracks] = useState<UploadedTrack[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isLocalPlaying, setIsLocalPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const uploadedTracksRef = useRef<UploadedTrack[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadExistingTracks = async () => {
      try {
        const response = await fetch("/api/music/tracks");
        if (!response.ok) return;

        const payload = await response.json() as { tracks?: Array<Partial<UploadedTrack> & { file_name?: string; playback_url?: string; duration?: number }> };
        const tracks = Array.isArray(payload?.tracks) ? payload.tracks : [];

        if (cancelled) return;

        const normalizedTracks: UploadedTrack[] = tracks.map((track) => ({
          id: track.id ?? "",
          name: track.name ?? track.file_name?.replace(/\.[^/.]+$/, "") ?? "Untitled track",
          artist: track.artist ?? "Uploaded audio",
          file_name: track.file_name ?? track.name ?? "",
          playback_url: track.playback_url ?? "",
          duration: typeof track.duration === "number" ? track.duration : 0
        }));

        setUploadedTracks(normalizedTracks);
      } catch {
        // Ignore initial load failures; uploads can still be handled normally.
      }
    };

    void loadExistingTracks();

    return () => {
      cancelled = true;
    };
  }, []);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedTrackDuration, setUploadedTrackDuration] = useState(0);
  const [uploadedTrackCurrentTime, setUploadedTrackCurrentTime] = useState(0);
  const [panelView, setPanelView] = useState<PanelView>("now-playing");
  const [showPanel, setShowPanel] = useState(false);
  const [loopMode, setLoopMode] = useState<LoopMode>("none");
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragSeekValueRef = useRef(0);

  // Playlist management state
  const [playlistName, setPlaylistName] = useState("");
  const [showSavePlaylist, setShowSavePlaylist] = useState(false);
  const [savedPlaylists, setSavedPlaylists] = useState<Array<{
    id: string; name: string; description: string; tracks: UploadedTrack[];
  }>>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [viewPlaylistId, setViewPlaylistId] = useState<string | null>(null);
  const [viewPlaylistTracks, setViewPlaylistTracks] = useState<UploadedTrack[]>([]);

  const hasUploadedTracksRef = useRef(uploadedTracks.length);
  hasUploadedTracksRef.current = uploadedTracks.length;
  uploadedTracksRef.current = uploadedTracks;
  const loopModeRef = useRef(loopMode);
  loopModeRef.current = loopMode;
  const currentQueueIndexRef = useRef(currentQueueIndex);
  currentQueueIndexRef.current = currentQueueIndex;

  systemAudioRef.current = systemAudio;

  // Cross-tab / system audio detection
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

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
        const current = systemAudioRef.current;
        if (current && current.source !== "External tab" && current.source !== "Browser tab") {
          setSystemAudio(null);
          setExternalAudioActive(false);
        }
      } catch { /* MediaSession not available */ }
    };

    const mediaSessionInterval = setInterval(pollMediaSession, 2000);

    const checkEmbeddedMedia = () => {
      if (cancelled) return;
      try {
        const videos = document.querySelectorAll<HTMLVideoElement>("video");
        const audios = document.querySelectorAll<HTMLAudioElement>("audio");
        for (const v of videos) {
          if (!v.paused && v.currentTime > 0 && !v.muted) {
            setSystemAudio({ title: v.title || document.title || "Video playing", artist: "Embedded video", source: "This page", isPlaying: true });
            return;
          }
        }
        for (const a of audios) {
          if (!a.paused && a.currentTime > 0 && !a.muted) {
            setSystemAudio({ title: a.title || document.title || "Audio playing", artist: "Embedded audio", source: "This page", isPlaying: true });
            return;
          }
        }
      } catch { /* cross-origin */ }
    };
    const mediaElementsInterval = setInterval(checkEmbeddedMedia, 2500);

    if ("mediaSession" in navigator) {
      const handleExternalAction = () => {
        if (!spotifyContext?.state.playing && !systemAudioRef.current?.title) {
          setExternalAudioActive(true);
          setSystemAudio({ title: "Audio playing in another tab", artist: "External tab", source: "External tab", isPlaying: true });
        }
      };
      try {
        navigator.mediaSession.setActionHandler("play", handleExternalAction);
        navigator.mediaSession.setActionHandler("pause", handleExternalAction);
        navigator.mediaSession.setActionHandler("nexttrack", handleExternalAction);
        navigator.mediaSession.setActionHandler("previoustrack", handleExternalAction);
      } catch { /* some browsers */ }
    }

    const handleVisibilityChange = () => {
      if (cancelled) return;
      if (!document.hidden) {
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

    let lastPlaybackState = navigator.mediaSession.playbackState;
    const playbackStateCheck = setInterval(() => {
      if (cancelled) return;
      const newState = navigator.mediaSession.playbackState;
      if (newState !== lastPlaybackState) {
        lastPlaybackState = newState;
        if (newState === "playing" && !navigator.mediaSession.metadata?.title && !spotifyContext?.state.playing) {
          setExternalAudioActive(true);
          setSystemAudio({ title: "Audio detected in another tab", artist: "Browser tab", source: "External tab", isPlaying: true });
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
      } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unlink Spotify
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

  // Setup audio element with refs to avoid stale closures
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    // Set this before assigning a source so Web Audio can analyse proxied or
    // externally-hosted audio when the server supplies the appropriate CORS header.
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setUploadedTrackDuration(audio.duration);
      setUploadedTracks((prev) =>
        prev.map((t, i) =>
          i === currentQueueIndexRef.current ? { ...t, duration: audio.duration } : t
        )
      );
    };

    const handleTimeUpdate = () => {
      if (!isDraggingRef.current) {
        setUploadedTrackCurrentTime(audio.currentTime);
      }
    };

    const handlePlay = () => setIsLocalPlaying(true);
    const handlePause = () => setIsLocalPlaying(false);

    const handleEnded = () => {
      const lMode = loopModeRef.current;
      const total = hasUploadedTracksRef.current;
      const idx = currentQueueIndexRef.current;
      if (lMode === "one") {
        audio.currentTime = 0;
        void audio.play();
      } else if (lMode === "all" && total > 0) {
        playNextByRef();
      } else if (idx < total - 1) {
        playNextByRef();
      } else {
        setIsLocalPlaying(false);
        setCurrentQueueIndex(-1);
        setUploadedTrackCurrentTime(0);
        setUploadedTrackDuration(0);
        audio.src = "";
      }
    };

    const handleError = () => {
      const activeTrack = uploadedTracksRef.current[currentQueueIndexRef.current];
      const mediaError = audio.error;
      const code = mediaError?.code;
      const message = code === MediaError.MEDIA_ERR_NETWORK
        ? "The audio stream could not be reached. Please try again."
        : code === MediaError.MEDIA_ERR_DECODE || code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
          ? "This audio format is not supported by this browser."
          : "The audio file could not be played. Please try again.";
      console.error("music_playback_failed", {
        trackId: activeTrack?.id,
        mediaErrorCode: code,
        networkState: audio.networkState,
        readyState: audio.readyState
      });
      setUploadError(message);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.src = "";
    };
  }, []);

  const isDraggingRef = useRef(false);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

  // Helper to play by index using refs
  const playByRef = useCallback((index: number) => {
    const audio = audioRef.current;
    const tracks = uploadedTracks;
    if (!audio || index < 0 || index >= tracks.length) return;
    const track = tracks[index];
    if (!track?.playback_url) return;
    setCurrentQueueIndex(index);
    setIsMinimized(false);
    setUploadedTrackCurrentTime(0);
    setUploadedTrackDuration(track.duration || 0);
    audio.src = track.playback_url;
    audio.load();
    void audio.play().catch((error) => {
      console.error("music_playback_start_failed", { trackId: track.id, message: error instanceof Error ? error.message : "Unknown playback error" });
      setUploadError("The audio file could not be played. Please try again.");
    });
  }, [uploadedTracks]);

  const playNextByRef = useCallback(() => {
    const audio = audioRef.current;
    const total = hasUploadedTracksRef.current;
    const idx = currentQueueIndexRef.current;
    const lMode = loopModeRef.current;
    if (total === 0 || !audio) return;
    let nextIndex: number;
    if (lMode === "all") {
      nextIndex = (idx + 1) % total;
    } else {
      nextIndex = Math.min(idx + 1, total - 1);
    }
    setCurrentQueueIndex(nextIndex);
    const nextTrack = uploadedTracks[nextIndex];
    if (!nextTrack?.playback_url) return;
    setUploadedTrackCurrentTime(0);
    setUploadedTrackDuration(nextTrack.duration || 0);
    audio.src = nextTrack.playback_url;
    audio.load();
    void audio.play().catch((error) => {
      console.error("music_playback_start_failed", { trackId: nextTrack.id, message: error instanceof Error ? error.message : "Unknown playback error" });
      setUploadError("The audio file could not be played. Please try again.");
    });
  }, [uploadedTracks]);

  const playPrev = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || uploadedTracks.length === 0) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const prevIndex = Math.max(0, currentQueueIndex - 1);
    playByRef(prevIndex);
  }, [currentQueueIndex, uploadedTracks.length, playByRef]);

  const playNext = useCallback(() => {
    playNextByRef();
  }, [playNextByRef]);

  // Upload handler
  const handleUploadAudio = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setIsUploadingAudio(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      let acceptedFileCount = 0;
      for (const file of fileArray) {
        if (file.size > 50 * 1024 * 1024) {
          setUploadError(`${file.name} exceeds 50MB limit.`);
          continue;
        }
        formData.append("files", file);
        acceptedFileCount += 1;
      }

      if (!acceptedFileCount) return;

      const response = await fetch("/api/music/upload", {
        method: "POST",
        body: formData
      });
      const data = await response.json().catch(() => ({})) as {
        error?: string;
        errors?: string[];
        tracks?: UploadedTrack[];
      };

      if (!response.ok) {
        throw new Error(data.error || "Upload failed.");
      }

      const persistedTracks = Array.isArray(data.tracks) ? data.tracks.filter((track) => track.id && track.playback_url) : [];
      if (persistedTracks.length) {
        setUploadedTracks((previous) => [...previous, ...persistedTracks]);
      }
      if (data.errors?.length) {
        setUploadError(data.errors[0]);
      }
    } catch (err) {
      console.error("music_upload_request_failed", { message: err instanceof Error ? err.message : "Unknown upload request error" });
      setUploadError((err as Error).message || "Upload failed.");
    } finally {
      setIsUploadingAudio(false);
    }
  }, []);

  // Auto-play first track when queue becomes non-empty
  useEffect(() => {
    if (uploadedTracks.length > 0 && currentQueueIndex < 0 && audioRef.current) {
      playByRef(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedTracks.length]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        void handleUploadAudio(selectedFiles);
      }
      e.target.value = "";
    },
    [handleUploadAudio]
  );

  const handleToggleUploadedPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || currentQueueIndex < 0) return;
    if (!audio.src) {
      playByRef(currentQueueIndex);
      return;
    }
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }, [currentQueueIndex, playByRef]);

  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
  }, []);

  const skipBackward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  }, []);

  // Drag seek handlers
  const handleProgressBarMouseDown = useCallback((e: React.MouseEvent) => {
    if (!progressBarRef.current || !audioRef.current?.duration) return;
    setIsDragging(true);
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = x / rect.width;
    const seekTime = pct * audioRef.current.duration;
    dragSeekValueRef.current = seekTime;
    setUploadedTrackCurrentTime(seekTime);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!progressBarRef.current || !audioRef.current?.duration) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const pct = x / rect.width;
      const seekTime = pct * audioRef.current.duration;
      dragSeekValueRef.current = seekTime;
      setUploadedTrackCurrentTime(seekTime);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      if (audioRef.current && dragSeekValueRef.current >= 0) {
        audioRef.current.currentTime = dragSeekValueRef.current;
      }
      dragSeekValueRef.current = 0;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Queue management
  const removeTrackFromQueue = useCallback((index: number) => {
    setUploadedTracks((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (index < currentQueueIndex) {
        setCurrentQueueIndex((prevIdx) => prevIdx - 1);
      } else if (index === currentQueueIndex) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }
        setCurrentQueueIndex(-1);
        setUploadedTrackCurrentTime(0);
        setUploadedTrackDuration(0);
        if (updated.length > 0 && index < updated.length) {
          setTimeout(() => playByRef(index), 50);
        } else if (updated.length > 0) {
          setTimeout(() => playByRef(updated.length - 1), 50);
        }
      }
      return updated;
    });
  }, [currentQueueIndex, playByRef]);

  const moveTrackUp = useCallback((index: number) => {
    if (index === 0) return;
    setUploadedTracks((prev) => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      if (currentQueueIndex === index) {
        setCurrentQueueIndex(index - 1);
      } else if (currentQueueIndex === index - 1) {
        setCurrentQueueIndex(index);
      }
      return updated;
    });
  }, [currentQueueIndex]);

  const moveTrackDown = useCallback((index: number) => {
    setUploadedTracks((prev) => {
      if (index >= prev.length - 1) return prev;
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      if (currentQueueIndex === index) {
        setCurrentQueueIndex(index + 1);
      } else if (currentQueueIndex === index + 1) {
        setCurrentQueueIndex(index);
      }
      return updated;
    });
  }, [currentQueueIndex]);

  const cycleLoopMode = useCallback(() => {
    setLoopMode((prev) => prev === "none" ? "all" : prev === "all" ? "one" : "none");
  }, []);

  // Playlist management
  const loadSavedPlaylists = useCallback(async () => {
    setPlaylistsLoading(true);
    try {
      const response = await fetch("/api/music/playlists");
      if (response.ok) {
        const data = await response.json();
        if (data.playlists) {
          setSavedPlaylists(data.playlists);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setPlaylistsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (panelView === "playlists") {
      void loadSavedPlaylists();
    }
  }, [panelView, loadSavedPlaylists]);

  const handleSavePlaylist = useCallback(async () => {
    if (!playlistName.trim() || uploadedTracks.length === 0) return;
    const serverTrackIds = uploadedTracks
      .filter((t) => !t.id.startsWith("local-"))
      .map((t) => t.id);
    try {
      const response = await fetch("/api/music/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playlistName.trim(), trackIds: serverTrackIds })
      });
      if (response.ok) {
        setShowSavePlaylist(false);
        setPlaylistName("");
        void loadSavedPlaylists();
      }
    } catch { /* Handle error */ }
  }, [playlistName, uploadedTracks, loadSavedPlaylists]);

  const handleLoadPlaylist = useCallback((playlist: typeof savedPlaylists[0]) => {
    if (playlist.tracks && playlist.tracks.length > 0) {
      setUploadedTracks(playlist.tracks);
      setViewPlaylistId(null);
      setPanelView("now-playing");
      setCurrentQueueIndex(-1);
      setTimeout(() => playByRef(0), 50);
    }
  }, [playByRef]);

  const handleDeletePlaylist = useCallback(async (playlistId: string) => {
    try {
      const response = await fetch(`/api/music/playlists?id=${playlistId}`, { method: "DELETE" });
      if (response.ok) {
        void loadSavedPlaylists();
      }
    } catch { /* Handle error */ }
  }, [loadSavedPlaylists]);

  // Derived state
  const hasUploadedTracks = uploadedTracks.length > 0;
  const currentTrack = hasUploadedTracks && currentQueueIndex >= 0
    ? uploadedTracks[currentQueueIndex] : null;

  const spotifyState = spotifyContext?.state;
  const hasSpotify = spotifyState?.connected && (spotifyState?.track || spotifyState?.playing);

  const isUploadActive = hasUploadedTracks && currentQueueIndex >= 0;
  const activeSource = isUploadActive
    ? "User audio"
    : hasSpotify
      ? spotifyState?.playbackSource || "Spotify"
      : systemAudio?.source || "No music";

  const isPlaying = isUploadActive
    ? isLocalPlaying
    : hasSpotify
      ? spotifyState?.playing
      : !!systemAudio?.isPlaying;

  const currentTrackTitle = isUploadActive && currentTrack
    ? currentTrack.name
    : hasSpotify
      ? spotifyState?.track?.name || "Music Player"
      : systemAudio?.title ?? "Music Player";

  const currentTrackArtist = isUploadActive && currentTrack
    ? currentTrack.artist
    : hasSpotify
      ? spotifyState?.track?.artist || "Unknown Artist"
      : systemAudio?.artist ?? "";

  useEffect(() => {
    setPlayback({
      isPlaying: Boolean(isPlaying),
      currentTrack: isPlaying
        ? {
            id: isUploadActive && currentTrack ? currentTrack.id : spotifyState?.track?.id || "external-audio",
            title: currentTrackTitle,
            artist: currentTrackArtist,
            source: activeSource
          }
        : null
    });
  }, [activeSource, currentTrack, currentTrackArtist, currentTrackTitle, isPlaying, isUploadActive, setPlayback, spotifyState?.track?.id]);

  const {
    searchResults,
    searchLoading,
    playlists: spotifyPlaylists,
    playlistsLoading: spotifyPlaylistsLoading,
    playlistTracks,
    playlistTracksLoading,
    actionLoading,
    searchTracks,
    loadPlaylists: loadSpotifyPlaylists,
    openPlaylist,
    closePlaylist,
    playTrack,
    playPlaylist,
    togglePlay: spotifyTogglePlay,
    nextTrack: spotifyNextTrack,
    previousTrack: spotifyPreviousTrack
  } = spotifyContext;

  useEffect(() => {
    if (panelView !== "search" || !localSearch.trim() || !hasSpotify) return;
    const timeoutId = window.setTimeout(() => {
      void searchTracks(localSearch);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [localSearch, panelView, searchTracks, hasSpotify]);

  useEffect(() => {
    if (panelView === "playlists" && hasSpotify && spotifyState?.ready) {
      void loadSpotifyPlaylists();
    }
  }, [panelView, loadSpotifyPlaylists, hasSpotify, spotifyState?.ready]);

  const activePlaylist = spotifyState?.activePlaylist;
  const handleStopPlayback = useCallback(() => {
    if (isUploadActive) {
      const audio = audioRef.current;
      audio?.pause();
      if (audio) audio.src = "";
      setIsLocalPlaying(false);
      setCurrentQueueIndex(-1);
      setUploadedTrackCurrentTime(0);
      setUploadedTrackDuration(0);
      return;
    }

    if (hasSpotify && spotifyState?.playing) {
      void spotifyTogglePlay();
      return;
    }

    // External media cannot be stopped by this page, but it should not keep
    // ScholarMind's player visible once the user dismisses it.
    setSystemAudio(null);
    setExternalAudioActive(false);
  }, [hasSpotify, isUploadActive, spotifyState?.playing, spotifyTogglePlay]);
const progressPct = uploadedTrackDuration > 0
    ? (uploadedTrackCurrentTime / uploadedTrackDuration) * 100 : 0;

  // ── Beat-reactive animation: dual-path signal computation ──────────────
  // Path 1: Local/uploaded tracks → Web Audio AnalyserNode
  const { intensityRef: beatIntensityRef } = useBeatAnalyserNode(
    audioRef,
    beatReactiveEnabled && isUploadActive
  );

  // Path 2: Spotify tracks → audio-analysis API + beat clock
  const spotifyTrackId = hasSpotify && spotifyState?.track?.id
    ? spotifyState.track.id
    : null;
  const spotifyBeatSignal = useSpotifyBeatClock(
    spotifyTrackId,
    spotifyState?.progressMs ?? 0,
    spotifyState?.progressTimestamp ?? Date.now(),
    Boolean(spotifyState?.playing),
    beatReactiveEnabled && hasSpotify && !isUploadActive
  );

  // Local rAF loop: read the analyser ref (never triggers re-render by itself)
  // and bridge it into a stateful BeatSignal for the component.
  const [uploadBeatSignal, setUploadBeatSignal] = useState<BeatSignal>({
    intensity: 0,
    hue: 180,
    onBeat: false
  });
  const uploadBeatRafRef = useRef<number>(0);
  const previousIntensityRef = useRef(0);
  const beatFlashEndRef = useRef(0);
  const lastPublishedUploadSignalRef = useRef<BeatSignal>({
    intensity: 0,
    hue: 180,
    onBeat: false
  });

  useEffect(() => {
    if (uploadBeatRafRef.current) {
      cancelAnimationFrame(uploadBeatRafRef.current);
      uploadBeatRafRef.current = 0;
    }

    if (!beatReactiveEnabled || !isUploadActive || !isPlaying) {
      lastPublishedUploadSignalRef.current = {
        intensity: 0,
        hue: 180,
        onBeat: false
      };
      setUploadBeatSignal((prev) =>
        prev.intensity === 0 && !prev.onBeat
          ? prev
          : { intensity: 0, hue: prev.hue, onBeat: false }
      );
      return;
    }

    const currentTrackName = currentTrack?.name ?? "uploaded";
    const trackHash = stringToHue(currentTrackName + (currentTrack?.id ?? ""));

    const tick = () => {
      const raw = beatIntensityRef.current;

      if (raw > 0.005) {
        // Detect beat onset: sudden jump in bass energy
        if (raw > previousIntensityRef.current * 1.6 && raw > 0.08) {
          beatFlashEndRef.current = performance.now() + 120;
        }
      }

      const now = performance.now();
      const onBeat = now < beatFlashEndRef.current;
      const intensity = Math.min(1, raw * 1.2);
      previousIntensityRef.current = raw;

      const nextSignal = { intensity, hue: trackHash, onBeat };
      const previousSignal = lastPublishedUploadSignalRef.current;

      // The analyser keeps sampling at display refresh rate, but React only
      // needs updates when the visible output actually changes. This avoids
      // rerendering the entire player 60 times per second.
      if (
        Math.abs(nextSignal.intensity - previousSignal.intensity) >= 0.02 ||
        nextSignal.onBeat !== previousSignal.onBeat ||
        nextSignal.hue !== previousSignal.hue
      ) {
        lastPublishedUploadSignalRef.current = nextSignal;
        setUploadBeatSignal(nextSignal);
      }
      uploadBeatRafRef.current = requestAnimationFrame(tick);
    };

    uploadBeatRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (uploadBeatRafRef.current) {
        cancelAnimationFrame(uploadBeatRafRef.current);
        uploadBeatRafRef.current = 0;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatReactiveEnabled, isUploadActive, isPlaying, currentTrack?.id, currentTrack?.name]);

  // Compose the final signal: upload (path 1) takes priority over Spotify (path 2)
  const beatSignal: BeatSignal | null = beatReactiveEnabled
    ? isUploadActive
      ? uploadBeatSignal
      : hasSpotify
        ? spotifyBeatSignal
        : null
    : null;

  // ── Visibility rule: render nothing when idle and no media is active ──
  const shouldShowPlayer = Boolean(isPlaying);

  if (!shouldShowPlayer) return null;

  return (
    <>
      <BeatReactiveBorder signal={beatSignal} enabled={beatReactiveEnabled} />
      <AnimatePresence mode="wait">
      {isMinimized ? (
        <motion.div
          key="minimized"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 400, damping: 25 }}
          className="fixed bottom-3 right-3 z-40 sm:bottom-6 sm:right-6"
          onClick={() => setIsMinimized(false)}
        >
          <motion.div
            className="flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-white/20 bg-gradient-to-r from-[rgba(255,209,102,0.2)] to-[rgba(57,208,255,0.2)] px-3 py-2 backdrop-blur-md transition-colors hover:border-white/40 sm:gap-3 sm:px-4"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ rotate: isPlaying ? 360 : 0 }}
              transition={{ duration: 2, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
            >
              {isUploadActive ? (
                <Music className="h-4 w-4 text-[var(--accent-mint)]" />
              ) : externalAudioActive && !hasSpotify ? (
                <Radio className="h-4 w-4 text-[var(--accent-coral)]" />
              ) : (
                <Music className="h-4 w-4 text-[var(--accent-sky)]" />
              )}
            </motion.div>
            <span className="max-w-[90px] truncate text-xs font-semibold text-white/80 sm:max-w-[120px]">
              {currentTrackTitle}
            </span>
            {hasUploadedTracks && (
              <span className="text-[10px] text-white/40 whitespace-nowrap">
                {currentQueueIndex + 1}/{uploadedTracks.length}
              </span>
            )}
            {systemAudio && !hasSpotify && !isUploadActive ? (
              <span className="text-[10px] text-white/40 whitespace-nowrap">• {systemAudio.source}</span>
            ) : null}
            <motion.div
              className="h-2 w-2 rounded-full"
              animate={{
                backgroundColor: isPlaying
                  ? ["rgba(121,247,199,1)", "rgba(121,247,199,0.3)", "rgba(121,247,199,1)"]
                  : "rgba(255,255,255,0.3)"
              }}
              transition={{ duration: 1.5, repeat: isPlaying ? Infinity : 0, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="expanded"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-3 right-3 z-40 max-h-[70svh] w-[calc(100vw-1.5rem)] overflow-y-auto rounded-[24px] border border-white/20 bg-gradient-to-br from-[rgba(255,255,255,0.1)] to-[rgba(255,255,255,0.05)] p-3 shadow-2xl backdrop-blur-xl sm:bottom-6 sm:right-6 sm:max-h-[80vh] sm:w-[min(32rem,calc(100vw-1.5rem))] sm:p-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isUploadActive ? (
                <Music className="h-4 w-4 text-[var(--accent-mint)]" />
              ) : externalAudioActive && !hasSpotify ? (
                <Radio className="h-4 w-4 text-[var(--accent-coral)]" />
              ) : (
                <Music className="h-4 w-4 text-[var(--accent-sky)]" />
              )}
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                {activeSource}
              </span>
              {hasUploadedTracks && (
                <span className="text-[10px] text-white/40">
                  {currentQueueIndex + 1}/{uploadedTracks.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setPanelView("now-playing"); setShowPanel(true); }}
                className={`p-1.5 rounded-full transition-colors ${panelView === "now-playing" ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10"}`}
                title="Now Playing"
              >
                <Music className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { setPanelView("queue"); setShowPanel(true); }}
                className={`p-1.5 rounded-full transition-colors ${panelView === "queue" ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10"}`}
                title="Play Queue"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { setPanelView("playlists"); setShowPanel(true); }}
                className={`p-1.5 rounded-full transition-colors ${panelView === "playlists" || panelView === "playlist-tracks" ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10"}`}
                title="Playlists"
              >
                <FolderOpen className="h-3.5 w-3.5" />
              </button>
              {hasSpotify && spotifyState?.ready ? (
                <button
                  onClick={() => { setPanelView("search"); setShowPanel(true); }}
                  className={`p-1.5 rounded-full transition-colors ${panelView === "search" ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10"}`}
                  title="Search Spotify"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              ) : null}
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
              {/* Beat-reactive border toggle */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setBeatReactiveEnabled((current) => {
                    const next = !current;
                    if (process.env.NODE_ENV !== "production") {
                      console.debug("beat_reactive_toggled", {
                        enabled: next,
                        source: isUploadActive ? "upload" : hasSpotify ? "spotify" : "external"
                      });
                    }
                    return next;
                  });
                }}
                aria-pressed={beatReactiveEnabled}
                className={`p-1.5 rounded-full transition-colors ${
                  beatReactiveEnabled
                    ? "bg-[var(--accent-mint)]/20 text-[var(--accent-mint)]"
                    : "text-white/60 hover:bg-white/10"
                }`}
                title={beatReactiveEnabled ? "Disable beat-reactive border" : "Enable beat-reactive border"}
              >
                <Zap className="h-3.5 w-3.5" />
              </motion.button>
              <button
                onClick={() => setIsMinimized(true)}
                title="Collapse music player"
                className="p-1.5 bg-white/10 hover:bg-white/16 rounded-full transition-colors"
              >
                <ChevronDown className="h-4 w-4 text-white/80" />
              </button>
              <button
                onClick={handleStopPlayback}
                title="Stop and hide music player"
                className="p-1.5 bg-white/10 hover:bg-white/16 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-white/80" />
              </button>
            </div>
          </div>

          {/* Premium Required Warning */}
          {spotifyState?.premiumRequired ? (
            <div className="mb-3 rounded-[16px] bg-[var(--accent-coral)]/10 border border-[var(--accent-coral)]/20 p-3 text-center">
              <p className="text-xs font-semibold text-[var(--accent-coral)] flex items-center justify-center gap-1.5">
                <Music className="h-3 w-3" />
                Spotify Premium Required
              </p>
              <p className="text-[10px] text-[var(--accent-coral)]/80 mt-1">
                Free accounts cannot control playback via the web player.
              </p>
            </div>
          ) : null}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* NOW PLAYING PANEL */}
          {panelView === "now-playing" && (
            <>
              {/* Track Info */}
              {currentTrack || (hasSpotify && spotifyState?.track) || systemAudio ? (
                <div className="mb-3">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <p className="font-semibold text-white line-clamp-2">{currentTrackTitle}</p>
                    <p className="text-xs text-white/60 mt-1">{currentTrackArtist}</p>
                    {systemAudio && !hasSpotify && !isUploadActive ? (
                      <p className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Playing from: {systemAudio.source}
                      </p>
                    ) : null}
                    {isUploadActive && currentTrack && (
                      <p className="text-[10px] text-white/40 mt-1">
                        Track {currentQueueIndex + 1} of {uploadedTracks.length} in queue
                      </p>
                    )}
                  </motion.div>
                </div>
              ) : (
                <div className="mb-3 text-center py-2">
                  <p className="text-sm text-white/60">No music playing</p>
                  <div className="mt-2 flex flex-col gap-2 items-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAudio}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/16 disabled:opacity-50"
                    >
                      <Upload className="h-3 w-3" />
                      {isUploadingAudio ? "Uploading..." : "Upload songs"}
                    </button>
                    {!spotifyState?.connected ? (
                      <a
                        href={`/api/music/spotify/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
                        className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/16"
                      >
                        <Music className="h-3 w-3" />
                        Connect Spotify
                      </a>
                    ) : null}
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="mb-3 rounded-[12px] bg-[var(--accent-coral)]/10 border border-[var(--accent-coral)]/20 p-2.5 text-center">
                  <p className="text-[11px] text-[var(--accent-coral)]">{uploadError}</p>
                </div>
              )}

              {/* Draggable Progress Bar */}
              {isUploadActive && uploadedTrackDuration > 0 && (
                <div className="mb-2">
                  <div
                    ref={progressBarRef}
                    className="h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group relative"
                    onMouseDown={handleProgressBarMouseDown}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-[var(--accent-sky)] to-[var(--accent-mint)] relative"
                      style={{ width: `${progressPct}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                    </div>
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-white/40">
                    <span>{formatTrackDuration(uploadedTrackCurrentTime * 1000)}</span>
                    <span>{formatTrackDuration(uploadedTrackDuration * 1000)}</span>
                  </div>
                </div>
              )}

              {/* Playback Controls */}
              {isUploadActive || (hasSpotify && !spotifyState?.premiumRequired) ? (
                <div className="flex items-center justify-center gap-2 mb-3">
                  {isUploadActive ? (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={skipBackward}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      title="Backward 10s"
                    >
                      <Rewind className="h-3.5 w-3.5 text-white/70" />
                    </motion.button>
                  ) : <div className="w-8 h-8" />}

                  {isUploadActive ? (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={playPrev}
                      disabled={currentQueueIndex <= 0}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
                      title="Previous track"
                    >
                      <SkipBack className="h-4 w-4 text-white/80" />
                    </motion.button>
                  ) : hasSpotify ? (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => spotifyPreviousTrack()}
                      disabled={actionLoading}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                    >
                      <SkipBack className="h-4 w-4 text-white/80" />
                    </motion.button>
                  ) : null}

                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (isUploadActive) {
                        handleToggleUploadedPlayback();
                      } else if (hasSpotify) {
                        spotifyTogglePlay();
                      }
                    }}
                    disabled={hasSpotify ? actionLoading : false}
                    className="p-3 bg-gradient-to-r from-[var(--accent-sky)] to-[var(--accent-mint)] rounded-full"
                  >
                    {(hasSpotify && actionLoading) || isUploadingAudio ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    ) : isPlaying ? (
                      <Pause className="h-5 w-5 text-black" />
                    ) : (
                      <Play className="h-5 w-5 text-black ml-0.5" />
                    )}
                  </motion.button>

                  {isUploadActive ? (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={playNext}
                      disabled={currentQueueIndex >= uploadedTracks.length - 1 && loopMode !== "all"}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
                      title="Next track"
                    >
                      <SkipForward className="h-4 w-4 text-white/80" />
                    </motion.button>
                  ) : hasSpotify ? (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => spotifyNextTrack()}
                      disabled={actionLoading}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                    >
                      <SkipForward className="h-4 w-4 text-white/80" />
                    </motion.button>
                  ) : null}

                  {isUploadActive ? (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={skipForward}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      title="Forward 10s"
                    >
                      <Forward className="h-3.5 w-3.5 text-white/70" />
                    </motion.button>
                  ) : <div className="w-8 h-8" />}
                </div>
              ) : null}

              {/* Extra Controls Row */}
              {isUploadActive && (
                <div className="flex items-center justify-between mb-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={cycleLoopMode}
                    className={`p-1.5 rounded-full transition-colors ${
                      loopMode !== "none" ? "bg-[var(--accent-sky)]/20 text-[var(--accent-sky)]" : "text-white/60 hover:bg-white/10"
                    }`}
                    title={loopMode === "none" ? "No repeat" : loopMode === "all" ? "Repeat all" : "Repeat one"}
                  >
                    {loopMode === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                  </motion.button>
                  <button
                    onClick={() => setShowSavePlaylist(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold transition hover:bg-white/16"
                    title="Save queue as playlist"
                  >
                    <Save className="h-3 w-3" />
                    Save playlist
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAudio}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold transition hover:bg-white/16 disabled:opacity-50"
                    title="Add more songs"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>
              )}

              {/* Save Playlist Dialog */}
              {showSavePlaylist && (
                <div className="mb-3 rounded-[16px] bg-white/10 p-3">
                  <p className="text-xs font-semibold mb-2">Save current queue as playlist</p>
                  <div className="flex gap-2">
                    <input
                      value={playlistName}
                      onChange={(e) => setPlaylistName(e.target.value)}
                      placeholder="Playlist name..."
                      className="flex-1 bg-white/10 rounded-full px-3 py-1.5 text-xs outline-none border border-white/10"
                      onKeyDown={(e) => e.key === "Enter" && handleSavePlaylist()}
                    />
                    <button
                      onClick={handleSavePlaylist}
                      disabled={!playlistName.trim() || uploadedTracks.length === 0}
                      className="rounded-full bg-[var(--accent-sky)] px-3 py-1.5 text-xs font-semibold text-black transition hover:opacity-80 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowSavePlaylist(false)}
                      className="rounded-full bg-white/10 px-2 py-1.5 text-xs transition hover:bg-white/16"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* System audio / Cross-tab indicator */}
              {systemAudio && !hasSpotify && !isUploadActive && (
                <div className="flex items-center gap-2 text-xs text-white/60 mb-3 justify-center">
                  <span className={`inline-block h-2 w-2 rounded-full ${systemAudio.isPlaying ? 'bg-[var(--accent-mint)] animate-pulse' : 'bg-white/30'}`} />
                  <span>{systemAudio.isPlaying ? "Playing" : "Paused"}</span>
                  {externalAudioActive && (
                    <>
                      <span className="text-white/30">•</span>
                      <span className="text-[var(--accent-coral)]">External tab</span>
                    </>
                  )}
                  {!externalAudioActive && (
                    <>
                      <span className="text-white/30">•</span>
                      <span>Browser audio</span>
                    </>
                  )}
                </div>
              )}

              {hasSpotify && (
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>85% Volume</span>
                </div>
              )}

              {!spotifyState?.connected && !isUploadActive && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <a
                    href={`/api/music/spotify/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
                    className="flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold transition hover:bg-white/16"
                  >
                    <Music className="h-3.5 w-3.5" />
                    Connect Spotify to search tracks, playlists, and control playback
                  </a>
                </div>
              )}

              {spotifyState?.connected && !hasSpotify && !isUploadActive && (
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
              )}
            </>
          )}

          {/* QUEUE PANEL */}
          {panelView === "queue" && (
            <div className="space-y-1 max-h-64 overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-white/80">
                  Play queue ({uploadedTracks.length} tracks)
                </p>
                {uploadedTracks.length > 0 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAudio}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] transition hover:bg-white/16 disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" />
                    Add songs
                  </button>
                )}
              </div>
              {uploadedTracks.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-white/40 mb-2">Queue is empty</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAudio}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/16 disabled:opacity-50"
                  >
                    <Upload className="h-3 w-3" />
                    {isUploadingAudio ? "Uploading..." : "Upload songs"}
                  </button>
                </div>
              ) : (
                uploadedTracks.map((track, index) => (
                  <div
                    key={`${track.id}-${index}`}
                    className={`flex items-center gap-2 rounded-[16px] p-2 transition-colors ${
                      index === currentQueueIndex
                        ? "bg-[var(--accent-sky)]/15 border border-[var(--accent-sky)]/30"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="w-5 text-center">
                      {index === currentQueueIndex && isPlaying ? (
                        <motion.div
                          className="h-1.5 w-1.5 rounded-full bg-[var(--accent-mint)] mx-auto"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        />
                      ) : (
                        <span className="text-[10px] text-white/40">{index + 1}</span>
                      )}
                    </div>
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => playByRef(index)}
                    >
                      <p className={`truncate text-xs font-semibold ${index === currentQueueIndex ? "text-[var(--accent-sky)]" : "text-white/80"}`}>
                        {track.name}
                      </p>
                      <p className="truncate text-[10px] text-white/40">{track.artist}</p>
                    </div>
                    {track.duration > 0 && (
                      <span className="text-[10px] text-white/30 w-12 text-right">
                        {formatTrackDuration(track.duration * 1000)}
                      </span>
                    )}
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => moveTrackUp(index)}
                        disabled={index === 0}
                        className="p-0.5 hover:bg-white/10 rounded disabled:opacity-20"
                        title="Move up"
                      >
                        <ChevronUp className="h-3 w-3 text-white/60" />
                      </button>
                      <button
                        onClick={() => moveTrackDown(index)}
                        disabled={index >= uploadedTracks.length - 1}
                        className="p-0.5 hover:bg-white/10 rounded disabled:opacity-20"
                        title="Move down"
                      >
                        <ChevronDown className="h-3 w-3 text-white/60" />
                      </button>
                      <button
                        onClick={() => removeTrackFromQueue(index)}
                        className="p-0.5 hover:bg-white/10 rounded text-[var(--accent-coral)]/70 hover:text-[var(--accent-coral)]"
                        title="Remove from queue"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* PLAYLISTS PANEL */}
          {panelView === "playlists" && (
            <div className="space-y-1 max-h-64 overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-white/80">My playlists</p>
                {hasUploadedTracks && (
                  <button
                    onClick={() => setShowSavePlaylist(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] transition hover:bg-white/16"
                  >
                    <Save className="h-3 w-3" />
                    Save current queue
                  </button>
                )}
              </div>
              {showSavePlaylist && (
                <div className="mb-2 rounded-[12px] bg-white/10 p-2">
                  <div className="flex gap-2">
                    <input
                      value={playlistName}
                      onChange={(e) => setPlaylistName(e.target.value)}
                      placeholder="Playlist name..."
                      className="flex-1 bg-white/10 rounded-full px-2.5 py-1 text-xs outline-none border border-white/10"
                      onKeyDown={(e) => e.key === "Enter" && handleSavePlaylist()}
                    />
                    <button
                      onClick={handleSavePlaylist}
                      disabled={!playlistName.trim() || uploadedTracks.length === 0}
                      className="rounded-full bg-[var(--accent-sky)] px-2.5 py-1 text-[10px] font-semibold text-black disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowSavePlaylist(false)}
                      className="rounded-full bg-white/10 px-2 py-1 text-[10px]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
              {playlistsLoading ? (
                <div className="flex items-center gap-2 rounded-[16px] bg-white/10 px-3 py-2 text-xs">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--accent-sky)] border-t-transparent" />
                  Loading playlists...
                </div>
              ) : savedPlaylists.length === 0 ? (
                <div className="text-center text-xs text-white/40 py-4">
                  <p>No playlists saved yet</p>
                  <p className="mt-1">Upload songs and save them as playlists</p>
                </div>
              ) : (
                savedPlaylists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className="flex items-center gap-2 rounded-[16px] bg-white/5 p-2 hover:bg-white/10 transition-colors"
                  >
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => {
                        setViewPlaylistId(playlist.id);
                        setViewPlaylistTracks(playlist.tracks || []);
                        setPanelView("playlist-tracks");
                      }}
                    >
                      <p className="truncate text-xs font-semibold text-white/80">{playlist.name}</p>
                      <p className="text-[10px] text-white/40">{(playlist.tracks || []).length} tracks</p>
                    </div>
                    <button
                      onClick={() => handleLoadPlaylist(playlist)}
                      className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] transition hover:bg-white/16"
                      title="Load playlist into queue"
                    >
                      <Play className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeletePlaylist(playlist.id)}
                      className="p-1 hover:bg-white/10 rounded text-[var(--accent-coral)]/60 hover:text-[var(--accent-coral)]"
                      title="Delete playlist"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
              {/* Spotify playlists section */}
              {hasSpotify && spotifyState?.ready && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs font-semibold text-white/60 mb-2">Spotify Playlists</p>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {spotifyPlaylistsLoading ? (
                      <div className="flex items-center gap-2 rounded-[16px] bg-white/10 px-3 py-2 text-xs">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--accent-sky)] border-t-transparent" />
                        Loading Spotify playlists...
                      </div>
                    ) : spotifyPlaylists.length ? (
                      spotifyPlaylists.slice(0, 6).map((playlist) => (
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
                      <div className="text-center text-xs text-white/40 py-3">No Spotify playlists found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PLAYLIST TRACKS PANEL */}
          {panelView === "playlist-tracks" && viewPlaylistId && (
            <div className="space-y-1 max-h-64 overflow-auto">
              <button
                type="button"
                onClick={() => { setViewPlaylistId(null); setPanelView("playlists"); }}
                className="flex items-center gap-1 text-xs font-semibold text-[var(--accent-sky)] mb-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to playlists
              </button>
              {viewPlaylistTracks.length === 0 ? (
                <div className="text-center text-xs text-white/40 py-4">No tracks in this playlist</div>
              ) : (
                viewPlaylistTracks.map((track, index) => (
                  <div
                    key={`${track.id}-${index}`}
                    className="flex items-center gap-2 rounded-[16px] bg-white/5 p-2 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => {
                      setUploadedTracks(viewPlaylistTracks);
                      setViewPlaylistId(null);
                      setPanelView("now-playing");
                      setCurrentQueueIndex(-1);
                      setTimeout(() => playByRef(index), 50);
                    }}
                  >
                    <span className="text-[10px] text-white/40 w-4">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white/80">{track.name}</p>
                      <p className="truncate text-[10px] text-white/40">{track.artist}</p>
                    </div>
                    {track.duration > 0 && (
                      <span className="text-[10px] text-white/30">
                        {formatTrackDuration(track.duration * 1000)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* SEARCH PANEL (Spotify) */}
          {panelView === "search" && hasSpotify && spotifyState?.ready && (
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
          )}

          {/* Spotify Playlist Tracks Panel */}
          {panelView === "playlist-tracks" && activePlaylist && hasSpotify && !viewPlaylistId && (
            <div className="space-y-1 max-h-48 overflow-auto">
              <button
                type="button"
                onClick={() => { closePlaylist(); setPanelView("playlists"); }}
                className="flex items-center gap-1 text-xs font-semibold text-[var(--accent-sky)] mb-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to playlists
              </button>
              <div className="space-y-1 max-h-40 overflow-auto">
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
          )}
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
