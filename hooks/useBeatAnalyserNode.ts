"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * useBeatAnalyserNode
 *
 * Attaches a Web Audio AnalyserNode to an existing HTMLAudioElement and provides
 * a ref that is updated every animation frame with the current bass/mid intensity
 * (0–1). The ref never causes React re-renders; the consumer samples it inside its
 * own rAF loop.
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
): { intensityRef: React.RefObject<number> } {
  const intensityRef = useRef<number>(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // Track the MediaElementSourceNode to avoid double-connecting the same element
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const dataRef = useRef<Uint8Array | null>(null);

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    intensityRef.current = 0;
  }, []);

  const startLoop = useCallback(() => {
    const analyser = analyserRef.current;
    const data = dataRef.current;
    if (!analyser || !data) return;

    const tick = () => {
      analyser.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);

      // Average bass/low-mid frequencies (roughly 60–300 Hz).
      // The FFT size is 1024 at sample rate 44100 → each bin ≈ 43 Hz.
      // Bins 1–7 cover ~43–300 Hz.
      let sum = 0;
      const lo = 1;
      const hi = 7;
      for (let i = lo; i <= hi; i++) {
        sum += data[i] ?? 0;
      }
      const avg = sum / (hi - lo + 1);
      // Normalise 0→255 to 0→1, apply mild exponent for better dynamics
      intensityRef.current = Math.min(1, (avg / 255) ** 0.7);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

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
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.75;
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

  return { intensityRef };
}
