"use client";

import { createContext, useContext } from "react";
import type { MotionPreference, MotionTier } from "@/lib/motion-tier";

export type MotionTierValue = {
  /** The resolved tier for this device and user. */
  tier: MotionTier;
  /** What the user picked in Settings. `auto` defers to capability. */
  preference: MotionPreference;
  /** Persist a new preference and re-resolve immediately. */
  setPreference: (preference: MotionPreference) => void;
  /** True only for `full` on a wide enough viewport — required for the 3D world. */
  canRender3D: boolean;
};

/**
 * Default value is the conservative one. Anything consuming this outside the
 * provider gets a static, complete experience rather than a broken animation.
 */
export const MotionTierContext = createContext<MotionTierValue>({
  tier: "reduced",
  preference: "auto",
  setPreference: () => {},
  canRender3D: false
});

export function useMotionTier(): MotionTierValue {
  return useContext(MotionTierContext);
}

/** Convenience: true when full motion is active. */
export function useFullMotion(): boolean {
  return useMotionTier().tier === "full";
}
