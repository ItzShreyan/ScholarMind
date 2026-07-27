"use client";

import { useCallback, useEffect, useRef } from "react";
import type { BeatSignal } from "@/hooks/useSpotifyBeatClock";

/**
 * useBeatAnalyserNode
 *
 * Attaches a Web Audio AnalyserNode to an existing HTMLAudioElement and provides
 * refs that are updated every animation frame with the current band energy and
 * derived BeatSignal. The refs never cause React re-renders; consumers sample
 * them inside their own rAF loops.
 *
 * IMPORTANT: this only works for audio playing through an HTMLAudioElement owned
 * by this page. It cannot capture Spotify's DRM-protected audio output.
 *
 * @param audioRef  The ref to the <audio> element used for uploaded playback.
 * @param enabled   When false the analyser is not created / is disconnected.
 */
export function useBeatAnalyserNode(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  enabled: boolean
): { intensityRef: React.RefObject<number>; signalRef: React.RefObject<BeatSignal> } {
  const intensityRef = useRef<number>(0);
  const signalRef = useRef<BeatSignal>({ intensity: 0, hue: 180, onBeat: false, bass: 0, mid: 0, treble: 0 });
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // Track the MediaElementSourceNode to avoid double-connecting the same element
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const dataRef = useRef<Uint8Array | null>(null);
  const previousBassRef = useRef(0);
  const beatFlashEndRef = useRef(0);

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    intensityRef.current = 0;
    signalRef.current = { ...signalRef.current, intensity: 0, onBeat: false, bass: 0, mid: 0, treble: 0 };
  }, []);

  const averageBand = useCallback((data: Uint8Array, ctx: AudioContext, analyser: AnalyserNode, minHz: number, maxHz: number) => {
    const nyquist = ctx.sampleRate / 2;
    const startHz = Math.max(0, Math.min(nyquist, minHz));
    const endHz = Math.max(startHz, Math.min(nyquist, maxHz));
    const startBin = Math.max(0, Math.floor((startHz / nyquist) * data.length));
    const endBin = Math.min(data.length - 1, Math.ceil((endHz / nyquist) * data.length));
    let sum = 0;
    let count = 0;

    for (let index = startBin; index <= endBin; index += 1) {
      sum += data[index] ?? 0;
      count += 1;
    }

    const average = count ? sum / count / 255 : 0;
    const smoothingLift = 1 - analyser.smoothingTimeConstant * 0.22;
    return Math.min(1, average ** 0.72 * smoothingLift * 1.2);
  }, []);

  const startLoop = useCallback(() => {
    const analyser = analyserRef.current;
    const data = dataRef.current;
    const ctx = ctxRef.current;
    if (!analyser || !data || !ctx) return;

    const tick = () => {
      analyser.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);

      const bass = averageBand(data, ctx, analyser, 20, 250);
      const mid = averageBand(data, ctx, analyser, 250, 4000);
      const treble = averageBand(data, ctx, analyser, 4000, ctx.sampleRate / 2);
      const intensity = Math.min(1, bass * 0.56 + mid * 0.28 + treble * 0.22);
      const now = performance.now();

      if (bass > previousBassRef.current * 1.45 && bass > 0.09) {
        beatFlashEndRef.current = now + 90;
      }
      previousBassRef.current = bass;

      const dominantHue = bass >= mid && bass >= treble
        ? 18 + bass * 28
        : mid >= treble
          ? 145 + mid * 58
          : 230 + treble * 74;
      const hue = dominantHue % 360;
      const onBeat = now < beatFlashEndRef.current;

      intensityRef.current = intensity;
      signalRef.current = { intensity, hue, onBeat, bass, mid, treble };

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [averageBand]);

  const connect = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || typeof window === "undefined") return;

    try {
      // Lazily create AudioContext (requires user gesture to start)
      if (!ctxRef.current || ctxRef.current.state === "closed") {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;

      // Resume if suspended (autoplay policy)
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      // Create source only once per element — Web Audio throws if you call
      // createMediaElementSource on the same element twice.
      if (!sourceNodeRef.current) {
        sourceNodeRef.current = ctx.createMediaElementSource(audio);
      }

      if (!analyserRef.current) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.58;
        analyserRef.current = analyser;
        dataRef.current = new Uint8Array(analyser.frequencyBinCount);

        // Route: source → analyser → output (so audio still plays)
        sourceNodeRef.current.connect(analyser);
        analyser.connect(ctx.destination);
      }

      startLoop();
    } catch (error) {
      // Analysis is non-essential, but keep a development-only diagnostic so a
      // CORS or browser-policy issue can be identified without exposing it in UI.
      if (process.env.NODE_ENV !== "production") {
        console.debug("beat_reactive_analyser_unavailable", {
          message: error instanceof Error ? error.message : "Unknown analyser error"
        });
      }
    }
  }, [audioRef, startLoop]);

  const disconnect = useCallback(() => {
    stopLoop();
    intensityRef.current = 0;
    signalRef.current = { ...signalRef.current, intensity: 0, onBeat: false, bass: 0, mid: 0, treble: 0 };
  }, [stopLoop]);

  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }

    // Wait for the audio element to actually start playing before connecting,
    // since AudioContext requires a user gesture and the element must have a src.
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => connect();
    const onPause = () => stopLoop();

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    // If already playing when enabled is toggled on:
    if (!audio.paused) connect();

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      stopLoop();
    };
  }, [enabled, audioRef, connect, disconnect, stopLoop]);

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      stopLoop();
      void ctxRef.current?.close();
      ctxRef.current = null;
      analyserRef.current = null;
      sourceNodeRef.current = null;
    };
  }, [stopLoop]);

  return { intensityRef, signalRef };
}
