"use client";

import { ArrowUp, Cpu, FileText, Paperclip } from "lucide-react";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { CHAT_MODELS } from "@/lib/ai/models";

/**
 * The Observatory's product surface.
 *
 * An editor-style exchange, not a chat bubble: the question is a line of text
 * in a document, the answer is typeset material with a heading, a method, a
 * highlighted result and a closing note — the structure the tutor prompt
 * actually enforces.
 *
 * The model picker is real. Pro and Flash are imported from the model registry
 * rather than typed in, so if a tier is renamed this panel cannot go stale. Auto
 * shows the sentence it would have shown before the question was sent, which is
 * the behaviour `describeDecision` produces in the composer.
 */

const MODEL_TIERS = [
  { id: "auto", label: "Auto", note: "picks, and says why" },
  { id: "flash", label: CHAT_MODELS.flash.label, note: "everyday questions" },
  { id: "pro", label: CHAT_MODELS.pro.label, note: "worked reasoning" }
] as const;

export function TutorPreview() {
  return (
    <ProductShowcase
      label="AI study assistant · Forces & Motion"
      status="Auto → Pro"
      caption="An illustration of the study assistant: a question, the method written out, and the model that actually answered named at the end."
    >
      <div className="rounded-[var(--radius-md)] border border-[color:var(--editorial-border)] bg-[color:var(--editorial-bg)]/60 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {MODEL_TIERS.map((tier, index) => (
            <span
              key={tier.id}
              className={`inline-flex items-center gap-1 rounded-pill px-2 py-1 text-[9.5px] font-semibold ${
                index === 0
                  ? "bg-[rgba(156,108,52,0.14)] text-[color:var(--editorial-accent)] ring-1 ring-[rgba(156,108,52,0.28)]"
                  : "text-[color:var(--editorial-muted)]"
              }`}
            >
              {index === 0 ? <Cpu className="h-2.5 w-2.5" aria-hidden="true" /> : null}
              {tier.label}
            </span>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] leading-4 text-[color:var(--editorial-muted)]">
          Auto selected <span className="font-semibold text-[color:var(--editorial-fg-soft)]">Pro</span>{" "}
          because this asks for a worked method.
        </p>
      </div>

      {/* Question */}
      <div className="mt-3 flex items-start gap-2">
        <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[rgba(24,33,42,0.08)] text-[8px] font-bold text-[color:var(--editorial-muted)]">
          Q
        </span>
        <p className="text-[12px] leading-[1.65] text-[color:var(--editorial-fg)]">
          A 2.0 kg block slides down a 30° incline with a coefficient of friction of 0.20. Find its
          acceleration, and explain why the mass does not appear in the final answer.
        </p>
      </div>

      {/* Answer */}
      <div className="mt-3 border-t border-[color:var(--editorial-border)] pt-3">
        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--editorial-accent)]">
          <FileText className="h-3 w-3" aria-hidden="true" />
          From Forces & Motion — Ch. 3, p.7
        </p>

        <h4 className="mt-2 font-display text-[12px] font-semibold text-[color:var(--editorial-fg)]">
          Answer
        </h4>
        <p className="mt-1 text-[11.5px] leading-[1.7] text-[color:var(--editorial-fg-soft)]">
          The block accelerates at <strong className="text-[color:var(--editorial-fg)]">3.2 m s⁻²</strong>{" "}
          down the slope.
        </p>

        <h4 className="mt-2.5 font-display text-[12px] font-semibold text-[color:var(--editorial-fg)]">
          Method
        </h4>
        <div className="mt-1 space-y-0.5 font-display text-[11.5px] leading-6 text-[color:var(--editorial-fg)]">
          <p>W along slope = mg sin θ</p>
          <p>Friction F = μN = μ mg cos θ</p>
          <p>ma = mg sin θ − μ mg cos θ</p>
          <p className="text-[color:var(--editorial-fg-soft)]">a = g(sin θ − μ cos θ)</p>
          <p className="text-[color:var(--editorial-fg-soft)]">
            &nbsp;&nbsp;= 9.81 × (0.500 − 0.200 × 0.866) = 3.21 m s⁻²
          </p>
        </div>

        <div className="mt-2.5 rounded-[8px] border border-[color:var(--editorial-border)] bg-[rgba(24,33,42,0.035)] px-3 py-2">
          <p className="text-[11px] leading-[1.65] text-[color:var(--editorial-fg-soft)]">
            <span className="font-semibold text-[color:var(--editorial-fg)]">Why m cancels:</span>{" "}
            every force in the equation is proportional to the mass, so dividing through removes it.
            The acceleration is a property of the slope, not of the block.
          </p>
        </div>
      </div>

      {/* Composer */}
      <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--editorial-border)] bg-white px-2.5 py-2">
        <Paperclip className="h-3.5 w-3.5 shrink-0 text-[color:var(--editorial-muted)]" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-[11px] text-[color:var(--editorial-muted)]">
          Ask about this document…
        </span>
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--editorial-fg)]">
          <ArrowUp className="h-3 w-3 text-[color:var(--editorial-bg-raise)]" aria-hidden="true" />
        </span>
      </div>
    </ProductShowcase>
  );
}
