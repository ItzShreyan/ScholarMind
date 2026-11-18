"use client";

import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { MobileCompanionPreview } from "@/components/landing/product/MobileCompanionPreview";
import { FINAL_COPY } from "@/components/landing/experienceContent";

/**
 * Stage 06 — the final destination.
 *
 * The hub is where the journey began and it is where the page ends, but it is
 * not shown the same way twice: by this point the visitor has been through the
 * library, the observatory and the practice terraces, so the closing shot is the
 * *product*, not the campus. The camera's arrival at the hub is expressed by the
 * starburst mark and the ivory tone it has already settled into.
 *
 * The starburst is drawn as an original SVG rather than an image: twelve rays
 * from the brand mark, each one a particle that has found its place. It is
 * decorative, so it is `aria-hidden` and stops rotating under reduced motion.
 *
 * The mobile companion is here because it is the last honest product surface —
 * the account the visitor is about to create already works on a phone.
 */

/** One ray of the brand mark. Rotated about the centre of the 100×100 box. */
const STARBURST_RAYS = Array.from({ length: 12 }, (_, index) => index * 30);

function Starburst() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      className="starburst h-full w-full"
      role="presentation"
    >
      <defs>
        <linearGradient id="starburst-ray" x1="50" y1="4" x2="50" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--editorial-accent)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--editorial-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle cx="50" cy="50" r="2.4" fill="var(--editorial-accent)" opacity="0.85" />
      <circle cx="50" cy="50" r="11" fill="none" stroke="var(--editorial-border)" strokeWidth="0.5" />

      {STARBURST_RAYS.map((angle, index) => {
        const long = index % 3 === 0;
        return (
          <rect
            key={angle}
            x="49.6"
            y={long ? 8 : 18}
            width="0.8"
            height={long ? 38 : 28}
            rx="0.4"
            fill="url(#starburst-ray)"
            transform={`rotate(${angle} 50 50)`}
          />
        );
      })}
    </svg>
  );
}

export function FinalSection() {
  return (
    <section
      id="hub"
      data-world-stage={5}
      aria-labelledby="hub-heading"
      className="editorial-band relative isolate overflow-hidden pb-24 pt-20 sm:pb-28 sm:pt-24"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[color:var(--editorial-border)]" />

      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16">
          <div>
            <Reveal>
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--editorial-accent)]">
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                {FINAL_COPY.eyebrow}
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <h2
                id="hub-heading"
                className="mt-5 max-w-[16ch] font-display text-[clamp(2.5rem,6.4vw,4.8rem)] font-semibold leading-[0.93] tracking-[-0.048em] text-[color:var(--editorial-fg)]"
              >
                {FINAL_COPY.headline}
              </h2>
            </Reveal>

            <Reveal delay={0.14}>
              <p className="mt-6 max-w-[36rem] text-[15px] leading-7 text-[color:var(--editorial-fg-soft)] sm:text-base">
                {FINAL_COPY.support}
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/auth"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-[linear-gradient(135deg,var(--accent-gold),var(--accent-coral))] px-6 text-sm font-semibold text-[#1a1208] shadow-[0_18px_44px_rgba(220,165,102,0.28)] transition-transform duration-150 hover:scale-[1.02]"
                >
                  {FINAL_COPY.primaryCta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>

                <Link
                  href="/study-tools"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill border border-[color:var(--editorial-border)] px-6 text-sm font-medium text-[color:var(--editorial-fg)] transition-colors duration-150 hover:border-[color:var(--editorial-accent)] hover:bg-[color:var(--editorial-bg-soft)]/60"
                >
                  {FINAL_COPY.secondaryCta}
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.26}>
              <div className="mt-10 flex items-center gap-5 border-t border-[color:var(--editorial-border)] pt-6">
                <div className="h-14 w-14 shrink-0">
                  <Starburst />
                </div>
                <p className="max-w-[34ch] text-[11px] leading-5 text-[color:var(--editorial-muted)]">
                  The mark you have been reading against is the island itself — twelve ideas in orbit
                  around one place to study them.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.12}>
            <div className="flex justify-center lg:justify-end">
              <MobileCompanionPreview />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
