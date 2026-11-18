"use client";

import { FileText, Highlighter, Search, Sparkles } from "lucide-react";
import { ProductShowcase } from "@/components/landing/ProductShowcase";

/**
 * The Library's product surface.
 *
 * Three panes: the sources you added, the document you are reading, and the
 * tutor, which answers from those sources. The document text is real Physics —
 * a passage a student would actually revise from — because a demo full of lorem
 * ipsum documents nothing.
 *
 * Everything here mirrors a screen that exists in `/studio`. Nothing is a button
 * that would do nothing if it were live: the toolbar labels describe actions the
 * studio actually performs, and the panel is not pretending to be interactive.
 */

const SOURCES = [
  { name: "Forces & Motion — Ch. 3.pdf", pages: "12 pp", active: true },
  { name: "Free-body diagrams.pdf", pages: "4 pp", active: false },
  { name: "Incline problems (handwritten).jpg", pages: "1 p", active: false },
  { name: "Unit 2 — Mechanics slides.pptx", pages: "38 pp", active: false }
];

export function StudyWorkspacePreview() {
  return (
    <ProductShowcase
      label="Studio · Physics · Forces & Motion"
      status="4 sources"
      caption="An illustration of the Study Studio: your sources on the left, the document in the middle, and the tutor answering from it."
      flush
    >
      <div className="grid grid-cols-1 sm:grid-cols-[150px_minmax(0,1fr)]">
        {/* Sources */}
        <aside className="border-b border-[color:var(--editorial-border)] bg-[color:var(--editorial-bg)]/60 p-3 sm:border-b-0 sm:border-r">
          <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[color:var(--editorial-muted)]">
            <Search className="h-3 w-3" aria-hidden="true" />
            Sources
          </p>

          <ul className="mt-2.5 space-y-1">
            {SOURCES.map((source) => (
              <li
                key={source.name}
                className={`rounded-[10px] px-2 py-1.5 ${
                  source.active
                    ? "bg-[rgba(156,108,52,0.12)] ring-1 ring-[rgba(156,108,52,0.28)]"
                    : ""
                }`}
              >
                <p
                  className={`flex items-start gap-1.5 text-[10.5px] leading-4 ${
                    source.active
                      ? "font-semibold text-[color:var(--editorial-fg)]"
                      : "text-[color:var(--editorial-fg-soft)]"
                  }`}
                >
                  <FileText
                    className="mt-0.5 h-3 w-3 shrink-0 text-[color:var(--editorial-muted)]"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 break-words">{source.name}</span>
                </p>
                <p className="mt-0.5 pl-[18px] text-[9px] text-[color:var(--editorial-muted)]">
                  {source.pages}
                </p>
              </li>
            ))}
          </ul>
        </aside>

        {/* Document */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--editorial-border)] px-3 py-2">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--editorial-muted)]">
              Page 7 of 12
            </span>
            <span className="flex items-center gap-3 text-[9.5px] font-medium text-[color:var(--editorial-muted)]">
              <span className="inline-flex items-center gap-1">
                <Highlighter className="h-3 w-3" aria-hidden="true" />
                Highlight
              </span>
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Ask about selection
              </span>
            </span>
          </div>

          <article className="reading-surface border-0 px-4 py-4 sm:px-5">
            <h3 className="font-display text-[13px] font-semibold tracking-[-0.01em] text-[color:var(--editorial-fg)]">
              3.2 Resolving forces on an inclined plane
            </h3>

            <p className="mt-2 text-[11.5px] leading-[1.7] text-[color:var(--editorial-fg-soft)]">
              A block resting on a slope is not in the same situation as a block on a table. The
              normal reaction is perpendicular to the <em>surface</em>, not vertical, so the weight
              has to be resolved into two components: one along the plane and one into it.
            </p>

            <p className="mt-2 text-[11.5px] leading-[1.7] text-[color:var(--editorial-fg-soft)]">
              Taking the angle of the incline as θ, the component of weight down the slope is{" "}
              <span className="rounded-[3px] bg-[rgba(156,108,52,0.14)] px-1 font-medium text-[color:var(--editorial-fg)]">
                mg sin θ
              </span>
              , and the component pressing into the surface is mg cos θ. The normal reaction therefore
              equals mg cos θ whenever there is no vertical acceleration.
            </p>

            <div className="mt-3 rounded-[8px] border-l-2 border-[color:var(--editorial-accent)] bg-[rgba(24,33,42,0.04)] px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--editorial-accent)]">
                Key result
              </p>
              <p className="mt-1 font-display text-[11.5px] leading-5 text-[color:var(--editorial-fg)]">
                F<sub>net</sub> = mg sin θ − μ mg cos θ, so a = g(sin θ − μ cos θ)
              </p>
            </div>

            <p className="mt-2 text-[11.5px] leading-[1.7] text-[color:var(--editorial-fg-soft)]">
              Notice that the mass cancels. On an incline, the acceleration depends on the angle and
              the coefficient of friction — not on how heavy the block is.
            </p>
          </article>

          {/* The tutor's answer, sourced from the passage above. */}
          <div className="border-t border-[color:var(--editorial-border)] px-3 py-3">
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--editorial-accent)]">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Tutor · answered by Flash · 1 source
            </p>
            <p className="mt-1.5 text-[11px] leading-[1.65] text-[color:var(--editorial-fg-soft)]">
              The mass cancels because both the driving force and the friction are proportional to it.
              That is why a 2 kg block and a 20 kg block slide down the same slope at the same rate.
            </p>
          </div>
        </div>
      </div>
    </ProductShowcase>
  );
}
