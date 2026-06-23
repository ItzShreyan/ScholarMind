"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp, Music, Pause, Play, Search, X } from "lucide-react";

const focusMusicStateStorageKey = "scholarmind_focus_music_state";

const tracks = [
  { title: "Rainy Revision", artist: "Focus queue", mood: "Lo-fi", color: "from-[#ff9a72] via-[#ffd166] to-[#67e8f9]" },
  { title: "Exam Sprint Beats", artist: "ScholarMind mix", mood: "Low beat", color: "from-[#79f7c7] via-[#67e8f9] to-[#ff9a72]" },
  { title: "Quiet Library", artist: "Ambient study", mood: "Ambient", color: "from-[#67e8f9] via-[#79f7c7] to-[#fff7d6]" },
  { title: "Deep Work Piano", artist: "Study instrumentals", mood: "Calm", color: "from-[#ffd166] via-[#ff9a72] to-[#67e8f9]" }
];

const providerStatus = [
  { name: "Spotify", status: "Connect available" },
  { name: "YouTube Music", status: "Needs a YouTube Data API key" },
  { name: "SoundCloud", status: "Account link unavailable" }
];

export function FocusMusicDock() {
  const loadedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedTrack = tracks[trackIndex] ?? tracks[0];

  useEffect(() => {
    const restore = (value?: unknown) => {
      try {
        const parsed =
          value && typeof value === "object"
            ? (value as { playing?: boolean; trackIndex?: number })
            : JSON.parse(localStorage.getItem(focusMusicStateStorageKey) || "{}");
        if (typeof parsed.playing === "boolean") setPlaying(parsed.playing);
        if (typeof parsed.trackIndex === "number") {
          setTrackIndex(Math.max(0, Math.min(tracks.length - 1, parsed.trackIndex)));
        }
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
    const state = { playing, trackIndex, updatedAt: Date.now() };
    try {
      localStorage.setItem(focusMusicStateStorageKey, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent("scholarmind:music-state", { detail: state }));
    } catch {
      // Ignore storage failures.
    }
  }, [playing, trackIndex]);

  const filteredTracks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tracks;
    return tracks.filter((track) =>
      [track.title, track.artist, track.mood].some((value) => value.toLowerCase().includes(query))
    );
  }, [search]);

  return (
    <div className="panel panel-border mt-4 overflow-hidden rounded-[28px]">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setPlaying((current) => !current)}
          className={`grid h-10 w-10 place-items-center rounded-full transition ${
            playing
              ? "bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-sky))] text-slate-950"
              : "bg-white/10 text-[var(--fg)]"
          }`}
          aria-label={playing ? "Pause focus music" : "Play focus music"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className={`h-9 w-9 rounded-[14px] bg-gradient-to-br ${selectedTrack.color}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{selectedTrack.title}</p>
          <p className="muted truncate text-xs">
            {selectedTrack.mood} focus queue persists between Dashboard and Studio
          </p>
        </div>
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
          <div className="rounded-[20px] border border-white/10 bg-black/10 px-3 py-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-[var(--accent-sky)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search focus tracks..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {filteredTracks.map((track, index) => {
              const realIndex = tracks.findIndex((item) => item.title === track.title);
              return (
                <button
                  key={track.title}
                  type="button"
                  onClick={() => {
                    setTrackIndex(realIndex >= 0 ? realIndex : index);
                    setPlaying(true);
                  }}
                  className="rounded-[20px] bg-white/10 p-3 text-left transition hover:bg-white/16"
                >
                  <p className="text-sm font-semibold">{track.title}</p>
                  <p className="muted mt-1 text-xs">{track.artist} • {track.mood}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {providerStatus.map((provider) => (
              <div key={provider.name} className="rounded-[18px] bg-white/8 px-3 py-3">
                <p className="inline-flex items-center gap-2 text-xs font-semibold">
                  <Music className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
                  {provider.name}
                </p>
                <p className="muted mt-1 text-[11px]">{provider.status}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
