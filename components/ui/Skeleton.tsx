"use client";

import { cn } from "@/components/ui/cn";

type SkeletonProps = {
  className?: string;
  /** Renders as a circle — avatars, icon placeholders. */
  circle?: boolean;
};

/**
 * Loading placeholder.
 *
 * The shimmer is CSS-only and is switched off by the `data-motion` rules in
 * globals.css, so a reduced-motion user gets a calm, static block instead of a
 * pulsing one. Layout is identical either way, so nothing shifts when the real
 * content arrives.
 */
export function Skeleton({ className, circle = false }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "motion-infinite block bg-[color:var(--surface-3)] opacity-70",
        circle ? "rounded-full" : "rounded-token-sm",
        className
      )}
      style={{ animation: "none" }}
    />
  );
}

/** A stack of text lines — the common case for notes, chat history and files. */
export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span className={cn("block space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3", index === lines - 1 ? "w-2/3" : index % 2 === 0 ? "w-full" : "w-5/6")}
        />
      ))}
    </span>
  );
}

/**
 * Panel-shaped placeholder used by `next/dynamic` loading states, so a
 * lazily-loaded panel occupies its final footprint from the first frame.
 */
export function SkeletonPanel({
  title,
  lines = 4,
  className
}: {
  title?: string;
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("panel rounded-token-lg p-4", className)} role="status" aria-busy="true">
      <span className="sr-only">{title ? `Loading ${title}` : "Loading"}</span>
      <SkeletonLines lines={lines} />
    </div>
  );
}
