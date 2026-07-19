"use client";

import { useEffect, useRef } from "react";
import type { BeatSignal } from "@/hooks/useSpotifyBeatClock";

interface BeatReactiveBorderProps {
  /**
   * The beat signal from either the Web Audio analyser (local tracks) or the
   * Spotify beat-clock (Spotify tracks). When null/undefined the border fades out.
   */
  signal: BeatSignal | null;
  /** Master enable — when false the overlay is removed from the DOM entirely. */
  enabled: boolean;
}

/**
 * BeatReactiveBorder
 *
 * A fixed-position, pointer-events-disabled full-viewport overlay that renders a
 * thin, animated rainbow gradient along the screen edges, reacting to music.
 *
 * Rendering is intentionally DOM-direct: the component mutates a ref's style on
 * every animation frame rather than calling setState, so it never triggers React
 * re-renders at 60 fps.
 */
export function BeatReactiveBorder({ signal, enabled }: BeatReactiveBorderProps) {
  const divRef = useRef<HTMLDivElement | null>(null);
  // Smoothed intensity — lerped toward the target each frame for soft decay
  const smoothedRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    if (!enabled || !divRef.current) return;

    const el = divRef.current;

    const tick = () => {
      const target = signal ? signal.intensity : 0;
      const hue = signal ? signal.hue : 180;
      const onBeat = signal ? signal.onBeat : false;

      // Lerp: fast attack (0.35), slow decay (0.06) for natural feel
      const lerpRate = target > smoothedRef.current ? 0.35 : 0.06;
      smoothedRef.current += (target - smoothedRef.current) * lerpRate;
      const s = smoothedRef.current;

      // Thin rainbow gradient — the border blows out slightly on strong beats
      const spread = Math.round(6 + s * 18);     // 6–24 px
      const blur   = Math.round(12 + s * 40);    // 12–52 px
      const alpha  = Math.min(0.85, 0.15 + s * 0.7);

      // Build a three-stop gradient rotated around the hue
      const h1 = hue;
      const h2 = (hue + 120) % 360;
      const h3 = (hue + 240) % 360;

      const glow = onBeat
        ? `0 0 ${spread * 2}px ${blur * 2}px hsla(${h1},100%,65%,${Math.min(1, alpha * 1.5)})`
        : "";

      el.style.boxShadow = [
        `inset 0 0 ${spread}px ${blur}px hsla(${h1},100%,60%,${alpha})`,
        `inset 0 ${spread}px ${blur}px hsla(${h2},100%,65%,${alpha * 0.7})`,
        `inset 0 -${spread}px ${blur}px hsla(${h3},100%,65%,${alpha * 0.7})`,
        glow
      ]
        .filter(Boolean)
        .join(", ");

      el.style.opacity = s < 0.005 ? "0" : "1";

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      el.style.boxShadow = "";
      el.style.opacity = "0";
      smoothedRef.current = 0;
    };
  }, [enabled, signal]);

  if (!enabled) return null;

  return (
    <div
      ref={divRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        borderRadius: 0,
        opacity: 0,
        // Use will-change so the browser composites this layer separately
        willChange: "box-shadow, opacity",
        transition: "opacity 300ms ease"
      }}
    />
  );
}
