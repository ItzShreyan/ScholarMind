"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import { MotionTierContext, type MotionTierValue } from "@/hooks/useMotionTier";
import {
  applyMotionTier,
  detectMotionTier,
  NARROW_VIEWPORT_PX,
  readMotionPreference,
  writeMotionPreference,
  type MotionPreference,
  type MotionTier
} from "@/lib/motion-tier";

/**
 * Owns the live motion tier.
 *
 * The `<html data-motion>` attribute is written by the inline boot script
 * before first paint, so CSS is already correct. This provider only keeps
 * React in sync (for 3D mounting, rAF loops and the Settings toggle) and
 * re-resolves when the user changes the preference, the viewport crosses the
 * narrow breakpoint, or the OS reduced-motion setting changes.
 */
export function MotionTierProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<MotionPreference>("auto");
  const [tier, setTier] = useState<MotionTier>("reduced");
  const [isNarrow, setIsNarrow] = useState(true);
  const mountedRef = useRef(false);

  const resolve = useCallback((nextPreference: MotionPreference) => {
    const next = detectMotionTier(nextPreference);
    applyMotionTier(next);
    setTier(next);
    return next;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const stored = readMotionPreference();
    setPreferenceState(stored);
    setIsNarrow(window.innerWidth < NARROW_VIEWPORT_PX);
    resolve(stored);

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMediaChange = () => resolve(readMotionPreference());
    mediaQuery.addEventListener("change", onMediaChange);

    let frame = 0;
    const onResize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (!mountedRef.current) return;
        setIsNarrow(window.innerWidth < NARROW_VIEWPORT_PX);
        resolve(readMotionPreference());
      });
    };
    window.addEventListener("resize", onResize);

    return () => {
      mountedRef.current = false;
      window.cancelAnimationFrame(frame);
      mediaQuery.removeEventListener("change", onMediaChange);
      window.removeEventListener("resize", onResize);
    };
  }, [resolve]);

  const setPreference = useCallback(
    (next: MotionPreference) => {
      setPreferenceState(next);
      writeMotionPreference(next);
      resolve(next);
    },
    [resolve]
  );

  const value = useMemo<MotionTierValue>(
    () => ({
      tier,
      preference,
      setPreference,
      canRender3D: tier === "full" && !isNarrow
    }),
    [tier, preference, setPreference, isNarrow]
  );

  /*
   * `domAnimation` is loaded synchronously so press and hover feedback is
   * instant — never gated behind a network request. `strict` makes framer
   * throw if any `motion.*` component sneaks back in: everything under here
   * must use the tree-shakeable `m.*` component.
   *
   * `drag` and `layout` are deliberately NOT in this bundle. They are only
   * needed inside the study workspace, which loads `domMax` for its own
   * subtree — so the landing page never pays for them.
   */
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionTierContext.Provider value={value}>{children}</MotionTierContext.Provider>
    </LazyMotion>
  );
}
