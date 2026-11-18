"use client";

import { useEffect, useId, useRef } from "react";
import { useMotionTier } from "@/hooks/useMotionTier";
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

/** Target frame interval on the `reduced` tier: ~30fps, not 60. */
const REDUCED_FRAME_MS = 1000 / 30;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildWavePath(amplitude: number, phase: number, frequency: number) {
  const inset = 1.4;
  const pointsPerSide = 22;
  const points: string[] = [];
  const addPoint = (x: number, y: number) => {
    points.push(`${points.length ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`);
  };

  for (let i = 0; i <= pointsPerSide; i += 1) {
    const t = i / pointsPerSide;
    const wave = Math.sin(t * Math.PI * 2 * frequency + phase) * amplitude;
    addPoint(inset + t * (100 - inset * 2), inset + wave);
  }

  for (let i = 1; i <= pointsPerSide; i += 1) {
    const t = i / pointsPerSide;
    const wave = Math.sin(t * Math.PI * 2 * frequency + phase + Math.PI / 2) * amplitude;
    addPoint(100 - inset + wave, inset + t * (100 - inset * 2));
  }

  for (let i = 1; i <= pointsPerSide; i += 1) {
    const t = i / pointsPerSide;
    const wave = Math.sin(t * Math.PI * 2 * frequency + phase + Math.PI) * amplitude;
    addPoint(100 - inset - t * (100 - inset * 2), 100 - inset + wave);
  }

  for (let i = 1; i <= pointsPerSide; i += 1) {
    const t = i / pointsPerSide;
    const wave = Math.sin(t * Math.PI * 2 * frequency + phase + Math.PI * 1.5) * amplitude;
    addPoint(inset + wave, 100 - inset - t * (100 - inset * 2));
  }

  return `${points.join(" ")} Z`;
}

/**
 * BeatReactiveBorder
 *
 * A fixed-position, pointer-events-disabled full-viewport SVG overlay that renders
 * a crisp animated stroke just inside the screen edges. The animation loop mutates
 * SVG attributes directly rather than using React state, keeping the wave
 * independent from React renders.
 *
 * Motion budget (per lib/motion-tier.ts):
 *   off     → nothing is rendered at all, so the rAF loop never starts
 *   reduced → runs, but throttled to ~30fps
 *   full    → runs at the display refresh rate
 *
 * The loop also stops while the document is hidden: a background tab must not
 * keep a compositor busy drawing to a screen nobody is looking at.
 */
export function BeatReactiveBorder({ signal, enabled }: BeatReactiveBorderProps) {
  const { tier } = useMotionTier();
  const gradientId = useId().replace(/:/g, "");
  const basePathRef = useRef<SVGPathElement | null>(null);
  const flashPathRef = useRef<SVGPathElement | null>(null);
  const stopOneRef = useRef<SVGStopElement | null>(null);
  const stopTwoRef = useRef<SVGStopElement | null>(null);
  const stopThreeRef = useRef<SVGStopElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const signalRef = useRef<BeatSignal | null>(signal);
  const smoothedRef = useRef(0);
  const flashRef = useRef(0);
  const wasOnBeatRef = useRef(false);
  const phaseRef = useRef(0);
  const lastFrameRef = useRef(0);
  const rafRef = useRef<number>(0);

  /** `off` means the overlay does not exist — not "exists but frozen". */
  const isActive = enabled && tier !== "off";

  useEffect(() => {
    signalRef.current = signal;
  }, [signal]);

  useEffect(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    if (
      !isActive ||
      !svgRef.current ||
      !basePathRef.current ||
      !flashPathRef.current
    ) {
      return;
    }

    const svg = svgRef.current;
    const basePath = basePathRef.current;
    const flashPath = flashPathRef.current;
    const throttleMs = tier === "reduced" ? REDUCED_FRAME_MS : 0;

    const tick = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(tick);

      /*
       * 30fps cap. Returning early still leaves the next frame scheduled, so
       * the loop keeps its cadence without ever running the maths twice.
       */
      if (throttleMs > 0 && timestamp - lastFrameRef.current < throttleMs) {
        return;
      }

      const currentSignal = signalRef.current;
      const target = currentSignal ? clamp(currentSignal.intensity, 0, 1) : 0;
      const hue = currentSignal ? currentSignal.hue : 180;
      const onBeat = Boolean(currentSignal?.onBeat);
      const deltaSeconds = lastFrameRef.current
        ? Math.min(0.05, (timestamp - lastFrameRef.current) / 1000)
        : 0.016;
      lastFrameRef.current = timestamp;

      // Punchier attack than a plain glow, but controlled enough decay to keep
      // a continuous line between beat pulses.
      const lerpRate = target > smoothedRef.current ? 0.56 : 0.08;
      smoothedRef.current += (target - smoothedRef.current) * lerpRate;

      if (onBeat && !wasOnBeatRef.current) {
        flashRef.current = 1;
      }
      wasOnBeatRef.current = onBeat;
      flashRef.current = Math.max(0, flashRef.current - deltaSeconds * 5.8);

      const smoothed = clamp(smoothedRef.current, 0, 1);
      const flash = clamp(flashRef.current, 0, 1);
      const tempo = currentSignal?.tempo && currentSignal.tempo > 0 ? currentSignal.tempo : 104;
      const waveSpeed = 0.7 + tempo / 180 + smoothed * 1.2 + flash * 1.8;
      phaseRef.current += deltaSeconds * waveSpeed * Math.PI;

      const amplitude = 0.08 + smoothed * 0.85 + flash * 0.45;
      const frequency = 1.2 + smoothed * 1.4;
      const nextPath = buildWavePath(amplitude, phaseRef.current, frequency);
      const alpha = clamp(0.22 + smoothed * 0.62 + flash * 0.12, 0, 0.95);
      const flashAlpha = clamp(flash * 0.9, 0, 0.9);

      basePath.setAttribute("d", nextPath);
      basePath.setAttribute("stroke-width", (1.2 + smoothed * 1.1).toFixed(2));
      basePath.setAttribute("opacity", alpha.toFixed(3));

      flashPath.setAttribute("d", nextPath);
      flashPath.setAttribute("stroke-width", (2.2 + flash * 2.2).toFixed(2));
      flashPath.setAttribute("opacity", flashAlpha.toFixed(3));
      flashPath.setAttribute("stroke-dasharray", `${(12 + flash * 24).toFixed(1)} ${(18 - flash * 8).toFixed(1)}`);
      flashPath.setAttribute("stroke-dashoffset", `${(-phaseRef.current * 10).toFixed(2)}`);

      stopOneRef.current?.setAttribute("stop-color", `hsla(${hue}, 100%, 64%, 1)`);
      stopTwoRef.current?.setAttribute("stop-color", `hsla(${(hue + 58 + flash * 18) % 360}, 100%, 68%, 1)`);
      stopThreeRef.current?.setAttribute("stop-color", `hsla(${(hue + 124) % 360}, 100%, 62%, 1)`);

      svg.style.opacity = smoothed < 0.004 && flash < 0.004 ? "0" : "1";
    };

    /** Restart the loop from a clean timestamp so throttling cannot bank frames. */
    const start = () => {
      if (rafRef.current) return;
      lastFrameRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      lastFrameRef.current = 0;
    };

    start();

    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
        svg.style.opacity = "0";
      } else {
        start();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
      svg.style.opacity = "0";
      basePath.removeAttribute("d");
      flashPath.removeAttribute("d");
      smoothedRef.current = 0;
      flashRef.current = 0;
      wasOnBeatRef.current = false;
      phaseRef.current = 0;
    };
  }, [isActive, tier]);

  if (!isActive) return null;

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        opacity: 0,
        overflow: "visible",
        transition: "opacity 180ms ease"
      }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop ref={stopOneRef} offset="0%" />
          <stop ref={stopTwoRef} offset="52%" />
          <stop ref={stopThreeRef} offset="100%" />
        </linearGradient>
      </defs>
      <path
        ref={basePathRef}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        ref={flashPathRef}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
