"use client";

import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { ConstellationPreview } from "@/components/landing/product/ConstellationPreview";
import { Reveal } from "@/components/landing/Reveal";
import { KNOWLEDGE_COPY } from "@/components/landing/experienceContent";

/**
 * Stage 05 — the Knowledge Constellation.
 *
 * This is the turn of the page. The dark world ends underneath this section and
 * everything from here on is warm ivory — the white reference's own material.
 * The constellation is drawn as a topic map on paper rather than as glowing
 * spheres in the dark, because that is what "understanding" actually looks like
 * in the product: a diagram, not an aurora.
 *
 * It carries its own disclaimer in the body copy. A network like this is the
 * kind of thing a landing page is tempted to dress up as analytics; it is a
 * teaching diagram, and the page says so in the reader's own line of sight.
 */
export function KnowledgeSection() {
  return (
    <section
      id="constellation"
      data-world-stage={4}
      aria-labelledby="constellation-heading"
      className="editorial-band relative isolate overflow-hidden pb-20 pt-24 sm:pb-24 sm:pt-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[color:var(--editorial-border)]"
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start lg:gap-14">
          <div>
            <Reveal>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--editorial-accent)]">
                {KNOWLEDGE_COPY.eyebrow}
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <h2
                id="constellation-heading"
                className="mt-4 font-display text-[clamp(2.4rem,6vw,4.4rem)] font-semibold leading-[0.94] tracking-[-0.045em] text-[color:var(--editorial-fg)]"
              >
                {KNOWLEDGE_COPY.headline}
              </h2>
            </Reveal>

            <Reveal delay={0.14}>
              <p className="mt-5 max-w-[32rem] text-[15px] leading-7 text-[color:var(--editorial-fg-soft)]">
                {KNOWLEDGE_COPY.support}
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="mt-6 flex items-start gap-2 rounded-[var(--radius-md)] border border-[color:var(--editorial-border)] bg-[color:var(--editorial-bg-soft)]/60 px-3.5 py-3 text-[12px] leading-6 text-[color:var(--editorial-muted)]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--editorial-accent)]" aria-hidden="true" />
                {KNOWLEDGE_COPY.note}
              </p>
            </Reveal>

            <Reveal delay={0.26}>
              <Link
                href="/study-tools"
                className="mt-7 inline-flex min-h-11 items-center gap-1.5 border-b border-[color:var(--editorial-accent)] pb-1 text-[13px] font-semibold text-[color:var(--editorial-fg)] transition-colors duration-150 hover:text-[color:var(--editorial-accent)]"
              >
                See the study tools
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="rounded-[var(--radius-lg)] border border-[color:var(--editorial-border)] bg-[color:var(--editorial-bg-raise)] p-4 shadow-[0_24px_60px_rgba(24,33,42,0.1)] sm:p-6">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--editorial-muted)]">
                  Topic map · Mechanics
                </p>
                <p className="text-[10px] text-[color:var(--editorial-muted)]">9 concepts</p>
              </div>

              <ConstellationPreview />

              <p className="mt-3 border-t border-[color:var(--editorial-border)] pt-3 text-[11px] leading-5 text-[color:var(--editorial-muted)]">
                Every answer the tutor gives is tied back to the sources it came from, so a topic you
                have already studied is one you can find again.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
