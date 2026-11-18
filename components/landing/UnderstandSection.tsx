import { ArrowRight, BookOpen, CheckCircle2, Divide, Quote } from "lucide-react";
import Link from "next/link";

/**
 * The editorial statement.
 *
 * This is the one place on the site that uses the warm ivory reading surface
 * in full: the point of the section is that a ScholarMind answer is *typeset
 * learning material*, not a chat bubble. The sample on the right follows the
 * same rules the tutor prompt enforces — method, working, a boxed final
 * answer, and a vocabulary line — so it documents the product rather than
 * inventing a feature.
 *
 * Deliberately not a card grid: one enormous word, one column of prose, one
 * document. Reference B's composition, not a dashboard.
 */

const answerRules = [
  {
    title: "The answer first",
    copy: "A direct answer in the opening line. Context and caveats come afterwards, never before."
  },
  {
    title: "The method, written out",
    copy: "Every calculation shows the substitution, the units and the step that earns the mark."
  },
  {
    title: "A final answer you can find",
    copy: "The result is set apart from the working, so it survives a quick glance the night before."
  }
];

export function UnderstandSection() {
  return (
    <section
      className="editorial-band relative overflow-hidden"
      aria-labelledby="understand-heading"
    >
      {/* Hairline rules, like a printed page. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[color:var(--editorial-border)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[color:var(--editorial-border)]" />

      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--editorial-accent)]">
            Why the answers read differently
          </p>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--editorial-muted)]">
            Tutor · Pro or Flash · shown on every answer
          </p>
        </div>

        <h2
          id="understand-heading"
          className="mt-6 font-display text-[clamp(2.75rem,11.5vw,9.5rem)] font-semibold leading-[0.82] tracking-[-0.045em] text-[color:var(--editorial-fg)]"
        >
          UNDERSTAND
        </h2>

        <div className="mt-8 grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
          <div>
            <p className="max-w-md font-display text-xl leading-[1.5] text-[color:var(--editorial-fg)] sm:text-2xl">
              An answer is not a wall of text. It is a worked example with a shape you
              can revise from.
            </p>

            <p className="mt-4 max-w-md text-sm leading-7 text-[color:var(--editorial-fg-soft)]">
              The tutor is told to answer the question that was asked, in the order a
              teacher would mark it: what the answer is, how the working gets there, and
              what to remember. Headings, tables, fractions and chemical equations are
              rendered properly rather than flattened into paragraphs.
            </p>

            <ul className="mt-7 space-y-5">
              {answerRules.map((rule, index) => (
                <li key={rule.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 w-6 shrink-0 font-display text-sm font-semibold tabular-nums text-[color:var(--editorial-accent)]"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--editorial-fg)]">{rule.title}</p>
                    <p className="mt-1 text-sm leading-7 text-[color:var(--editorial-fg-soft)]">{rule.copy}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              href="/ai-study-assistant"
              className="mt-8 inline-flex min-h-11 items-center gap-1.5 border-b border-[color:var(--editorial-accent)] pb-1 text-sm font-semibold text-[color:var(--editorial-fg)] transition-colors duration-150 hover:text-[color:var(--editorial-accent)]"
            >
              See the study assistant
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {/* The reading surface itself: a real answer, typeset. */}
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-x-2 -top-2 bottom-3 rounded-[var(--radius-xl)] border border-[color:var(--editorial-border)] bg-[color:var(--editorial-bg-soft)]/60"
            />

            <article className="relative rounded-[var(--radius-xl)] border border-[color:var(--editorial-border)] bg-[color:var(--editorial-bg-raise)] p-5 shadow-[0_28px_70px_rgba(24,33,42,0.14)] sm:p-7">
              <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[color:var(--editorial-border)] pb-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--editorial-accent)]">
                  <BookOpen className="h-3 w-3" aria-hidden="true" />
                  Physics · Mechanics
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--editorial-muted)]">
                  Studio: Forces & Motion
                </span>
              </header>

              <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--editorial-muted)]">
                <Quote className="h-3 w-3" aria-hidden="true" />
                Question
              </p>
              <p className="mt-1.5 text-[15px] leading-7 text-[color:var(--editorial-fg)]">
                A 2.0&nbsp;kg block slides down a 30° incline with a coefficient of friction of
                0.20. Find its acceleration.
              </p>

              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--editorial-muted)]">
                Method
              </p>
              <div className="mt-2 space-y-1.5 font-display text-[15px] leading-8 text-[color:var(--editorial-fg)]">
                <p>W along slope = mg sin θ</p>
                <p className="flex items-center gap-2">
                  <Divide className="h-3.5 w-3.5 text-[color:var(--editorial-muted)]" aria-hidden="true" />
                  <span>Friction F = μN = μ mg cos θ</span>
                </p>
                <p>ma = mg sin θ − μ mg cos θ</p>
                <p className="pt-1 text-[color:var(--editorial-fg-soft)]">
                  a = g(sin θ − μ cos θ)
                </p>
                <p className="text-[color:var(--editorial-fg-soft)]">
                  &nbsp;&nbsp;= 9.81 × (0.500 − 0.200 × 0.866)
                </p>
                <p className="text-[color:var(--editorial-fg-soft)]">
                  &nbsp;&nbsp;= 9.81 × 0.327 = 3.21 m s⁻²
                </p>
              </div>

              <div className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--editorial-border)] bg-[color:var(--editorial-bg)] px-4 py-3">
                <p className="flex items-start gap-2 text-sm leading-6 text-[color:var(--editorial-fg)]">
                  <CheckCircle2
                    className="mt-1 h-4 w-4 shrink-0 text-[color:#5f8a63]"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="font-semibold">Final answer:</span> a ≈ 3.2 m s⁻² down the
                    slope, to two significant figures.
                  </span>
                </p>
              </div>

              <p className="mt-4 text-xs leading-6 text-[color:var(--editorial-muted)]">
                Remember: friction always opposes the direction of sliding, so it subtracts
                from the component of weight along the slope.
              </p>

              <footer className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[color:var(--editorial-border)] pt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--editorial-muted)]">
                <span>Answered by Pro</span>
                <span aria-hidden="true">·</span>
                <span>1 studio source</span>
                <span aria-hidden="true">·</span>
                <span>Auto escalated: multi-step calculation</span>
              </footer>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
