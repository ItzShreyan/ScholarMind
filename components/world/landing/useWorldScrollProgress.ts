"use client";

import { useEffect, useRef } from "react";
import { MAX_WORLD_PROGRESS } from "@/components/world/landing/worldTypes";

/**
 * Converts page scroll into the scene's 0–5 timeline.
 *
 * The naive version (`scrollY / innerHeight`) assumes every stage is exactly one
 * viewport tall. It breaks the moment a section grows — a product panel pushing
 * the library section to 1.4 viewports makes the camera arrive at the
 * observatory while the visitor is still reading about the library.
 *
 * So instead this measures the real sections. Each one carries
 * `data-world-stage="0…5"`; the hook caches their document offsets and turns the
 * viewport centre into a continuous index. A section that is taller than the
 * viewport simply takes longer to cross, which is the correct behaviour.
 *
 * Updates are requestAnimationFrame-throttled and the callback is held in a ref,
 * so an inline arrow in the consumer never re-subscribes the listener.
 */
export function useWorldScrollProgress(onProgress: (progress: number) => void) {
  const callbackRef = useRef(onProgress);

  useEffect(() => {
    callbackRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let frame = 0;
    let offsets: Array<{ index: number; top: number; height: number }> = [];
    let lastScrollY = -1;

    /** Reads every stage section's absolute position. Called on resize only. */
    const measure = () => {
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>("[data-world-stage]")
      );

      offsets = sections
        .map((element) => {
          const index = Number(element.dataset.worldStage);
          if (!Number.isFinite(index)) return null;

          const rect = element.getBoundingClientRect();
          const top = rect.top + window.scrollY;

          return { index, top, height: Math.max(1, rect.height) };
        })
        .filter((entry): entry is { index: number; top: number; height: number } => entry !== null)
        .sort((a, b) => a.top - b.top);
    };

    const compute = () => {
      frame = 0;

      if (offsets.length === 0) {
        // Before measurement (or if the attribute is ever missing) fall back to
        // the uniform-height assumption so the scene still moves.
        const viewportHeight = window.innerHeight || 1;
        const fallback = Math.max(
          0,
          Math.min(MAX_WORLD_PROGRESS, window.scrollY / viewportHeight)
        );
        callbackRef.current(fallback);
        return;
      }

      const centre = window.scrollY + window.innerHeight / 2;

      let progress = offsets[0].index;

      if (centre >= offsets[offsets.length - 1].top + offsets[offsets.length - 1].height) {
        progress = offsets[offsets.length - 1].index;
      } else if (centre > offsets[0].top) {
        for (let index = 0; index < offsets.length - 1; index += 1) {
          const current = offsets[index];
          const next = offsets[index + 1];

          if (centre >= current.top && centre < next.top) {
            const localT = (centre - current.top) / Math.max(1, next.top - current.top);
            progress = current.index + localT * (next.index - current.index);
            break;
          }
        }
      }

      callbackRef.current(
        Math.max(0, Math.min(MAX_WORLD_PROGRESS, progress))
      );
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(compute);
    };

    const onScroll = () => {
      // Nothing moved (e.g. a scroll event fired by a layout change): skip.
      if (window.scrollY === lastScrollY) {
        schedule();
        return;
      }

      lastScrollY = window.scrollY;
      schedule();
    };

    const onResize = () => {
      measure();
      schedule();
    };

    measure();
    schedule();
    lastScrollY = window.scrollY;

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });

    // Web fonts and lazy images change section heights after first paint.
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            measure();
            schedule();
          })
        : null;

    resizeObserver?.observe(document.body);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      resizeObserver?.disconnect();

      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
