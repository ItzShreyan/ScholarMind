"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

/**
 * Renders a short fragment of model markdown with maths enabled.
 *
 * Used inside block rows, so paragraphs are unwrapped into fragments — a `<p>`
 * inside an `<li>` or a flex row adds unwanted vertical rhythm. Everything goes
 * through ReactMarkdown with KaTeX trust left OFF; there is no
 * `dangerouslySetInnerHTML` anywhere in the block pipeline.
 */
export const InlineMarkdown = memo(function InlineMarkdown({
  content,
  className = ""
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={`wrap-anywhere [&_.katex]:text-[1.05em] [&_.katex-display]:my-2 [&_.katex-display]:overflow-x-auto ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <>{children}</>,
          a: ({ children, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent-sky)] underline underline-offset-4"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-1">{children}</ol>,
          code: ({ children, className: codeClassName, ...props }) => (
            <code
              {...props}
              className={`rounded bg-black/20 px-1.5 py-0.5 font-mono text-[0.92em] text-[var(--accent-gold)] ${codeClassName ?? ""}`}
            >
              {children}
            </code>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
