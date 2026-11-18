import type { Transition, Variants } from "framer-motion";

/**
 * Single source of truth for ScholarMind motion.
 *
 * Rules (enforced by review, not by types):
 *  - animate `transform` and `opacity` only — never blur, box-shadow, width,
 *    height or gradient stops
 *  - interactive feedback uses `fast`; content reveals use `base`
 *  - `slow` and `cinematic` are reserved for scene-level transitions
 *  - every consumer must be gated by `useMotionTier()` so reduced-motion users
 *    and low-end devices get a static, complete experience
 */

export type Easing = [number, number, number, number];

export const duration = {
  /** Press/tap feedback. Should feel instantaneous. */
  instant: 0.08,
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
  /** Reserved for the world coming into view. Must stay interruptible. */
  cinematic: 0.6
} as const;

export const easing = {
  /** Default UI easing. Fast out, settled in. */
  standard: [0.22, 1, 0.36, 1] as Easing,
  /** Large travel: camera moves, scene reveals, page-level transitions. */
  cinematic: [0.16, 1, 0.3, 1] as Easing,
  /** Leaving the screen. */
  exit: [0.4, 0, 1, 1] as Easing
} as const;

export const spring = {
  gentle: { type: "spring", stiffness: 260, damping: 28, mass: 0.9 },
  snappy: { type: "spring", stiffness: 420, damping: 30, mass: 0.7 }
} as const satisfies Record<string, Transition>;

export const transition = {
  instant: { duration: duration.instant, ease: easing.standard },
  fast: { duration: duration.fast, ease: easing.standard },
  base: { duration: duration.base, ease: easing.standard },
  slow: { duration: duration.slow, ease: easing.cinematic },
  cinematic: { duration: duration.cinematic, ease: easing.cinematic }
} as const satisfies Record<string, Transition>;

/** Travel distances in px. Keep reveals short so nothing "flies". */
export const distance = {
  tight: 6,
  base: 12,
  loose: 24,
  section: 40
} as const;

/** Stagger delays in seconds. */
export const stagger = {
  tight: 0.04,
  base: 0.06,
  loose: 0.09
} as const;

/** How far a reveal moves. Larger travel reads as more cinematic. */
export type RevealDistance = keyof typeof distance;

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.base }
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: distance.base },
  visible: { opacity: 1, y: 0, transition: transition.base }
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -distance.base },
  visible: { opacity: 1, y: 0, transition: transition.base }
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: transition.base }
};

/** Use on a parent; children use `staggerItem`. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger.base, delayChildren: duration.fast }
  }
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: distance.tight },
  visible: { opacity: 1, y: 0, transition: transition.base }
};

/** Tab / panel swaps: opacity + a tiny translate. */
export const panelSwap: Variants = {
  hidden: { opacity: 0, y: distance.tight },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: easing.standard } },
  exit: { opacity: 0, y: -distance.tight, transition: { duration: duration.fast, ease: easing.exit } }
};

/** Mobile sheets and drawers: transform only. */
export const sheetSlide: Variants = {
  hidden: { opacity: 0, y: distance.section },
  visible: { opacity: 1, y: 0, transition: transition.slow },
  exit: { opacity: 0, y: distance.section, transition: transition.base }
};

export const pressFeedback = {
  whileHover: { scale: 1.015 },
  whileTap: { scale: 0.97 },
  transition: spring.snappy
} as const;

/**
 * Standard scroll reveal. `once` is required so a section never re-animates
 * while the user is reading it.
 */
export const viewportOnce = { once: true, amount: 0.25 } as const;

/**
 * Resolve a variant set for the active motion tier.
 *
 * `full`    → the real animation
 * `reduced` → the same end state, reached instantly (no travel, no stagger)
 * `off`     → `undefined`, so framer-motion renders the plain element
 */
export function tierVariants(
  tier: "full" | "reduced" | "off",
  variants: Variants
): Variants | undefined {
  if (tier === "off") return undefined;
  if (tier === "full") return variants;

  const collapsed: Variants = {};
  for (const [key, value] of Object.entries(variants)) {
    if (value === null || typeof value !== "object") {
      collapsed[key] = value;
      continue;
    }
    const { y: _y, x: _x, scale: _scale, ...rest } = value as Record<string, unknown>;
    collapsed[key] = { ...rest, transition: { duration: 0 } };
  }
  return collapsed;
}

/**
 * Delay helper for stagger lists. Returns 0 when motion is not `full` so no
 * component has to special-case the reduced tiers itself.
 */
export function staggerDelay(
  tier: "full" | "reduced" | "off",
  index: number,
  step: number = stagger.base,
  maxIndex = 11
): number {
  if (tier !== "full") return 0;
  return Math.min(index, maxIndex) * step;
}
