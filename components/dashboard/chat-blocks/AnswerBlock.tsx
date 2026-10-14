"use client";

import { memo } from "react";
import { CheckCircle2 } from "lucide-react";
import { InlineMarkdown } from "@/components/dashboard/chat-blocks/InlineMarkdown";
import type { AnswerData } from "@/components/dashboard/chat-blocks/parse";

/**
 * The final, boxed result.
 *
 * Deliberately quiet: a labelled pill, not a glow. The icon and the visible
 * "Final answer" text both carry the meaning, so the state never depends on the
 * mint accent alone.
 */
export const AnswerBlock = memo(function AnswerBlock({ data }: { data: AnswerData }) {
  return (
    <div className="my-4 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--accent-mint)]">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        Final answer
      </span>
      <span className="answer-pill text-sm">
        <InlineMarkdown content={data.answer} className="inline" />
      </span>
    </div>
  );
});
