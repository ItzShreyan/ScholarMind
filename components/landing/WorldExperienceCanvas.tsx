"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LearningWorldLandingScene } from "@/components/world/landing/LearningWorldLandingScene";
import { supportsWebGL } from "@/components/world/landing/worldPerformance";
import { useWorldPointer } from "@/components/world/landing/useWorldPointer";

/**
 * The canvas, and nothing else.
 *
 * This module is the only place that imports three.js, and it is loaded through
 * `next/dynamic` with `ssr: false`, so the library never enters the initial
 * bundle and never runs on the server.
 *
 * React does not drive the animation. The parent pushes a scroll progress value
 * in through the imperative handle (from a rAF-throttled scroll listener), and
 * the scene writes label positions straight onto the DOM. That is the whole
 * reason the page can scroll at 60 fps with a WebGL scene behind it: there is
 * no state update per frame anywhere in this component.
 *
 * The building labels are real anchors to real routes. They are projected onto
 * the 3D anchors by the scene, but they remain ordinary links: tabbable, with
 * visible focus, and readable by a screen reader whether or not the canvas ever
 * paints.
 */

export type WorldCanvasHandle = {
  setProgress: (progress: number) => void;
  setActive: (active: boolean) => void;
  setReducedMotion: (reduced: boolean) => void;
  startEntrance: () => void;
};

type LandmarkLabel = {
  id: "hub" | "library" | "observatory" | "practice" | "garden";
  name: string;
  tagline: string;
  href: string;
  accent: string;
};

const LABELS: readonly LandmarkLabel[] = [
  {
    id: "library",
    name: "Library",
    tagline: "Your notes and resources",
    href: "/studio",
    accent: "var(--accent-gold)"
  },
  {
    id: "observatory",
    name: "Observatory",
    tagline: "Understand concepts",
    href: "/ai-study-assistant",
    accent: "var(--accent-sky)"
  },
  {
    id: "practice",
    name: "Practice hall",
    tagline: "Test your knowledge",
    href: "/quiz-maker",
    accent: "var(--accent-mint)"
  },
  {
    id: "garden",
    name: "Revision garden",
    tagline: "Build lasting recall",
    href: "/revision-planner",
    accent: "var(--accent-mint)"
  },
  {
    id: "hub",
    name: "Learning hub",
    tagline: "Your study space",
    href: "/dashboard",
    accent: "var(--accent-coral)"
  }
];

type WorldExperienceCanvasProps = {
  onReady: () => void;
  onFailure: (reason: string) => void;
};

export const WorldExperienceCanvas = React.forwardRef<WorldCanvasHandle, WorldExperienceCanvasProps>(
  function WorldExperienceCanvas({ onReady, onFailure }, ref) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const sceneRef = React.useRef<LearningWorldLandingScene | null>(null);
    const labelRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
    /** Progress arriving before the scene exists is not lost. */
    const pendingProgress = React.useRef(0);

    useWorldPointer(true);

    React.useImperativeHandle(
      ref,
      () => ({
        setProgress(progress: number) {
          pendingProgress.current = progress;
          sceneRef.current?.setProgress(progress);
        },
        setActive(active: boolean) {
          const scene = sceneRef.current;
          if (!scene) return;
          if (active) scene.start();
          else scene.stop();
        },
        setReducedMotion(reduced: boolean) {
          sceneRef.current?.setReducedMotion(reduced);
        },
        startEntrance() {
          sceneRef.current?.startEntrance();
        }
      }),
      []
    );

    React.useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      if (!supportsWebGL()) {
        onFailure("This device cannot display the 3D world.");
        return;
      }

      let scene: LearningWorldLandingScene;

      try {
        scene = new LearningWorldLandingScene(canvas, container, { onReady, onFailure });
      } catch (error) {
        onFailure(error instanceof Error ? error.message : "The world could not start.");
        return;
      }

      sceneRef.current = scene;
      scene.setProgress(pendingProgress.current);

      // Labels are registered before the first frame so nothing flickers in the
      // top-left corner for one paint.
      LABELS.forEach((label) => {
        scene.registerLabel(label.id, labelRefs.current[label.id] ?? null);
      });

      scene.start();

      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      const onMotionChange = () => scene.setReducedMotion(media.matches);
      media.addEventListener("change", onMotionChange);

      return () => {
        media.removeEventListener("change", onMotionChange);
        scene.dispose();
        sceneRef.current = null;
      };
      // `onReady`/`onFailure` are stable callbacks from the parent.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div ref={containerRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          aria-hidden="true"
          role="presentation"
        />

        {/* Projected building labels. Positioned and faded by the scene. */}
        <div className="pointer-events-none absolute inset-0">
          {LABELS.map((label) => (
            <div
              key={label.id}
              ref={(element) => {
                labelRefs.current[label.id] = element;
                sceneRef.current?.registerLabel(label.id, element);
              }}
              className="absolute left-0 top-0 will-change-transform"
              style={{ opacity: 0, pointerEvents: "none" }}
            >
              <Link
                href={label.href}
                className="group inline-flex items-center gap-2 whitespace-nowrap rounded-pill border border-[rgba(243,240,233,0.16)] bg-[rgba(8,13,18,0.74)] px-3 py-1.5 backdrop-blur-sm transition-colors duration-150 hover:border-[rgba(233,206,154,0.6)] hover:bg-[rgba(8,13,18,0.92)]"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: label.accent, boxShadow: `0 0 8px ${label.accent}` }}
                />
                <span className="flex flex-col leading-tight">
                  <span className="text-[11px] font-semibold text-[color:var(--text-1)]">
                    {label.name}
                  </span>
                  <span className="text-[9px] text-[color:var(--text-3)]">{label.tagline}</span>
                </span>
                <ArrowUpRight
                  className="h-3 w-3 shrink-0 text-[color:var(--text-3)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
