"use client";

import dynamic from "next/dynamic";

/**
 * Reserves the world's exact footprint before its JavaScript arrives, so
 * lazy-loading three.js never shifts the page. The placeholder sits on the same
 * gradient as the real stage, which makes the hand-off invisible.
 */
function WorldPoster() {
  return (
    <div
      className="world-stage grid place-items-center rounded-[var(--radius-xl)] border border-[color:var(--surface-border)]"
      style={{ height: "clamp(360px, 56vh, 560px)" }}
    >
      <p className="text-xs text-[color:var(--text-3)]">
        The five places you study in are loading…
      </p>
    </div>
  );
}

const LearningWorld = dynamic(
  () => import("@/components/world/LearningWorld").then((m) => ({ default: m.LearningWorld })),
  { ssr: false, loading: () => <WorldPoster /> }
);

export function DeferredLearningWorld({ className }: { className?: string }) {
  return <LearningWorld className={className} />;
}
