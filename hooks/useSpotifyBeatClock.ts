"use client";

import { useEffect, useRef, useState } from "react";

// ─── Spotify audio-analysis types (subset of full API response) ────────────────

type SpotifyBeat = {
  /** Start time in seconds */
  start: number;
  /** Duration in seconds */
  duration: number;
  /** Confidence 0.0–1.0 */
  confidence: number;
};

type SpotifySection = {
  start: number;
  duration: number;
  loudness: number;
  tempo: number;
  key: number;
  mode: number;
};

type AudioAnalysis = {
  beats: SpotifyBeat[];
  sections: SpotifySection[];
};

// ─── Output signal shape (same as BeatReactiveBorder expects) ─────────────────

export type BeatSignal = {
  /** 0–1 intensity: amplitude of current beat flash, decays between beats */
  intensity: number;
  /** Hue (0–360) driven by track + section identity */
  hue: number;
  /** true during the 120 ms peak window right after a beat */
  onBeat: boolean;
};

// ─── Module-level cache: track id → analysis (never refetched) ────────────────
const analysisCache = new Map<string, AudioAnalysis>();
const BEAT_FLASH_MS = 120;
const FALLOFF_HALF_LIFE_MS = 350;

// ─── Binary search: last beat whose start ≤ elapsedSec ───────────────────────
function findBeatIndex(beats: SpotifyBeat[], elapsedSec: number): number {
  let lo = 0;
  let hi = beats.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((beats[mid]?.start ?? Infinity) <= elapsedSec) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

// ─── Simple hash of a string → 0–360 ─────────────────────────────────────────
export function stringToHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(h) % 360;
}

/**
 * useSpotifyBeatClock
 *
 * Drives a BeatSignal for Spotify tracks using pre-fetched audio-analysis data.
 * Does NOT attempt real-time audio capture (impossible due to DRM).
 *
 * @param trackId          The Spotify track ID currently playing (or null).
 * @param progressMs       Last-known playback position in ms (from now-playing poll).
 * @param progressTimestamp Date.now() when progressMs was recorded.
 * @param isPlaying        Whether Spotify is currently playing.
 * @param enabled          When false, returns a zero signal and skips fetching.
 */
export function useSpotifyBeatClock(
  trackId: string | null,
  progressMs: number,
  progressTimestamp: number,
  isPlaying: boolean,
  enabled: boolean
): BeatSignal {
  const [signal, setSignal] = useState<BeatSignal>({
    intensity: 0,
    hue: 180,
    onBeat: false
  });

  const analysisRef = useRef<AudioAnalysis | null>(null);
  const baseHueRef = useRef<number>(180);
  const rafRef = useRef<number>(0);
  const lastBeatIndexRef = useRef<number>(-1);
  const lastBeatFlashTimeRef = useRef<number>(0); // wall-clock ms when last beat fired
  const fetchingRef = useRef<Set<string>>(new Set());

  // ── Fetch + cache audio analysis when track changes ──────────────────────────
  useEffect(() => {
    if (!enabled || !trackId) {
      analysisRef.current = null;
      setSignal({ intensity: 0, hue: 180, onBeat: false });
      return;
    }

    baseHueRef.current = stringToHue(trackId);

    const cached = analysisCache.get(trackId);
    if (cached) {
      analysisRef.current = cached;
      lastBeatIndexRef.current = -1;
      return;
    }

    if (fetchingRef.current.has(trackId)) return;
    fetchingRef.current.add(trackId);

    fetch(`/api/music/spotify/audio-analysis/${encodeURIComponent(trackId)}`)
      .then(async (res) => {
        if (!res.ok) return;
        const json = (await res.json()) as {
          beats?: SpotifyBeat[];
          sections?: SpotifySection[];
        };
        const data: AudioAnalysis = {
          beats: Array.isArray(json.beats) ? json.beats : [],
          sections: Array.isArray(json.sections) ? json.sections : []
        };
        analysisCache.set(trackId, data);
        analysisRef.current = data;
        lastBeatIndexRef.current = -1;
      })
      .catch(() => {
        // Non-fatal: animation simply won't react to beats for this track
      })
      .finally(() => {
        fetchingRef.current.delete(trackId);
      });
  }, [trackId, enabled]);

  // ── rAF loop: compute beat signal from interpolated position ─────────────────
  useEffect(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    if (!enabled || !isPlaying) {
      setSignal((prev) =>
        prev.intensity === 0 && !prev.onBeat ? prev : { intensity: 0, hue: prev.hue, onBeat: false }
      );
      return;
    }

    const tick = () => {
      const analysis = analysisRef.current;
      const now = Date.now();

      if (!analysis || analysis.beats.length === 0) {
        // No analysis yet — gentle idle pulse at 100 BPM (600 ms period)
        const idlePulse = (Math.sin((now / 600) * Math.PI) + 1) / 2 * 0.25;
        setSignal({ intensity: idlePulse, hue: baseHueRef.current, onBeat: false });
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Interpolate playback position
      const elapsed = progressMs + (now - progressTimestamp);
      const elapsedSec = elapsed / 1000;

      // Find which beat we're on
      const beatIdx = findBeatIndex(analysis.beats, elapsedSec);
      const beat = beatIdx >= 0 ? analysis.beats[beatIdx] : null;

      let intensity = 0;
      let onBeat = false;

      if (beat) {
        const msSinceBeat = (elapsedSec - beat.start) * 1000;

        if (beatIdx !== lastBeatIndexRef.current) {
          // New beat — fire the flash
          lastBeatIndexRef.current = beatIdx;
          lastBeatFlashTimeRef.current = now;
        }

        const msFlash = now - lastBeatFlashTimeRef.current;
        onBeat = msFlash < BEAT_FLASH_MS;

        // Exponential decay from beat peak
        const decayFactor = Math.exp(
          (-Math.LN2 / FALLOFF_HALF_LIFE_MS) * Math.max(0, msSinceBeat)
        );
        const confidence = beat.confidence ?? 0.5;
        intensity = decayFactor * confidence;
      }

      // Determine hue from current section
      const sectionIdx = analysis.sections.findIndex(
        (s) => s.start <= elapsedSec && elapsedSec < s.start + s.duration
      );
      const sectionHueOffset = sectionIdx >= 0 ? (sectionIdx * 37) % 360 : 0;
      const hue = (baseHueRef.current + sectionHueOffset) % 360;

      setSignal({ intensity: Math.min(1, intensity), hue, onBeat });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
    // progressMs and progressTimestamp intentionally included — they update every poll
  }, [enabled, isPlaying, progressMs, progressTimestamp, trackId]);

  return signal;
}
