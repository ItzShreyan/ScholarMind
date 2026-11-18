"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Compass, Layers, RotateCcw, Sparkles, X } from "lucide-react";
import { SPACE_ACCENT_VAR, WORLD_SPACES } from "@/components/world/worldSpaces";

/**
 * The world controls.
 *
 * One small trigger in the bottom-right gutter, and a panel behind it. That is
 * deliberate: the previous version laid Places, Reset view and Motion out as a permanent
 * 300-pixel bar, which — on a laptop-height viewport — sat directly on top of
 * the copy column it was floating over. A single 100-pixel pill is small enough
 * to read as a tool rather than as part of the page.
 *
 * What the panel contains:
 *
 *   Places      a plain list of the five destinations. This is the accessible
 *               alternative to the canvas — every place the 3D world shows is
 *               also a real link here, with a real label, whether or not WebGL
 *               ever painted a frame. It is the only building navigation on a
 *               phone, which is why the trigger is not hidden at small widths.
 *   Reset view  returns the camera and the page to the opening shot.
 *   Motion      switches the world's animation off without touching the OS
 *               preference, and remembers the choice for the visit.
 *
 * `data-native-scroll` on the panel keeps the smooth-scroll controller from
 * swallowing wheel events inside it.
 */

type ExperienceControlsProps = {
  /** True once the page is in the ivory editorial half. */
  light: boolean;
  /** Scroll back to the opening composition. */
  onResetView: () => void;
  motionReduced: boolean;
  onToggleMotion: () => void;
};

export function ExperienceControls({
  light,
  onResetView,
  motionReduced,
  onToggleMotion
}: ExperienceControlsProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  // Escape closes the panel; a click outside closes it too. Both are expected
  // of anything that behaves like a popover, and neither is a focus trap
  // because the panel is a disclosure, not a modal.
  React.useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const shell = light
    ? "border-[color:var(--editorial-border)] bg-[color:var(--editorial-bg-raise)]/95 text-[color:var(--editorial-fg)] backdrop-blur-md"
    : "border-[rgba(243,240,233,0.16)] bg-[rgba(8,13,18,0.82)] text-[color:var(--text-1)] backdrop-blur-md";

  const quietButton = light
    ? "hover:border-[color:var(--editorial-accent)] hover:text-[color:var(--editorial-accent)]"
    : "hover:border-[rgba(233,206,154,0.55)] hover:text-[color:var(--accent-gold)]";

  const rule = light ? "border-[color:var(--editorial-border)]" : "border-[color:var(--surface-border)]";
  const muted = light ? "text-[color:var(--editorial-muted)]" : "text-[color:var(--text-3)]";

  // Bottom-right, not bottom-left. The copy column on every dark section is
  // left-aligned, and a fixed pill in that corner landed on the last bullet of
  // the list on any viewport shorter than the section — the text sat under a
  // control. The right-hand gutter is empty once the journey rail has finished,
  // and the rail itself is vertically centred, so nothing collides here.
  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed bottom-4 right-4 z-30 sm:bottom-5 sm:right-5"
    >
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        {open ? (
          <div
            id="world-places-panel"
            data-native-scroll
            className={`w-[18.5rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[var(--radius-lg)] border shadow-[0_24px_60px_rgba(3,8,12,0.5)] ${shell}`}
          >
            <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${rule}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${muted}`}>
                Places in the world
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close places list"
                className={`inline-flex h-7 w-7 items-center justify-center rounded-pill border border-transparent transition-colors duration-150 ${quietButton}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <ul>
              {WORLD_SPACES.map((space) => (
                <li key={space.id}>
                  <Link
                    href={space.href}
                    className={`group flex items-start gap-3 border-b px-4 py-2.5 transition-colors duration-150 last:border-b-0 ${rule} ${
                      light
                        ? "hover:bg-[color:var(--editorial-bg-soft)]/70"
                        : "hover:bg-[rgba(243,240,233,0.05)]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background: SPACE_ACCENT_VAR[space.accent],
                        boxShadow: `0 0 8px ${SPACE_ACCENT_VAR[space.accent]}`
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-semibold">{space.label}</span>
                        <ArrowUpRight
                          className={`h-3 w-3 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${muted}`}
                          aria-hidden="true"
                        />
                      </span>
                      <span className={`mt-0.5 block text-[11px] leading-5 ${muted}`}>
                        {space.purpose}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className={`flex items-center gap-1 border-t p-1.5 ${rule}`}>
              <button
                type="button"
                onClick={onResetView}
                className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-pill border border-transparent px-2 text-[11px] font-semibold transition-colors duration-150 ${quietButton}`}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset view
              </button>

              <button
                type="button"
                onClick={onToggleMotion}
                aria-pressed={motionReduced}
                className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-pill border border-transparent px-2 text-[11px] font-semibold transition-colors duration-150 ${quietButton}`}
              >
                {motionReduced ? (
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {motionReduced ? "Motion off" : "Motion on"}
              </button>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="world-places-panel"
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-pill border px-3.5 text-[11px] font-semibold shadow-[0_12px_32px_rgba(3,8,12,0.36)] transition-colors duration-150 ${shell} ${quietButton}`}
        >
          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
          World
        </button>
      </div>
    </div>
  );
}
