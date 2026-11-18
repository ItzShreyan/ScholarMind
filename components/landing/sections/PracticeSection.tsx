"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ExperienceSection } from "@/components/landing/ExperienceSection";
import { PracticePreview } from "@/components/landing/product/PracticePreview";
import { PRACTICE_COPY } from "@/components/landing/experienceContent";

/**
 * Stage 04 — the Practice Grounds.
 *
 * Copy back on the left: the camera has crossed to the east side and the
 * terraces read best from above, on the right of frame. The section is the last
 * one that sits on the dark world — the palette starts moving toward ivory
 * underneath it, which is what makes the next section feel like a turn of the
 * page rather than a jump cut.
 */
export function PracticeSection() {
  return (
    <ExperienceSection
      id="practice"
      stage={3}
      eyebrow={PRACTICE_COPY.eyebrow}
      headline={PRACTICE_COPY.headline}
      support={PRACTICE_COPY.support}
      bullets={PRACTICE_COPY.bullets}
      side="left"
      footer={
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link
            href="/quiz-maker"
            className="inline-flex min-h-11 items-center gap-1.5 border-b border-[color:var(--accent-mint)] pb-1 text-[13px] font-semibold text-[color:var(--text-1)] transition-colors duration-150 hover:text-[color:var(--accent-mint)]"
          >
            Make a quiz
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <Link
            href="/flashcard-generator"
            className="inline-flex min-h-11 items-center gap-1.5 border-b border-[color:var(--surface-border)] pb-1 text-[13px] font-medium text-[color:var(--text-2)] transition-colors duration-150 hover:text-[color:var(--text-1)]"
          >
            Build flashcards
          </Link>
        </div>
      }
    >
      <PracticePreview />
    </ExperienceSection>
  );
}
