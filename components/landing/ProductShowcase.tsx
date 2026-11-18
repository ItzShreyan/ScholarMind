"use client";

import type { ReactNode } from "react";

/**
 * The frame every product demonstration sits in.
 *
 * A browser-window silhouette in warm ivory, with a subdued title bar, a thin
 * border and one soft shadow. It is deliberately quiet: the point of these
 * panels is that they read as *the product*, so the frame has to disappear.
 *
 * The caption line is not decoration — it states plainly that what is shown is
 * an illustration of a real screen, which is true and which stops the panel from
 * implying it is somebody's live account.
 */

type ProductShowcaseProps = {
  /** Shown in the title bar, like a document path. */
  label: string;
  /** Optional right-hand status text in the title bar. */
  status?: string;
  /** One line under the frame. Always says this is a demonstration. */
  caption: string;
  children: ReactNode;
  /** Removes the inner padding for full-bleed layouts. */
  flush?: boolean;
  className?: string;
};

export function ProductShowcase({
  label,
  status,
  caption,
  children,
  flush = false,
  className = ""
}: ProductShowcaseProps) {
  return (
    <figure className={`relative ${className}`}>
      {/* The back plate: a second sheet of paper behind the window. */}
      <div
        aria-hidden="true"
        className="absolute -inset-x-2 -top-2 bottom-6 rounded-[var(--radius-xl)] border border-[color:var(--editorial-border)] bg-[color:var(--editorial-bg-soft)]/70"
      />

      <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--editorial-border)] bg-[color:var(--editorial-bg-raise)] shadow-[0_36px_90px_rgba(3,8,12,0.55)]">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--editorial-border)] bg-[color:var(--editorial-bg)]/70 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-[rgba(24,33,42,0.16)]" />
              <span className="h-2 w-2 rounded-full bg-[rgba(24,33,42,0.16)]" />
              <span className="h-2 w-2 rounded-full bg-[rgba(24,33,42,0.16)]" />
            </span>
            <span className="truncate text-[10px] font-medium tracking-[0.02em] text-[color:var(--editorial-muted)]">
              {label}
            </span>
          </div>

          {status ? (
            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.16em] text-[color:var(--editorial-accent)]">
              {status}
            </span>
          ) : null}
        </div>

        <div className={flush ? "" : "p-4 sm:p-5"}>{children}</div>
      </div>

      <figcaption className="mx-auto mt-4 max-w-[46ch] text-center text-[11px] leading-5 text-[color:var(--text-3)]">
        {caption}
      </figcaption>
    </figure>
  );
}
