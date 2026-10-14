"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, List, Lock, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useMotionTier } from "@/hooks/useMotionTier";
import { usePreferredView } from "@/hooks/useWorldView";
import { WorldScene, type WorldFocus } from "@/components/world/WorldScene";
import { WorldFallback } from "@/components/world/WorldFallback";
import {
  SPACE_ACCENT_VAR,
  WORLD_SPACES,
  getWorldSpace,
  type WorldSpaceId
} from "@/components/world/worldSpaces";

/** Cheap, synchronous WebGL availability probe. Never throws. */
function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = document.createElement("canvas");
    const context =
      probe.getContext("webgl2") ??
      probe.getContext("webgl") ??
      probe.getContext("experimental-webgl");
    return Boolean(context);
  } catch {
    return false;
  }
}

/**
 * The explorable learning world.
 *
 * Three states, all of them complete:
 *   1. the interactive campus (wide screen, capable device, WebGL present)
 *   2. a CSS poster — the same stage, before we know whether 1 or 3 applies
 *   3. the plain list of the very same five destinations
 *
 * The list is always one click away via the view toggle, and is what a narrow
 * phone, a reduced-motion visitor or a device without WebGL gets by default.
 */
export function LearningWorld({
  onExplore,
  className = ""
}: {
  /** Optional: called when the visitor chooses to enter the product. */
  onExplore?: () => void;
  className?: string;
}) {
  const { canRender3D } = useMotionTier();
  const { view, setView } = usePreferredView();

  const [mounted, setMounted] = useState(false);
  const [webglOk, setWebglOk] = useState(true);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [selected, setSelected] = useState<WorldSpaceId | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<WorldScene | null>(null);
  const hotspotWrappers = useRef<Record<string, HTMLDivElement | null>>({});

  const wantsWorld = view === "world" && canRender3D && webglOk && !failure;

  useEffect(() => {
    setMounted(true);
    setWebglOk(supportsWebGL());
  }, []);

  /* ------------------------------------------------------------------ */
  /* Scene lifecycle                                                     */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!mounted || !wantsWorld) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let scene: WorldScene;
    try {
      scene = new WorldScene(canvas, {
        onReady: () => setReady(true),
        onFailure: (reason) => setFailure(reason)
      });
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "The world could not start.");
      return;
    }

    sceneRef.current = scene;

    /*
     * Labels are driven by the scene, not by React state, so orbiting the
     * world does not trigger a single re-render.
     */
    Object.entries(hotspotWrappers.current).forEach(([id, element]) => {
      scene.registerHotspot(id, element);
    });

    scene.start();

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => scene.resize()) : null;
    if (observer && stageRef.current) observer.observe(stageRef.current);

    const handleResize = () => scene.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", handleResize);
      scene.dispose();
      sceneRef.current = null;
      setReady(false);
    };
  }, [mounted, wantsWorld]);

  /**
   * Focus is driven by one setter for every input path — pointer, keyboard focus
   * and the list buttons — so the camera can never disagree with the selection.
   */
  const selectSpace = useCallback((id: WorldSpaceId | null) => {
    setSelected(id);
    sceneRef.current?.focus(id as WorldFocus);
  }, []);

  const selectedSpace = selected ? getWorldSpace(selected) : null;
  const showWorld = mounted && wantsWorld;

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label text-[color:var(--accent-coral)]">The learning world</p>
          <p className="mt-1.5 text-sm text-[color:var(--text-3)]">
            {showWorld
              ? "Drag to look around, scroll to zoom, and open a space to start studying."
              : "Five spaces, five real parts of ScholarMind."}
          </p>
        </div>

        {mounted && canRender3D && webglOk && !failure ? (
          <div
            role="radiogroup"
            aria-label="World view"
            className="inline-flex rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-1"
          >
            {[
              { value: "world" as const, label: "World", Icon: Compass },
              { value: "list" as const, label: "List", Icon: List }
            ].map(({ value, label, Icon }) => {
              const active = view === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setView(value)}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors duration-150 sm:min-h-9 ${
                    active
                      ? "bg-[color:var(--surface-3)] text-[color:var(--accent-gold)]"
                      : "text-[color:var(--text-3)] hover:text-[color:var(--text-1)]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {showWorld ? (
        <div
          ref={stageRef}
          className="world-stage relative overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--surface-border)]"
          style={{ height: "clamp(360px, 56vh, 560px)" }}
        >
          <canvas
            ref={canvasRef}
            className="world-canvas"
            tabIndex={0}
            aria-label="Interactive map of the ScholarMind learning world. Drag or use the arrow keys to look around. Every space has a labelled button, and the same destinations are listed below the map."
          />

          {/* Hotspot labels: real buttons, moved by the scene each frame. */}
          <div className="pointer-events-none absolute inset-0">
            {WORLD_SPACES.map((space) => (
              <div
                key={space.id}
                ref={(element) => {
                  hotspotWrappers.current[space.id] = element;
                  sceneRef.current?.registerHotspot(space.id, element);
                }}
                className="absolute left-0 top-0 will-change-transform"
                style={{ opacity: 0 }}
              >
                <button
                  type="button"
                  className="world-hotspot pointer-events-auto"
                  data-active={selected === space.id}
                  aria-pressed={selected === space.id}
                  onClick={() => selectSpace(space.id)}
                  onFocus={() => selectSpace(space.id)}
                >
                  <span className="world-hotspot-ring" aria-hidden="true" />
                  <span className="world-hotspot-dot" aria-hidden="true" />
                  {space.label}
                </button>
              </div>
            ))}
          </div>

          {selected ? (
            <button
              type="button"
              onClick={() => selectSpace(null)}
              className="absolute left-4 top-4 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[color:var(--surface-border)] bg-[rgba(8,13,18,0.82)] px-3 text-xs font-semibold text-[color:var(--text-1)] transition-colors duration-150 hover:border-[color:var(--accent-coral)]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Overview
            </button>
          ) : null}

          {selectedSpace ? (
            <div className="absolute inset-x-3 bottom-3 rounded-[var(--radius-lg)] border border-[color:var(--surface-border)] bg-[rgba(8,13,18,0.9)] p-4 backdrop-blur-sm sm:inset-x-4 sm:bottom-4 sm:max-w-md">
              <div className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: SPACE_ACCENT_VAR[selectedSpace.accent] }}
                />
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold text-[color:var(--text-1)]">
                    {selectedSpace.label}
                  </h3>
                  <p className="mt-1 text-xs leading-6 text-[color:var(--text-2)]">
                    {selectedSpace.detail}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href={selectedSpace.href}
                  onClick={onExplore}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,var(--accent-gold),var(--accent-coral))] px-4 text-xs font-semibold text-[#1a1208] transition-transform duration-150 hover:scale-[1.02]"
                >
                  Open {selectedSpace.destination}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>

                {selectedSpace.requiresAuth ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--text-3)]">
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    Sign in required
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* First-frame affordance. Removed as soon as the world paints. */}
          {!ready ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[rgba(8,13,18,0.7)] px-4 py-2 text-xs text-[color:var(--text-3)]">
                <Sparkles className="h-3.5 w-3.5 text-[color:var(--accent-coral)]" aria-hidden="true" />
                Building the learning world…
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[var(--radius-xl)] border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-4 sm:p-6">
          {mounted && !webglOk ? (
            <p className="mb-4 text-xs text-[color:var(--text-3)]">
              This device cannot display the 3D world, so here is the same set of destinations.
            </p>
          ) : null}
          {failure ? (
            <p className="mb-4 text-xs text-[color:var(--text-3)]">
              The world stopped ({failure}). The destinations below are unaffected.
            </p>
          ) : null}
          <WorldFallback />
        </div>
      )}

      {/*
       * The destinations are always exposed as links for assistive technology,
       * even while the world is showing, so nothing is reachable only through a
       * canvas.
       */}
      {showWorld ? (
        <ul className="sr-only">
          {WORLD_SPACES.map((space) => (
            <li key={space.id}>
              <Link href={space.href}>
                {space.label} — {space.purpose} — opens {space.destination}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {showWorld ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {WORLD_SPACES.map((space) => (
            <Button
              key={space.id}
              type="button"
              size="sm"
              variant={selected === space.id ? "primary" : "secondary"}
              onClick={() => selectSpace(space.id)}
            >
              {space.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
