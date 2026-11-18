"use client";

import { useEffect } from "react";
import { worldPointer } from "@/components/world/landing/worldTypes";

/**
 * One set of global pointer listeners, shared by every layer of the scene.
 *
 * The listeners are attached to `window` rather than the canvas on purpose: the
 * world is a full-viewport background, and the labels, headings and product
 * panels sit on top of it. Tracking the pointer at window level means moving
 * across a heading still ripples the particles behind it, which is what makes
 * the world feel like it is underneath the page rather than a video in a box.
 *
 * The hook is idempotent — it attaches in a `useEffect` with no dependencies and
 * removes everything on unmount, so a remount cannot double up the handlers.
 */
export function useWorldPointer(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    let lastX = worldPointer.x;
    let lastY = worldPointer.y;
    let lastTime = performance.now();
    let settleTimer = 0;

    const onPointerMove = (event: PointerEvent) => {
      const nextX = (event.clientX / window.innerWidth) * 2 - 1;
      const nextY = -(event.clientY / window.innerHeight) * 2 + 1;

      // Touch has no hover state. Tracking a finger drag would make the world
      // jump around while the visitor is trying to scroll.
      if (event.pointerType === "touch") {
        worldPointer.active = false;
        return;
      }

      const now = performance.now();
      const elapsed = Math.max(1, now - lastTime) / 1000;
      const distance = Math.hypot(nextX - lastX, nextY - lastY);

      // Smoothed velocity, clamped. Fed into the repulsion boost so a fast
      // sweep through a cluster pushes harder than a slow one.
      worldPointer.speed = Math.min(3, worldPointer.speed * 0.7 + (distance / elapsed) * 0.3);

      worldPointer.x = nextX;
      worldPointer.y = nextY;
      worldPointer.active = true;

      lastX = nextX;
      lastY = nextY;
      lastTime = now;

      // Decay the velocity when the pointer stops rather than freezing it high.
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        worldPointer.speed = 0;
      }, 120);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      worldPointer.isDown = true;
    };

    const onPointerUp = () => {
      worldPointer.isDown = false;
    };

    const onPointerLeave = () => {
      worldPointer.active = false;
      worldPointer.isDown = false;
      worldPointer.speed = 0;
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        worldPointer.isDown = false;
        worldPointer.speed = 0;
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled]);
}
