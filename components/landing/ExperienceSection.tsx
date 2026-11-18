"use client";

import type { ReactNode } from "react";
import { Reveal } from "@/components/landing/Reveal";
import type { FeatureBullet } from "@/components/landing/experienceContent";

/**
 * The shared shape of stages 02–04.
 *
 * Every one of these sections is the same three things in the same order: a
 * claim, the evidence for it, and a real product surface showing it. Only the
 * camera outside this component changes. Keeping the layout in one component
 * means the three sections cannot drift into three different design languages,
 * which is the usual failure of a long scrolly page.
 *
 * `side` moves the copy to the opposite column — not decoration. The camera is
 * looking at a specific building in each stage, and the copy must not cover it.
 */

type ExperienceSectionProps = {
  id: string;
  /** 0–5, read by `useWorldScrollProgress`. */
  stage: number;
  eyebrow: string;
  headline: string;
  support: string;
  bullets: readonly FeatureBullet[];
  /** Which side the copy sits on for a wide viewport. */
  side?: "left" | "right";
  /** The product surface. Rendered inside a light frame. */
  children: ReactNode;
  /** Optional closing line or link under the bullets. */
  footer?: ReactNode;
};

export function ExperienceSection({
  id,
  stage,
  eyebrow,
  headline,
  support,
  bullets,
  side = "left",
  children,
  footer
}: ExperienceSectionProps) {
  const copyFirst = side === "left";

  return (
    <section
      id={id}
      data-world-stage={stage}
      className="relative isolate flex min-h-[100svh] w-full items-center overflow-hidden py-24 sm:py-28"
    >
      {/*
        Scrim. Two layers, because the layout has two shapes:

        - Below `lg` the copy stacks *above* the product panel at full width, so
          the wash has to cover the whole section. It is a *flat* wash rather
          than a gradient: a vertical ramp here ends at a different opacity from
          the ramp in the neighbouring section, and that difference draws a hard
          horizontal line across the world at every section boundary.
        - From `lg` up the copy is one column on one side, so the wash only has
          to run horizontally. A horizontal gradient is constant top to bottom,
          which is exactly why it cannot seam against its neighbours.

        The vertical half of the art direction lives in one fixed layer in
        `ScholarMindExperience`, which spans the whole dark run of the page and
        therefore has no boundaries to seam against.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 lg:hidden"
        style={{ background: "rgba(7,12,17,0.82)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 hidden lg:block"
        style={{
          background: copyFirst
            ? "linear-gradient(96deg, rgba(6,10,14,0.94) 0%, rgba(7,12,17,0.86) 36%, rgba(8,13,18,0.34) 64%, transparent 82%)"
            : "linear-gradient(264deg, rgba(6,10,14,0.94) 0%, rgba(7,12,17,0.86) 36%, rgba(8,13,18,0.34) 64%, transparent 82%)"
        }}
      />

      <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
        <div
          className={`grid items-center gap-10 lg:gap-14 ${
            copyFirst
              ? "lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]"
              : "lg:grid-cols-[minmax(0,1.14fr)_minmax(0,0.86fr)]"
          }`}
        >
          <div className={copyFirst ? "" : "lg:order-2"}>
            <Reveal>
              <p className="label text-[color:var(--accent-gold)]">{eyebrow}</p>
            </Reveal>

            <Reveal delay={0.08}>
              <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(1.9rem,4.2vw,3.1rem)] font-semibold leading-[1.03] tracking-[-0.038em] text-[color:var(--text-1)]">
                {headline}
              </h2>
            </Reveal>

            <Reveal delay={0.14}>
              <p className="mt-5 max-w-[34rem] text-[15px] leading-7 text-[color:var(--text-2)]">
                {support}
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <ul className="mt-8 divide-y divide-[color:var(--surface-border)] border-y border-[color:var(--surface-border)]">
                {bullets.map((bullet) => (
                  <li key={bullet.title} className="flex gap-4 py-3.5">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[color:var(--accent-gold)]"
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[color:var(--text-1)]">
                        {bullet.title}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-6 text-[color:var(--text-3)]">
                        {bullet.copy}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>

            {footer ? (
              <Reveal delay={0.26}>
                <div className="mt-6">{footer}</div>
              </Reveal>
            ) : null}
          </div>

          <Reveal delay={0.1} className={copyFirst ? "" : "lg:order-1"}>
            {children}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
