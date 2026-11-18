"use client";

import { Reveal } from "@/components/landing/Reveal";
import { HOW_IT_WORKS } from "@/components/landing/experienceContent";

/**
 * The editorial "how it works" band.
 *
 * The header links to `#how-it-works`, so the anchor has to exist and it has to
 * be worth arriving at. It sits after the constellation, once the page has
 * already turned ivory, and it is the only place on the page that describes the
 * *sequence* of using the product rather than a single surface.
 *
 * Deliberately not a world stage: there is no camera move here. The journey has
 * finished moving and is now explaining itself, which is the correct moment for
 * the page to stop being cinematic.
 */
export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="editorial-band relative isolate overflow-hidden pb-20 pt-4 sm:pb-24"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="border-t border-[color:var(--editorial-border)] pt-12 sm:pt-14">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-14">
            <div>
              <Reveal>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--editorial-accent)]">
                  How it works
                </p>
              </Reveal>

              <Reveal delay={0.08}>
                <h2
                  id="how-it-works-heading"
                  className="mt-3 font-display text-[clamp(1.8rem,3.6vw,2.75rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[color:var(--editorial-fg)]"
                >
                  Four moves, in this order.
                </h2>
              </Reveal>
            </div>

            <Reveal delay={0.14}>
              <p className="max-w-[42rem] text-[15px] leading-7 text-[color:var(--editorial-fg-soft)]">
                The order matters. Reading without testing produces recognition, not recall; testing
                without a plan produces a week of good intentions and a night of panic. Each of these
                steps is a screen that already exists in the product.
              </p>
            </Reveal>
          </div>

          <ol className="mt-10 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--editorial-border)] bg-[color:var(--editorial-border)] sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step, index) => (
              <li key={step.step} className="bg-[color:var(--editorial-bg-raise)]">
                <Reveal delay={index * 0.06} className="flex h-full flex-col gap-2.5 p-5 sm:p-6">
                  <span className="font-editorial text-[13px] font-medium tracking-[0.06em] text-[color:var(--editorial-accent)]">
                    {step.step}
                  </span>
                  <h3 className="font-display text-[15px] font-semibold leading-snug text-[color:var(--editorial-fg)]">
                    {step.title}
                  </h3>
                  <p className="text-[13px] leading-6 text-[color:var(--editorial-muted)]">{step.copy}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
