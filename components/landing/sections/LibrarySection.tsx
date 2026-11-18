"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ExperienceSection } from "@/components/landing/ExperienceSection";
import { StudyWorkspacePreview } from "@/components/landing/product/StudyWorkspacePreview";
import { LIBRARY_COPY } from "@/components/landing/experienceContent";

/**
 * Stage 02 — the Library.
 *
 * The camera has moved down the path to the library and the copy sits on the
 * left of frame, because the building arrives on the right of it. Everything
 * this section claims is demonstrated immediately to its right in the studio
 * panel, so the claim and the evidence are read together.
 */
export function LibrarySection() {
  return (
    <ExperienceSection
      id="library"
      stage={1}
      eyebrow={LIBRARY_COPY.eyebrow}
      headline={LIBRARY_COPY.headline}
      support={LIBRARY_COPY.support}
      bullets={LIBRARY_COPY.bullets}
      side="left"
      footer={
        <Link
          href="/studio"
          className="inline-flex min-h-11 items-center gap-1.5 border-b border-[color:var(--accent-coral)] pb-1 text-[13px] font-semibold text-[color:var(--text-1)] transition-colors duration-150 hover:text-[color:var(--accent-gold)]"
        >
          Open the study studio
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      }
    >
      <StudyWorkspacePreview />
    </ExperienceSection>
  );
}
