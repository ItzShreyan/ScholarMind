"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";
import { HERO_EYEBROW, HERO_HEADLINE, HERO_SUPPORT } from "@/components/landing/experienceContent";

/**
 * Stage 01 — the opening world.
 *
 * The hero does not contain the 3D scene; the scene is behind the whole page.
 * What the hero owns is the *scrim*: a warm-to-transparent gradient on the left
 * so the headline stays at full contrast over a lit city, and nothing on the
 * right so the island is never covered.
 *
 * That is the composition rule for the dark half of the page — copy on a scrim,
 * architecture in the open. It is why no section here needs a card behind its
 * text.
 */

type ExperienceHeroProps = {
  /** True once the loader has finished, so the entrance can run. */
  entered: boolean;
  onScrollToLibrary: () => void;
};

export function ExperienceHero({ entered, onScrollToLibrary }: ExperienceHeroProps) {
  return (
    <section
      id="world"
      data-world-stage="0"
      aria-label="ScholarMind learning world"
      className="relative isolate flex min-h-[100svh] w-full flex-col justify-end overflow-hidden pt-24"
    >
      {/*
        The scrim. Dense behind the headline, open at the top-right where the
        island sits.

        Horizontal only. A vertical ramp here would end at 0.92 opacity on the
        hero's last pixel and meet a section that starts at 0, which draws a line
        across the world exactly at the fold. The vertical darkening the hero
        needs for its bottom edge is supplied by the page-wide scrim in
        `ScholarMindExperience` instead, so every section shares one continuous
        gradient and no boundary can disagree with its neighbour.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(100deg, rgba(6,10,14,0.94) 0%, rgba(7,12,17,0.86) 30%, rgba(8,13,18,0.34) 56%, rgba(8,13,18,0) 74%)"
        }}
      />

      <div className="mx-auto w-full max-w-7xl px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
        <div className="max-w-[36rem]">
          <p
            className={`label flex items-center gap-2 text-[color:var(--accent-gold)] transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {HERO_EYEBROW}
          </p>

          <h1
            className={`mt-5 font-display font-semibold leading-[0.92] tracking-[-0.045em] text-[color:var(--text-1)] transition-all delay-100 duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              entered ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
            style={{ fontSize: "clamp(2.6rem, 6.2vw, 4.75rem)" }}
          >
            <span className="block">{HERO_HEADLINE.lead}</span>
            <span className="block text-[color:var(--text-2)]">{HERO_HEADLINE.mid}</span>
            <span className="block bg-[linear-gradient(100deg,var(--accent-gold),var(--accent-coral)_58%,#b8843f)] bg-clip-text text-transparent">
              {HERO_HEADLINE.tail}
            </span>
          </h1>

          <p
            className={`mt-6 max-w-[34rem] text-[15px] leading-7 text-[color:var(--text-2)] transition-all delay-200 duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:text-base ${
              entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            {HERO_SUPPORT}
          </p>

          <div
            className={`mt-8 flex flex-col gap-3 transition-all delay-300 duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:flex-row sm:items-center ${
              entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <Link
              href="/auth"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-[linear-gradient(135deg,var(--accent-gold),var(--accent-coral))] px-6 text-sm font-semibold text-[#1a1208] shadow-[0_18px_44px_rgba(220,165,102,0.28)] transition-transform duration-150 hover:scale-[1.02]"
            >
              Enter the learning world
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={onScrollToLibrary}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill border border-[rgba(243,240,233,0.18)] px-6 text-sm font-medium text-[color:var(--text-1)] transition-colors duration-150 hover:border-[rgba(233,206,154,0.5)] hover:bg-[rgba(243,240,233,0.06)]"
            >
              Discover the experience
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p
            className={`mt-7 text-[11px] leading-5 text-[color:var(--text-3)] transition-opacity delay-500 duration-1000 ${
              entered ? "opacity-100" : "opacity-0"
            }`}
          >
            Five places, one account. Every building here opens a page that already exists.
          </p>
        </div>
      </div>

      {/* Scroll indicator: a travelling line, not a bouncing arrow. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex"
      >
        <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-3)]">
          Scroll
        </span>
        <span className="relative h-10 w-px overflow-hidden bg-[rgba(243,240,233,0.14)]">
          <span className="scroll-travel absolute inset-x-0 top-0 h-4 bg-[linear-gradient(180deg,transparent,var(--accent-gold))]" />
        </span>
      </div>
    </section>
  );
}
