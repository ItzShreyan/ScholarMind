"use client";

import { WORLD_BACKGROUNDS } from "@/components/world/landing/worldTypes";

/**
 * The page background: five gradient layers, one visible at a time, cross-fading
 * on a CSS opacity transition.
 *
 * Not one gradient interpolated in JavaScript — browsers cannot transition
 * between gradient images, and writing a new `background` every frame is the
 * most expensive thing a landing page can do. Opacity is composited on the GPU
 * for free.
 *
 * The palettes are imported from the renderer's own module rather than copied,
 * so the DOM background and the scene fog cannot drift apart. The last layer is
 * ivory: the point where the page deliberately leaves the world and becomes an
 * editorial product.
 */
export function WorldBackdrop({ stage }: { stage: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      {WORLD_BACKGROUNDS.map((palette, index) => (
        <div
          key={palette.name}
          className="absolute inset-0 transition-opacity duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            opacity: index === stage ? 1 : 0,
            background: `linear-gradient(180deg, ${palette.top} 0%, ${palette.middle} 54%, ${palette.bottom} 100%)`
          }}
        />
      ))}
    </div>
  );
}
