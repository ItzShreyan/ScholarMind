/**
 * Capability-aware motion tiers.
 *
 * The decision is deliberately conservative: it is better to under-animate a
 * capable phone than to drop every frame on a weak one.
 *
 *   full    → full motion, 3D world, backdrop blur, glows
 *   reduced → colours and layout intact, travel/stagger/blur removed
 *   off     → no animation at all (prefers-reduced-motion or user override)
 *
 * This module is intentionally free of React so the boot script in
 * `app/layout.tsx` can ship the exact same logic inline before first paint.
 */

export type MotionTier = "full" | "reduced" | "off";

/** What the user chose in Settings. `auto` defers to device capability. */
export type MotionPreference = "auto" | "reduced" | "off";

export const MOTION_PREFERENCE_KEY = "scholarmind_motion_preference";

/** Below this width we never run the full tier. */
export const NARROW_VIEWPORT_PX = 768;

/** Cores/memory at or below this are treated as low-end. */
const LOW_CORE_COUNT = 4;
const LOW_MEMORY_GB = 4;

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

/** True when the OS asks for reduced motion. Never throws. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Read the stored preference. Returns `auto` when nothing usable is stored. */
export function readMotionPreference(): MotionPreference {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = window.localStorage.getItem(MOTION_PREFERENCE_KEY);
    if (raw === "reduced" || raw === "off" || raw === "auto") return raw;
  } catch {
    // Private mode / storage disabled — fall through to auto.
  }
  return "auto";
}

/** Persist the preference. Returns false when storage is unavailable. */
export function writeMotionPreference(preference: MotionPreference): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(MOTION_PREFERENCE_KEY, preference);
    return true;
  } catch {
    return false;
  }
}

/**
 * Devices that are technically capable but will visibly struggle with
 * backdrop-filter, large blurs and continuous animation.
 */
export function isLowPowerDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const nav = navigator as NavigatorWithHints;

  try {
    if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0) {
      if (nav.hardwareConcurrency <= LOW_CORE_COUNT) return true;
    }

    // Chromium only; undefined elsewhere and treated as "unknown".
    if (typeof nav.deviceMemory === "number" && nav.deviceMemory > 0) {
      if (nav.deviceMemory <= LOW_MEMORY_GB) return true;
    }

    if (nav.connection?.saveData === true) return true;
  } catch {
    return false;
  }

  return false;
}

export function isNarrowViewport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.innerWidth < NARROW_VIEWPORT_PX;
  } catch {
    return false;
  }
}

/**
 * Resolve the tier. Precedence:
 *   1. OS reduced-motion            → off
 *   2. explicit user override       → reduced | off
 *   3. weak device / narrow / save-data → reduced
 *   4. otherwise                    → full
 */
export function detectMotionTier(
  preference: MotionPreference = readMotionPreference()
): MotionTier {
  if (prefersReducedMotion()) return "off";
  if (preference === "off") return "off";
  if (preference === "reduced") return "reduced";
  if (isLowPowerDevice() || isNarrowViewport()) return "reduced";
  return "full";
}

/** Reflect the tier on <html> so CSS can respond without a React re-render. */
export function applyMotionTier(tier: MotionTier): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-motion", tier);
}

/**
 * Inline boot script. Runs before first paint so a reduced-motion user never
 * sees one frame of the animated layout.
 */
export const motionBootScript = `
(function () {
  try {
    var root = document.documentElement;
    var tier = "full";
    var off = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var stored = null;
    try { stored = localStorage.getItem("${MOTION_PREFERENCE_KEY}"); } catch (e) {}
    if (off) {
      tier = "off";
    } else if (stored === "off") {
      tier = "off";
    } else if (stored === "reduced") {
      tier = "reduced";
    } else {
      var nav = navigator || {};
      var weak =
        (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= ${LOW_CORE_COUNT}) ||
        (typeof nav.deviceMemory === "number" && nav.deviceMemory > 0 && nav.deviceMemory <= ${LOW_MEMORY_GB}) ||
        (nav.connection && nav.connection.saveData === true) ||
        window.innerWidth < ${NARROW_VIEWPORT_PX};
      if (weak) tier = "reduced";
    }
    root.setAttribute("data-motion", tier);
  } catch (error) {
    document.documentElement.setAttribute("data-motion", "reduced");
  }
})();
`;
