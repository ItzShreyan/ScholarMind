"use client";

import { memo } from "react";
import { ListChecks } from "lucide-react";
import { InlineMarkdown } from "@/components/dashboard/chat-blocks/InlineMarkdown";
import type { CheckData } from "@/components/dashboard/chat-blocks/parse";

/**
 * A short verification of the working that was just shown.
 *
 * Uses the cool accent so it never competes with the amber primary action or
 * the mint final answer.
 */
export const CheckBlock = memo(function CheckBlock({ data }: { data: CheckData }) {
  return (
    <section className="block-card" aria-label={`Check: ${data.title}`}>
      <header className="block-card-header text-[color:var(--accent-sky)]">
        <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
        {data.title}
      </header>
      <div className="px-4 py-3 text-sm leading-7 text-[color:var(--text-2)]">
        <InlineMarkdown content={data.body} />
      </div>
    </section>
  );
});
