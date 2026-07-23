"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronUp, LogOut, Music, Search, X } from "lucide-react";
import { SpotifyPlaybackPanel } from "@/components/dashboard/SpotifyPlaybackPanel";
import { SpotifyPlaybackProvider } from "@/components/dashboard/useSpotifyPlayback";

const focusMusicStateStorageKey = "scholarmind_focus_music_state";


export function FocusMusicDock() {
  const pathname = usePathname();
  const router = useRouter();
  const loadedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [rainbow, setRainbow] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const spotifyLoginHref = `/api/music/spotify/login?returnTo=${encodeURIComponent(pathname || "/dashboard")}`;

  const handleUnlink = useCallback(async () => {
    if (unlinking) return;
    setUnlinking(true);
    try {
      await fetch("/api/music/spotify/unlink", { method: "POST" });
      router.refresh();
      window.location.reload();
    } catch {
      setUnlinking(false);
    }
  }, [unlinking, router]);

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
        if (typeof parsed.rainbow === "boolean") setRainbow(parsed.rainbow);
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
    const state = { playing, rainbow, updatedAt: Date.now() };
    try {
      localStorage.setItem(focusMusicStateStorageKey, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent("scholarmind:music-state", { detail: state }));
    } catch {
      // Ignore storage failures.
    }
  }, [playing, rainbow]);

  const providerCards = useMemo(
    () => (
      <a key="Spotify" href={spotifyLoginHref} className="rounded-[18px] bg-white/8 px-3 py-3 transition hover:bg-white/14">
        <p className="inline-flex items-center gap-2 text-xs font-semibold">
          <Music className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
          Spotify
        </p>
        <p className="muted mt-1 text-[11px]">
          {spotifyConnected ? "Account linked" : "Connect available • Premium recommended"}
        </p>
      </a>
    ),
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
          <motion.button
            type="button"
            onClick={() => setOpen((current) => !current)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="rounded-full bg-white/10 p-2 transition hover:bg-white/16"
            aria-label="Open dashboard music dock"
          >
            {open ? <X className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </motion.button>
        </div>

        {open ? (
          <div className="border-t border-white/10 p-4">
            <div className="grid gap-2">{providerCards}</div>

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

            {spotifyConnected ? (
              <div className="mt-3 flex items-center justify-between rounded-[18px] bg-white/8 px-4 py-3">
                <span className="text-[11px] text-white/50">Spotify account linked</span>
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

            <div className="mt-4">
              <SpotifyPlaybackPanel
                connected={spotifyConnected}
                loginHref={spotifyLoginHref}
                searchQuery={search}
                onPlayingChange={setPlaying}
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12px] muted">Rainbow aura</span>
              <button
                type="button"
                onClick={() => setRainbow((c) => !c)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition ${
                  rainbow ? "bg-[rgba(121,247,199,0.12)] text-[var(--accent-mint)]" : "bg-white/8 text-[var(--muted)] hover:bg-white/12"
                }`}
                aria-pressed={rainbow}
              >
                {rainbow ? "On" : "Off"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </SpotifyPlaybackProvider>
  );
}
