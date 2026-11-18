"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { ExperienceHeader } from "@/components/landing/ExperienceHeader";
import { ExperienceLoader } from "@/components/landing/ExperienceLoader";
import { ExperienceHero } from "@/components/landing/ExperienceHero";
import { ExperienceFooter } from "@/components/landing/ExperienceFooter";
import { ExperienceControls } from "@/components/landing/ExperienceControls";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import { WorldBackdrop } from "@/components/landing/WorldBackdrop";
import { WorldPoster } from "@/components/landing/WorldPoster";
import { LibrarySection } from "@/components/landing/sections/LibrarySection";
import { ObservatorySection } from "@/components/landing/sections/ObservatorySection";
import { PracticeSection } from "@/components/landing/sections/PracticeSection";
import { KnowledgeSection } from "@/components/landing/sections/KnowledgeSection";
import { HowItWorksSection } from "@/components/landing/sections/HowItWorksSection";
import { FinalSection } from "@/components/landing/sections/FinalSection";
import { createSmoothScroll, type SmoothScrollController } from "@/components/landing/smoothScroll";
import { useExperienceLoader } from "@/components/landing/useExperienceLoader";
import { STAGE_ORDER, type StageId } from "@/components/landing/experienceContent";
import { useMotionTier } from "@/hooks/useMotionTier";
import { useWorldScrollProgress } from "@/components/world/landing/useWorldScrollProgress";
import {
  MAX_WORLD_PROGRESS,
  getBackgroundStage
} from "@/components/world/landing/worldTypes";
import type { WorldCanvasHandle } from "@/components/landing/WorldExperienceCanvas";

/**
 * The experience.
 *
 * This module owns the whole landing page; nothing else draws anything. It is
 * the single place where four independent timelines are kept in agreement:
 *
 *   page scroll      → `useWorldScrollProgress` (rAF-throttled, section-aware)
 *   the 3D camera    → pushed imperatively into the scene handle
 *   the page's light → a background stage, cross-faded by `WorldBackdrop`
 *   the interface    → a header that flips to ivory, a rail, and reveals
 *
 * Deliberate choices worth knowing before editing:
 *
 * - **No scroll progress in React state.** The value lives in a ref and goes
 *   straight to the renderer. Only the cheap, discontinuous facts (which
 *   background, which stage is active, whether the header is light) become
 *   state, so scrolling never re-renders the tree per frame.
 * - **The canvas is one fixed layer behind the page**, not one canvas per
 *   section. That is what makes the journey continuous: the camera never
 *   restarts, so there is no cut between stages.
 * - **The scene is mounted once and never remounted.** The loader gates the
 *   entrance, not the construction.
 * - **`next/dynamic` exists for the bundle, not for a spinner.** three.js is
 *   several hundred kilobytes; it must not be in the first chunk.
 */

const WorldSceneLayer = dynamic(() => import("@/components/landing/WorldSceneLayer"), {
  ssr: false,
  loading: () => null
});

/** Stage → the DOM section that owns it. `hero` is the `#world` section. */
const STAGE_SECTION_ID: Record<StageId, string> = {
  hero: "world",
  library: "library",
  observatory: "observatory",
  practice: "practice",
  constellation: "constellation",
  hub: "hub"
};

/** Progress at which the page has meaningfully turned ivory. */
const IVORY_THRESHOLD = 3.85;

/** The world is only worth drawing while it can actually be seen. */
const WORLD_VISIBLE_UNTIL = 4.6;

export function ScholarMindExperience() {
  const { tier, setPreference } = useMotionTier();

  const [stage, setStage] = React.useState(0);
  const [activeStage, setActiveStage] = React.useState<StageId>("hero");
  const [railProgress, setRailProgress] = React.useState(0);
  const [light, setLight] = React.useState(false);
  const [worldReady, setWorldReady] = React.useState(false);
  const [sceneFailed, setSceneFailed] = React.useState(false);

  const handleRef = React.useRef<WorldCanvasHandle | null>(null);
  const scrollRef = React.useRef<SmoothScrollController | null>(null);
  const progressRef = React.useRef(0);
  const worldRunningRef = React.useRef(true);

  const loader = useExperienceLoader(worldReady);
  const entered = loader.state !== "loading";
  const motionReduced = tier !== "full";

  /* ---------------------------------------------------------------------- */
  /* Scroll → the world                                                      */
  /* ---------------------------------------------------------------------- */

  useWorldScrollProgress(
    React.useCallback((value: number) => {
      progressRef.current = value;
      handleRef.current?.setProgress(value);

      // Background: five opaque gradient layers cross-faded on opacity. Only a
      // change of layer is a state update, so this costs almost nothing.
      const nextStage = getBackgroundStage(value);
      setStage((previous) => (previous === nextStage ? previous : nextStage));

      // Rail: bucketed at 5% so the fill looks continuous but re-renders about
      // a hundred times across the whole page instead of sixty times a second.
      setRailProgress((previous) =>
        Math.round(previous * 20) === Math.round(value * 20) ? previous : value
      );

      // Active stage: the section the viewport centre is nearest to.
      const index = Math.max(0, Math.min(MAX_WORLD_PROGRESS, Math.round(value)));
      const nextActive = STAGE_ORDER[index];
      setActiveStage((previous) => (previous === nextActive ? previous : nextActive));

      const nextLight = value >= IVORY_THRESHOLD;
      setLight((previous) => (previous === nextLight ? previous : nextLight));

      // Stop drawing once the campus is covered by the ivory sections.
      const shouldRun = value < WORLD_VISIBLE_UNTIL;
      if (shouldRun !== worldRunningRef.current) {
        worldRunningRef.current = shouldRun;
        handleRef.current?.setActive(shouldRun);
      }
    }, [])
  );

  /* ---------------------------------------------------------------------- */
  /* Weighted scrolling                                                      */
  /* ---------------------------------------------------------------------- */

  React.useEffect(() => {
    const controller = createSmoothScroll();
    scrollRef.current = controller;

    // `globals.css` sets `scroll-behavior: smooth` for anchor links. That makes
    // every programmatic `scrollTo` animate on its own, which fights the easing
    // loop frame against frame and produces a stutter instead of weight. While
    // the controller is alive it owns the scroll position outright; anchors go
    // through `scrollToSection`, which asks the controller directly.
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    return () => {
      root.style.scrollBehavior = previousBehavior;
      controller.destroy();
      scrollRef.current = null;
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Reduced motion                                                          */
  /* ---------------------------------------------------------------------- */

  React.useEffect(() => {
    handleRef.current?.setReducedMotion(motionReduced);
  }, [motionReduced]);

  /* ---------------------------------------------------------------------- */
  /* Entrance                                                                */
  /* ---------------------------------------------------------------------- */

  React.useEffect(() => {
    if (loader.state !== "leaving") return;
    handleRef.current?.startEntrance();
  }, [loader.state]);

  /* ---------------------------------------------------------------------- */
  /* Navigation                                                              */
  /* ---------------------------------------------------------------------- */

  const scrollToSection = React.useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (!element) return;

    const top = element.getBoundingClientRect().top + window.scrollY;

    if (scrollRef.current) scrollRef.current.scrollTo(top);
    else window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const handleNavigate = React.useCallback(
    (sectionId: string) => scrollToSection(sectionId),
    [scrollToSection]
  );

  const handleSelectStage = React.useCallback(
    (next: StageId) => scrollToSection(STAGE_SECTION_ID[next]),
    [scrollToSection]
  );

  const handleResetView = React.useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleToggleMotion = React.useCallback(() => {
    // `auto` re-detects device capability; on a phone that resolves back to
    // `reduced`, which is the honest answer rather than a promise it cannot keep.
    setPreference(motionReduced ? "auto" : "reduced");
  }, [motionReduced, setPreference]);

  const handleWorldReady = React.useCallback(() => setWorldReady(true), []);

  const handleWorldFailure = React.useCallback(() => {
    setSceneFailed(true);
    // The poster is a valid destination, so the loader must not wait for a
    // renderer that will never arrive.
    setWorldReady(true);
  }, []);

  const showScene = !sceneFailed && tier !== "off";

  /**
   * With no canvas mounted there is nothing left to wait for, so the poster *is*
   * the world and the page should start immediately.
   *
   * Without this, a visitor who asked their operating system for reduced motion
   * sat on a 92% bar for seven seconds — the loader blocking a page that had
   * nothing to load. The readiness timeout made it survivable, not correct.
   */
  React.useEffect(() => {
    if (!showScene) setWorldReady(true);
  }, [showScene]);

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="relative">
      <WorldBackdrop stage={stage} />

      {/*
        The world layer. Fixed, behind everything, and only mounted on a device
        that can draw it. When the scene has failed or motion is off, the same
        layer renders the static poster instead — the page is identical either
        way, only the background stops moving.
      */}
      <div className="pointer-events-none fixed inset-0 -z-[5]" aria-hidden="true">
        {showScene ? (
          <WorldSceneLayer
            handleRef={handleRef}
            onReady={handleWorldReady}
            onFailure={handleWorldFailure}
          />
        ) : (
          <WorldPoster dim />
        )}
      </div>

      {/*
        The page's vertical light — one fixed layer for the whole dark run.

        Every section used to darken its own top and bottom edge, which meant the
        bottom of one section and the top of the next had to agree on an opacity.
        They never did, and the disagreement drew a horizontal line across the
        campus at each boundary. One layer that never scrolls cannot seam against
        itself; sections now only contribute a horizontal wash.

        It fades out as the page turns ivory, so the editorial half is untouched.
      */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 -z-[4] transition-opacity duration-700 ease-out ${
          light ? "opacity-0" : "opacity-100"
        }`}
        style={{
          background:
            "linear-gradient(180deg, rgba(6,10,14,0.62) 0%, rgba(7,12,17,0.14) 42%, rgba(5,9,13,0.7) 100%)"
        }}
      />

      <ExperienceHeader light={light} onNavigate={handleNavigate} />

      <ScrollProgress
        activeStage={activeStage}
        onSelect={handleSelectStage}
        progress={railProgress}
      />

      <ExperienceControls
        light={light}
        onResetView={handleResetView}
        motionReduced={motionReduced}
        onToggleMotion={handleToggleMotion}
      />

      <main>
        <ExperienceHero entered={entered} onScrollToLibrary={() => scrollToSection("library")} />
        <LibrarySection />
        <ObservatorySection />
        <PracticeSection />
        <KnowledgeSection />
        <HowItWorksSection />
        <FinalSection />
      </main>

      <ExperienceFooter />

      <ExperienceLoader state={loader.state} progress={loader.progress} fallback={sceneFailed} />
    </div>
  );
}
