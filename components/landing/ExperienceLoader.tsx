"use client";

import { Logo } from "@/components/ui/Logo";

/**
 * Stage 00 — the loader.
 *
 * A full-screen hold while the world is built. The background is the hero's own
 * gradient, so when the overlay fades the page behind it is already the correct
 * colour and the hand-off has nothing to flash.
 *
 * Every element enters on a stagger (logo, status, bar, percentage) and the
 * whole thing leaves on one opacity transition. Nothing here is a fake spinner:
 * the percentage is the real `updateLoaderProgress` value, and the parent
 * declares the world ready — or `ready` on the fallback path — before this can
 * reach 100.
 */

export type LoaderState = "loading" | "leaving" | "done";

type ExperienceLoaderProps = {
  state: LoaderState;
  progress: number;
  /** True when the scene failed and the static poster is standing in. */
  fallback?: boolean;
};

export function ExperienceLoader({ state, progress, fallback = false }: ExperienceLoaderProps) {
  if (state === "done") return null;

  const percentage = Math.round(progress);
  const leaving = state === "leaving";

  return (
    <div
      // `aria-live` so a screen reader hears the status change once, not every
      // percentage tick: the label below is what actually updates it.
      role="status"
      aria-live="polite"
      aria-busy={!leaving}
      className={`fixed inset-0 z-[60] grid place-items-center transition-opacity duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{
        background:
          "radial-gradient(58rem 34rem at 50% 58%, rgba(220,165,102,0.16), transparent 68%), radial-gradient(40rem 26rem at 50% 22%, rgba(136,183,206,0.10), transparent 66%), linear-gradient(178deg, #05090d 0%, #080d12 46%, #0b131a 100%)"
      }}
    >
      <div className="flex w-full max-w-sm flex-col items-center px-8 text-center">
        <div className={`loader-step ${leaving ? "is-out" : ""}`} style={{ animationDelay: "0ms" }}>
          <Logo size={54} />
        </div>

        <p
          className={`loader-step mt-6 font-display text-[22px] font-semibold tracking-[-0.03em] text-[color:var(--text-1)] ${
            leaving ? "is-out" : ""
          }`}
          style={{ animationDelay: "120ms" }}
        >
          ScholarMind
        </p>

        <p
          className="loader-step mt-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--accent-gold)]"
          style={{ animationDelay: "220ms" }}
        >
          The learning world
        </p>

        <p
          className="loader-step mt-9 text-[13px] text-[color:var(--text-2)]"
          style={{ animationDelay: "320ms" }}
        >
          {fallback ? "Preparing the static world" : "Preparing your learning world"}
        </p>

        <div
          className="loader-step mt-4 h-px w-full overflow-hidden bg-[color:var(--surface-border)]"
          style={{ animationDelay: "400ms" }}
        >
          <span
            className="block h-full bg-[linear-gradient(90deg,var(--accent-gold),var(--accent-coral))] transition-[width] duration-200 ease-out"
            style={{ width: `${Math.max(2, progress)}%` }}
          />
        </div>

        <p
          className="loader-step mt-3 text-[11px] font-medium tabular-nums text-[color:var(--text-3)]"
          style={{ animationDelay: "460ms" }}
        >
          {percentage}%
        </p>
      </div>
    </div>
  );
}
