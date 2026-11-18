"use client";

import * as React from "react";
import { MAX_FRAME_DELTA, updateLoaderProgress } from "@/components/landing/loaderProgress";

/**
 * The loading sequence, as a state machine.
 *
 *     loading  → the bar creeps to 92% while the scene is built
 *     leaving  → the bar hit 100, the overlay fades for 900 ms
 *     done     → the overlay is gone and the hero entrance runs
 *
 * Three rules it will not break:
 *
 *   1. It never waits for something that will not happen. `worldReady` is set
 *      by the scene when it paints its first frame *and* by the parent when
 *      WebGL fails, so the fallback world is a destination, not a hang.
 *   2. It never holds the page hostage. A hard timeout declares readiness, so a
 *      slow chunk download degrades into a slightly longer wait and then the
 *      page works.
 *   3. It reports a real number. Every frame is `updateLoaderProgress`, which is
 *      the value the bar and the percentage both read.
 *
 * `readyRef` is a ref rather than a dependency so flipping readiness cannot
 * restart the animation loop mid-count.
 */

export type LoaderState = "loading" | "leaving" | "done";

/** Matches the 900 ms opacity transition on the overlay. */
const LEAVE_DURATION_MS = 900;

/** After this, the page enters whether or not the scene said it was ready. */
const READY_TIMEOUT_MS = 7000;

export function useExperienceLoader(worldReady: boolean): {
  state: LoaderState;
  progress: number;
} {
  const [state, setState] = React.useState<LoaderState>("loading");
  const [progress, setProgress] = React.useState(0);
  const valueRef = React.useRef(0);
  const readyRef = React.useRef(false);

  React.useEffect(() => {
    if (worldReady) readyRef.current = true;
  }, [worldReady]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      readyRef.current = true;
    }, READY_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (state !== "loading") return;

    let frame = 0;
    let last = performance.now();

    const tick = () => {
      const now = performance.now();
      const delta = Math.min((now - last) / 1000, MAX_FRAME_DELTA);
      last = now;

      valueRef.current = updateLoaderProgress(valueRef.current, readyRef.current, delta);

      const rounded = Math.round(valueRef.current);
      setProgress((previous) => (previous === rounded ? previous : rounded));

      if (valueRef.current >= 100) {
        setState("leaving");
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [state]);

  React.useEffect(() => {
    if (state !== "leaving") return;

    const timer = window.setTimeout(() => setState("done"), LEAVE_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [state]);

  return { state, progress };
}
