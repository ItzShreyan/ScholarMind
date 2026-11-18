"use client";

import { Check, Layers, ListChecks, ScrollText, X } from "lucide-react";
import { ProductShowcase } from "@/components/landing/ProductShowcase";

/**
 * The Practice Grounds' product surface.
 *
 * One real question, answered: four options, the chosen one marked wrong, the
 * correct one marked and explained. A demo that only shows a correct answer
 * demonstrates nothing about what practice is for, which is finding the gap.
 *
 * The three tool chips underneath are the three study tools that exist, and they
 * are labelled with what they generate rather than with a marketing verb.
 */

const OPTIONS = [
  { key: "A", text: "3.2 m s⁻²", state: "correct" as const },
  { key: "B", text: "4.9 m s⁻²", state: "chosen" as const },
  { key: "C", text: "6.8 m s⁻²", state: "idle" as const },
  { key: "D", text: "8.5 m s⁻²", state: "idle" as const }
];

const TOOLS = [
  { icon: ListChecks, label: "Quiz", detail: "8 questions" },
  { icon: Layers, label: "Flashcards", detail: "14 cards" },
  { icon: ScrollText, label: "Mock paper", detail: "with mark scheme" }
];

export function PracticePreview() {
  return (
    <ProductShowcase
      label="Quiz maker · Forces & Motion"
      status="Question 3 of 8"
      caption="An illustration of a generated quiz: the wrong answer you chose, the right one, and the explanation that tells you why."
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[color:var(--editorial-muted)]">
          Multiple choice
        </p>
        <div className="flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
            <span
              key={index}
              className={`h-1 w-3 rounded-full ${
                index < 2
                  ? "bg-[rgba(95,138,99,0.75)]"
                  : index === 2
                    ? "bg-[rgba(178,63,52,0.7)]"
                    : "bg-[rgba(24,33,42,0.14)]"
              }`}
            />
          ))}
        </div>
      </div>

      <p className="mt-2.5 text-[12px] leading-[1.65] text-[color:var(--editorial-fg)]">
        A 2.0 kg block slides down a 30° incline with μ = 0.20. What is its acceleration?
      </p>

      <ul className="mt-2.5 space-y-1.5">
        {OPTIONS.map((option) => {
          const isCorrect = option.state === "correct";
          const isChosen = option.state === "chosen";

          return (
            <li
              key={option.key}
              className={`flex items-center gap-2 rounded-[8px] border px-2.5 py-1.5 text-[11.5px] ${
                isCorrect
                  ? "border-[rgba(95,138,99,0.45)] bg-[rgba(95,138,99,0.1)] text-[color:var(--editorial-fg)]"
                  : isChosen
                    ? "border-[rgba(178,63,52,0.4)] bg-[rgba(178,63,52,0.07)] text-[color:var(--editorial-fg-soft)]"
                    : "border-[color:var(--editorial-border)] text-[color:var(--editorial-fg-soft)]"
              }`}
            >
              <span className="w-3 shrink-0 text-[9px] font-bold text-[color:var(--editorial-muted)]">
                {option.key}
              </span>
              <span className="min-w-0 flex-1 font-medium">{option.text}</span>
              {isCorrect ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#4d7a52]">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Correct
                </span>
              ) : null}
              {isChosen ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#9c3b31]">
                  <X className="h-3 w-3" aria-hidden="true" />
                  Yours
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-2.5 rounded-[8px] border-l-2 border-[color:var(--editorial-accent)] bg-[rgba(24,33,42,0.04)] px-3 py-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--editorial-accent)]">
          Why
        </p>
        <p className="mt-1 text-[11px] leading-[1.65] text-[color:var(--editorial-fg-soft)]">
          Using a = g(sin θ − μ cos θ) with g = 9.81, θ = 30° and μ = 0.20 gives 3.21 m s⁻². 4.9 m s⁻²
          is g sin θ with no friction applied — the friction term is what you missed.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-[color:var(--editorial-border)] pt-2.5">
        {TOOLS.map((tool) => (
          <div key={tool.label} className="flex items-center gap-1.5">
            <tool.icon className="h-3 w-3 shrink-0 text-[color:var(--editorial-muted)]" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-[9.5px] font-semibold leading-tight text-[color:var(--editorial-fg-soft)]">
                {tool.label}
              </span>
              <span className="block truncate text-[8.5px] leading-tight text-[color:var(--editorial-muted)]">
                {tool.detail}
              </span>
            </span>
          </div>
        ))}
      </div>
    </ProductShowcase>
  );
}
