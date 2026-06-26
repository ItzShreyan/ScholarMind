"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronUp, Music, Search, X } from "lucide-react";
import { SpotifyPlaybackPanel } from "@/components/dashboard/SpotifyPlaybackPanel";
import { SpotifyPlaybackProvider } from "@/components/dashboard/useSpotifyPlayback";

const focusMusicStateStorageKey = "scholarmind_focus_music_state";

const providerStatus = [
  { name: "Spotify", status: "Connect available • Premium recommended", key: "spotify", disabled: false },
  { name: "YouTube Music", status: "Unavailable in preview", key: "youtube", disabled: true },
  { name: "SoundCloud", status: "Account link unavailable", key: "soundcloud", disabled: true }
];

export function FocusMusicDock() {
  const pathname = usePathname();
  const loadedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const spotifyLoginHref = `/api/music/spotify/login?returnTo=${encodeURIComponent(pathname || "/dashboard")}`;

  useEffect(() => {
    void fetch("/api/music/spotify/status")
      .then((response) => response.json())
      .then((json) => setSpotifyConnected(Boolean(json.connected)))
      .catch(() => setSpotifyConnected(false));
  }, []);

  useEffect(() => {
    const restore = (value?: unknown) => {
      try {
        const parsed =
          value && typeof value === "object"
            ? (value as { playing?: boolean })
            : JSON.parse(localStorage.getItem(focusMusicStateStorageKey) || "{}");
        if (typeof parsed.playing === "boolean") setPlaying(parsed.playing);
      } catch {
        // The focus dock should never block the dashboard.
      }
    };

    restore();
    loadedRef.current = true;

    const onCustomState = (event: Event) => {
      restore((event as CustomEvent).detail);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === focusMusicStateStorageKey) restore();
    };

    window.addEventListener("scholarmind:music-state", onCustomState);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("scholarmind:music-state", onCustomState);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    const state = { playing, updatedAt: Date.now() };
    try {
      localStorage.setItem(focusMusicStateStorageKey, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent("scholarmind:music-state", { detail: state }));
    } catch {
      // Ignore storage failures.
    }
  }, [playing]);

  const providerCards = useMemo(
    () =>
      providerStatus.map((provider) => {
        const contents = (
          <>
            <p className="inline-flex items-center gap-2 text-xs font-semibold">
              <Music className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
              {provider.name}
            </p>
            <p className="muted mt-1 text-[11px]">
              {provider.key === "spotify" && spotifyConnected ? "Account linked" : provider.status}
            </p>
          </>
        );

        if (provider.key === "spotify" && !provider.disabled) {
          return (
            <a key={provider.name} href={spotifyLoginHref} className="rounded-[18px] bg-white/8 px-3 py-3 transition hover:bg-white/14">
              {contents}
            </a>
          );
        }

        return (
          <button key={provider.name} type="button" disabled className="cursor-not-allowed rounded-[18px] bg-white/6 px-3 py-3 text-left opacity-70">
            {contents}
          </button>
        );
      }),
    [spotifyConnected, spotifyLoginHref]
  );

  return (
    <SpotifyPlaybackProvider connected={spotifyConnected}>
      <div className="panel panel-border mt-4 overflow-hidden rounded-[28px]">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <SpotifyPlaybackPanel
            connected={spotifyConnected}
            loginHref={spotifyLoginHref}
            compact
            onPlayingChange={setPlaying}
          />
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="rounded-full bg-white/10 p-2 transition hover:bg-white/16"
            aria-label="Open dashboard music dock"
          >
            {open ? <X className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>

        {open ? (
          <div className="border-t border-white/10 p-4">
            <div className="grid gap-2 sm:grid-cols-3">{providerCards}</div>

            <div className="mt-4 rounded-[20px] border border-white/10 bg-black/10 px-3 py-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-[var(--accent-sky)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search Spotify tracks..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div className="mt-4">
              <SpotifyPlaybackPanel
                connected={spotifyConnected}
                loginHref={spotifyLoginHref}
                searchQuery={search}
                onPlayingChange={setPlaying}
              />
            </div>
          </div>
        ) : null}
      </div>
    </SpotifyPlaybackProvider>
  );
}
