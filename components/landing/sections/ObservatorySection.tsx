"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ExperienceSection } from "@/components/landing/ExperienceSection";
import { TutorPreview } from "@/components/landing/product/TutorPreview";
import { OBSERVATORY_COPY } from "@/components/landing/experienceContent";

/**
 * Stage 03 — the Observatory.
 *
 * Copy on the right: the camera has swung west and low, so the dome sits on the
 * left of the frame against the sky and the text must stay out of its way. This
 * is the most atmospheric stop on the journey, which is why the panel beside it
 * is the quietest — a typeset answer on paper, not another glowing interface.
 */
export function ObservatorySection() {
  return (
    <ExperienceSection
      id="observatory"
      stage={2}
      eyebrow={OBSERVATORY_COPY.eyebrow}
      headline={OBSERVATORY_COPY.headline}
      support={OBSERVATORY_COPY.support}
      bullets={OBSERVATORY_COPY.bullets}
      side="right"
      footer={
        <Link
          href="/ai-study-assistant"
          className="inline-flex min-h-11 items-center gap-1.5 border-b border-[color:var(--accent-sky)] pb-1 text-[13px] font-semibold text-[color:var(--text-1)] transition-colors duration-150 hover:text-[color:var(--accent-sky)]"
        >
          Ask the study assistant
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      }
    >
      <TutorPreview />
    </ExperienceSection>
  );
}
