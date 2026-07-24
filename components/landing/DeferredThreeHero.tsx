"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ThreeHero = dynamic(() => import("@/components/landing/ThreeHero").then((module) => module.ThreeHero), {
  ssr: false,
  loading: () => <HeroVisualSkeleton />
});

function HeroVisualSkeleton() {
  return (
    <div
      className="panel panel-border relative min-h-[320px] overflow-hidden rounded-[34px] p-3 sm:min-h-[400px] sm:p-4 lg:min-h-[500px]"
      aria-label="Loading interactive study visual"
      role="status"
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.88),rgba(7,16,35,0.9)_58%,rgba(2,6,23,0.94))]" />
      <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_50%_42%,rgba(57,208,255,0.24),transparent_24%),radial-gradient(circle_at_20%_18%,rgba(255,125,89,0.18),transparent_22%)]" />
      <div className="glass absolute left-4 top-4 h-16 w-56 rounded-3xl" />
      <div className="glass absolute bottom-4 left-4 h-16 w-64 rounded-3xl" />
      <span className="sr-only">Loading interactive visual</span>
    </div>
  );
}

/**
 * `next/dynamic` is Next's React.lazy-compatible boundary. Waiting until the
 * browser is idle keeps Three.js, GLTF parsing, and its multi-megabyte textures
 * off the critical rendering path.
 */
export function DeferredThreeHero() {
  const [loadVisual, setLoadVisual] = useState(false);

  useEffect(() => {
    const idleWindow = window as unknown as {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(() => setLoadVisual(true), { timeout: 1800 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(() => setLoadVisual(true), 700);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return loadVisual ? <ThreeHero /> : <HeroVisualSkeleton />;
}
