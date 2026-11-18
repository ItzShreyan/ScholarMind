/**
 * Celebration helper.
 *
 * `canvas-confetti` is a decorative dependency: it is imported here, inside the
 * call, so it is never part of the initial bundle and is only fetched the first
 * time a student actually finishes something worth celebrating.
 *
 * It is also skipped entirely unless the motion tier is `full` — confetti is
 * pure decoration, so a reduced-motion or low-power user should never pay for
 * it, in bytes or in frames.
 */

import type { Options } from "canvas-confetti";

/** Deliberately short and warm — amber and blue, not a rainbow. */
export const CELEBRATION_OPTIONS: Options = {
  particleCount: 90,
  spread: 68,
  startVelocity: 34,
  decay: 0.9,
  gravity: 0.9,
  scalar: 0.95,
  ticks: 160,
  colors: ["#e9ce9a", "#dca566", "#88b7ce", "#8fc2ac"]
};

function motionTierAllowsCelebration(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-motion") === "full";
}

/**
 * Fire a celebration. Never throws and never blocks the caller — a failed
 * celebration must never interrupt studying.
 */
export async function fireConfetti(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!motionTierAllowsCelebration()) return;

  try {
    const confettiModule = await import("canvas-confetti");
    const confetti = confettiModule.default ?? confettiModule;
    confetti({ ...CELEBRATION_OPTIONS });
  } catch {
    // Decorations are optional; the result the student just earned is not.
  }
}
