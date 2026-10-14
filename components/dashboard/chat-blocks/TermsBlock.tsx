"use client";

import { memo } from "react";
import { BookOpen } from "lucide-react";
import { InlineMarkdown } from "@/components/dashboard/chat-blocks/InlineMarkdown";
import type { TermsData } from "@/components/dashboard/chat-blocks/parse";

/**
 * Key vocabulary as a definition list.
 *
 * `dl`/`dt`/`dd` rather than a table, because that is what this content
 * actually is — and it reflows correctly on a narrow phone panel.
 */
export const TermsBlock = memo(function TermsBlock({ data }: { data: TermsData }) {
  return (
    <section className="block-card" aria-label="Key terms">
      <header className="block-card-header">
        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
        Key terms
      </header>
      <dl className="m-0">
        {data.terms.map((item, index) => (
          <div
            key={`${item.term}-${index}`}
            className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(6rem,0.4fr)_1fr] sm:gap-4 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-[color:var(--surface-border)]"
          >
            <dt className="text-sm font-semibold text-[color:var(--accent-gold)]">
              <InlineMarkdown content={item.term} />
            </dt>
            <dd className="m-0 text-sm leading-6 text-[color:var(--text-2)]">
              <InlineMarkdown content={item.meaning} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
});
