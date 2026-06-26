"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import type { SpotifyPlaylistItem, SpotifyTrackItem } from "@/lib/music/spotify-catalog";

export type { SpotifyPlaylistItem, SpotifyTrackItem };

type SpotifyPlaybackState = {
  connected: boolean;
  ready: boolean;
  playing: boolean;
  deviceId: string | null;
  track: SpotifyTrackItem | null;
  activePlaylist: SpotifyPlaylistItem | null;
  error: string;
  premiumRequired: boolean;
};

type SpotifyPlaybackContextValue = {
  state: SpotifyPlaybackState;
  searchResults: SpotifyTrackItem[];
  searchLoading: boolean;
  playlists: SpotifyPlaylistItem[];
  playlistsLoading: boolean;
  playlistTracks: SpotifyTrackItem[];
  playlistTracksLoading: boolean;
  actionLoading: boolean;
  searchTracks: (query: string) => Promise<void>;
  loadPlaylists: () => Promise<void>;
  openPlaylist: (playlist: SpotifyPlaylistItem) => Promise<void>;
  closePlaylist: () => void;
  playTrack: (track: SpotifyTrackItem, offsetPosition?: number) => Promise<void>;
  playPlaylist: (playlist: SpotifyPlaylistItem) => Promise<void>;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  clearError: () => void;
};

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (callback: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayerInstance;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

type SpotifyPlayerInstance = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, callback: (payload: unknown) => void) => void;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
};

type SpotifyPlayerState = {
  paused: boolean;
  track_window: {
    current_track: {
      id: string;
      name: string;
      uri: string;
      duration_ms: number;
      artists: Array<{ name: string }>;
      album: { name: string; images?: Array<{ url: string }> };
    };
  };
};

const SpotifyPlaybackContext = createContext<SpotifyPlaybackContextValue | null>(null);

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

function mapPlayerTrack(track: SpotifyPlayerState["track_window"]["current_track"]): SpotifyTrackItem {
  return {
    id: track.id,
    name: track.name,
    uri: track.uri,
    artist: track.artists.map((artist) => artist.name).join(", "),
    album: track.album.name,
    imageUrl: track.album.images?.[0]?.url ?? null,
    durationMs: track.duration_ms
  };
}

let sdkLoader: Promise<void> | null = null;

function loadSpotifySdk() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Spotify) return Promise.resolve();
  if (sdkLoader) return sdkLoader;

  sdkLoader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-spotifysdk="true"]');
    const finish = () => resolve();

    if (existing) {
      if (window.Spotify) {
        finish();
        return;
      }
      const previous = window.onSpotifyWebPlaybackSDKReady;
      window.onSpotifyWebPlaybackSDKReady = () => {
        previous?.();
        finish();
      };
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.dataset.spotifysdk = "true";
    script.onerror = () => reject(new Error("Unable to load Spotify playback SDK."));
    window.onSpotifyWebPlaybackSDKReady = finish;
    document.body.appendChild(script);
  });

  return sdkLoader;
}

function SpotifyPlaybackProviderInner({
  enabled,
  children
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const initializingRef = useRef(false);
  const [state, setState] = useState<SpotifyPlaybackState>({
    connected: enabled,
    ready: false,
    playing: false,
    deviceId: null,
    track: null,
    activePlaylist: null,
    error: "",
    premiumRequired: false
  });
  const [searchResults, setSearchResults] = useState<SpotifyTrackItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [playlists, setPlaylists] = useState<SpotifyPlaylistItem[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrackItem[]>([]);
  const [playlistTracksLoading, setPlaylistTracksLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const clearError = useCallback(() => {
    setState((current) => ({ ...current, error: "" }));
  }, []);

  const playbackRequest = useCallback(async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/music/spotify/playback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: deviceIdRef.current,
        ...payload
      })
    });
    const json = await readJson<{ error?: string }>(response);
    if (!response.ok) {
      throw new Error(json.error || "Spotify playback request failed.");
    }
  }, []);

  const initializePlayer = useCallback(async () => {
    if (!enabled || initializingRef.current) return;
    initializingRef.current = true;

    try {
      await loadSpotifySdk();
      if (!window.Spotify) {
        throw new Error("Spotify playback SDK did not initialize.");
      }

      if (playerRef.current) {
        await playerRef.current.connect();
        return;
      }

      const player = new window.Spotify.Player({
        name: "ScholarMind Studio Player",
        volume: 0.85,
        getOAuthToken: (callback) => {
          void fetch("/api/music/spotify/token")
            .then((response) => readJson<{ accessToken?: string; error?: string }>(response))
            .then((json) => {
              if (!json.accessToken) {
                throw new Error(json.error || "Missing Spotify access token.");
              }
              callback(json.accessToken);
            })
            .catch(() => callback(""));
        }
      });

      player.addListener("ready", (payload) => {
        const { device_id } = payload as { device_id: string };
        deviceIdRef.current = device_id;
        setState((current) => ({
          ...current,
          connected: true,
          ready: true,
          deviceId: device_id,
          error: "",
          premiumRequired: false
        }));
        void playbackRequest({ action: "transfer", deviceId: device_id });
      });

      player.addListener("not_ready", () => {
        setState((current) => ({ ...current, ready: false }));
      });

      player.addListener("player_state_changed", (playerState) => {
        const nextState = playerState as SpotifyPlayerState | null;
        if (!nextState) {
          setState((current) => ({ ...current, playing: false }));
          return;
        }

        setState((current) => ({
          ...current,
          playing: !nextState.paused,
          track: mapPlayerTrack(nextState.track_window.current_track),
          error: ""
        }));
      });

      player.addListener("initialization_error", (payload) => {
        const { message } = payload as { message: string };
        setState((current) => ({ ...current, error: message, ready: false }));
      });

      player.addListener("authentication_error", (payload) => {
        const { message } = payload as { message: string };
        setState((current) => ({ ...current, connected: false, error: message, ready: false }));
      });

      player.addListener("account_error", () => {
        setState((current) => ({
          ...current,
          premiumRequired: true,
          error: "Spotify Premium is required for in-browser playback."
        }));
      });

      playerRef.current = player;
      const ok = await player.connect();
      if (!ok) {
        setState((current) => ({ ...current, error: "Unable to connect the Spotify player." }));
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        error: (error as Error).message || "Unable to initialize Spotify playback."
      }));
    } finally {
      initializingRef.current = false;
    }
  }, [enabled, playbackRequest]);

  const ensureDeviceReady = useCallback(async () => {
    if (deviceIdRef.current) return deviceIdRef.current;
    await initializePlayer();

    for (let attempt = 0; attempt < 24; attempt += 1) {
      if (deviceIdRef.current) return deviceIdRef.current;
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }

    throw new Error("Spotify player is still connecting. Try again in a moment.");
  }, [initializePlayer]);

  useEffect(() => {
    setState((current) => ({ ...current, connected: enabled }));
    if (!enabled) {
      playerRef.current?.disconnect();
      playerRef.current = null;
      deviceIdRef.current = null;
      setPlaylists([]);
      setPlaylistTracks([]);
      setSearchResults([]);
      return;
    }

    void initializePlayer();
    return () => {
      playerRef.current?.disconnect();
      playerRef.current = null;
      deviceIdRef.current = null;
    };
  }, [enabled, initializePlayer]);

  useEffect(() => {
    if (!enabled) return;

    const syncNowPlaying = async () => {
      try {
        const response = await fetch("/api/music/spotify/now-playing");
        if (!response.ok) return;
        const json = await readJson<{ playing?: boolean; track?: SpotifyTrackItem | null }>(response);
        setState((current) => ({
          ...current,
          playing: Boolean(json.playing),
          track: json.track ?? current.track
        }));
      } catch {
        // Ignore polling failures.
      }
    };

    void syncNowPlaying();
    const intervalId = window.setInterval(() => {
      void syncNowPlaying();
    }, 12000);
    return () => window.clearInterval(intervalId);
  }, [enabled]);

  const searchTracks = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    clearError();
    try {
      const response = await fetch(`/api/music/spotify/search?q=${encodeURIComponent(trimmed)}`);
      const json = await readJson<{ tracks?: SpotifyTrackItem[]; error?: string }>(response);
      if (!response.ok) {
        throw new Error(json.error || "Spotify search failed.");
      }
      setSearchResults(Array.isArray(json.tracks) ? json.tracks : []);
    } catch (error) {
      setSearchResults([]);
      setState((current) => ({
        ...current,
        error: (error as Error).message || "Spotify search failed."
      }));
    } finally {
      setSearchLoading(false);
    }
  }, [clearError]);

  const loadPlaylists = useCallback(async () => {
    if (!enabled) return;
    setPlaylistsLoading(true);
    clearError();
    try {
      const response = await fetch("/api/music/spotify/playlists?limit=24");
      const json = await readJson<{ playlists?: SpotifyPlaylistItem[]; error?: string }>(response);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Reconnect Spotify to enable playlist browsing.");
        }
        throw new Error(json.error || "Unable to load Spotify playlists.");
      }
      setPlaylists(Array.isArray(json.playlists) ? json.playlists : []);
    } catch (error) {
      setPlaylists([]);
      setState((current) => ({
        ...current,
        error: (error as Error).message || "Unable to load Spotify playlists."
      }));
    } finally {
      setPlaylistsLoading(false);
    }
  }, [clearError, enabled]);

  const openPlaylist = useCallback(
    async (playlist: SpotifyPlaylistItem) => {
      setState((current) => ({ ...current, activePlaylist: playlist }));
      setPlaylistTracksLoading(true);
      clearError();
      try {
        const response = await fetch(
          `/api/music/spotify/playlists/tracks?playlistId=${encodeURIComponent(playlist.id)}&limit=40`
        );
        const json = await readJson<{ tracks?: SpotifyTrackItem[]; error?: string }>(response);
        if (!response.ok) {
          throw new Error(json.error || "Unable to load playlist tracks.");
        }
        setPlaylistTracks(Array.isArray(json.tracks) ? json.tracks : []);
      } catch (error) {
        setPlaylistTracks([]);
        setState((current) => ({
          ...current,
          error: (error as Error).message || "Unable to load playlist tracks."
        }));
      } finally {
        setPlaylistTracksLoading(false);
      }
    },
    [clearError]
  );

  const closePlaylist = useCallback(() => {
    setState((current) => ({ ...current, activePlaylist: null }));
    setPlaylistTracks([]);
  }, []);

  const playTrack = useCallback(
    async (track: SpotifyTrackItem, offsetPosition?: number) => {
      setActionLoading(true);
      clearError();
      try {
        await ensureDeviceReady();
        const playlistContext = state.activePlaylist;
        if (typeof offsetPosition === "number" && playlistContext) {
          await playbackRequest({
            action: "play",
            contextUri: playlistContext.uri,
            offsetPosition
          });
        } else {
          await playbackRequest({
            action: "play",
            uri: track.uri
          });
        }
        setState((current) => ({
          ...current,
          playing: true,
          track,
          error: ""
        }));
      } catch (error) {
        setState((current) => ({
          ...current,
          error: (error as Error).message || "Unable to play this track."
        }));
      } finally {
        setActionLoading(false);
      }
    },
    [clearError, ensureDeviceReady, playbackRequest, state.activePlaylist]
  );

  const playPlaylist = useCallback(
    async (playlist: SpotifyPlaylistItem) => {
      setActionLoading(true);
      clearError();
      try {
        await ensureDeviceReady();
        await playbackRequest({
          action: "play",
          contextUri: playlist.uri,
          offsetPosition: 0
        });
        setState((current) => ({
          ...current,
          playing: true,
          activePlaylist: playlist,
          track: current.track,
          error: ""
        }));
      } catch (error) {
        setState((current) => ({
          ...current,
          error: (error as Error).message || "Unable to play this playlist."
        }));
      } finally {
        setActionLoading(false);
      }
    },
    [clearError, ensureDeviceReady, playbackRequest]
  );

  const togglePlay = useCallback(async () => {
    setActionLoading(true);
    clearError();
    try {
      if (playerRef.current && state.ready) {
        await playerRef.current.togglePlay();
        return;
      }

      await ensureDeviceReady();
      await playbackRequest({ action: state.playing ? "pause" : "resume" });
      setState((current) => ({ ...current, playing: !current.playing }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: (error as Error).message || "Unable to update playback."
      }));
    } finally {
      setActionLoading(false);
    }
  }, [clearError, ensureDeviceReady, playbackRequest, state.playing, state.ready]);

  const nextTrack = useCallback(async () => {
    setActionLoading(true);
    clearError();
    try {
      if (playerRef.current && state.ready) {
        await playerRef.current.nextTrack();
        return;
      }
      await ensureDeviceReady();
      await playbackRequest({ action: "next" });
    } catch (error) {
      setState((current) => ({
        ...current,
        error: (error as Error).message || "Unable to skip to the next track."
      }));
    } finally {
      setActionLoading(false);
    }
  }, [clearError, ensureDeviceReady, playbackRequest, state.ready]);

  const previousTrack = useCallback(async () => {
    setActionLoading(true);
    clearError();
    try {
      if (playerRef.current && state.ready) {
        await playerRef.current.previousTrack();
        return;
      }
      await ensureDeviceReady();
      await playbackRequest({ action: "previous" });
    } catch (error) {
      setState((current) => ({
        ...current,
        error: (error as Error).message || "Unable to go to the previous track."
      }));
    } finally {
      setActionLoading(false);
    }
  }, [clearError, ensureDeviceReady, playbackRequest, state.ready]);

  const value = useMemo<SpotifyPlaybackContextValue>(
    () => ({
      state,
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
      previousTrack,
      clearError
    }),
    [
      actionLoading,
      closePlaylist,
      clearError,
      loadPlaylists,
      nextTrack,
      openPlaylist,
      playPlaylist,
      playTrack,
      playlistTracks,
      playlistTracksLoading,
      playlists,
      playlistsLoading,
      previousTrack,
      searchLoading,
      searchResults,
      searchTracks,
      state,
      togglePlay
    ]
  );

  return <SpotifyPlaybackContext.Provider value={value}>{children}</SpotifyPlaybackContext.Provider>;
}

export function SpotifyPlaybackProvider({
  connected,
  children
}: {
  connected: boolean;
  children: ReactNode;
}) {
  return <SpotifyPlaybackProviderInner enabled={connected}>{children}</SpotifyPlaybackProviderInner>;
}

export function useSpotifyPlaybackContext() {
  const context = useContext(SpotifyPlaybackContext);
  if (!context) {
    throw new Error("useSpotifyPlaybackContext must be used within SpotifyPlaybackProvider.");
  }
  return context;
}
