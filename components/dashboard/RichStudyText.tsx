"use client";

import React, { memo, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ExternalLink } from "lucide-react";
import { BlockActionContext, readBlockLanguage, renderChatBlock } from "@/components/dashboard/chat-blocks";
import { StudyCodeBlock } from "@/components/dashboard/study-text/StudyCodeBlock";
import { StudyMermaid } from "@/components/dashboard/study-text/StudyMermaid";
import { StudyCallout, type CalloutKind } from "@/components/dashboard/study-text/StudyCallout";
import { extractCallouts, readCalloutFenceLanguage } from "@/lib/markdown-callouts";
import { prepareStudyContent } from "@/lib/markdown-math";
import { isSafeHref } from "@/lib/safe-markup";

/**
 * The tutor's answer, typeset.
 *
 * This is the most-read surface in ScholarMind, so it is built like a page of a
 * textbook rather than like a chat bubble:
 *
 *   - measure is constrained, so lines stay readable at any panel width
 *   - headings carry hierarchy instead of being bold paragraphs
 *   - tables scroll horizontally rather than pushing the panel wider
 *   - display equations get their own line and never overflow
 *   - code is labelled and copyable
 *   - callouts are annotated, not shouted
 *
 * Two rendering rules matter for safety:
 *   1. links are only rendered as links when `isSafeHref` approves the target;
 *      anything else becomes plain text rather than a dead or dangerous anchor
 *   2. fenced blocks are handled by the `pre` override alone. React Markdown
 *      applies overrides recursively, so overriding `code` as well would mean a
 *      block reached `pre` already wrapped — inline code is styled by CSS.
 */

/** Flatten rendered children back to text (used for callout/label detection). */
function nodeToText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);

  if (Array.isArray(node)) return node.map(nodeToText).join("");

  const element = node as React.ReactElement<{ children?: React.ReactNode }>;
  if (element?.props?.children) return nodeToText(element.props.children);

  return "";
}

const CALLOUT_KIND_MAP: Record<string, CalloutKind> = {
  note: "NOTE",
  tip: "TIP",
  important: "IMPORTANT",
  warning: "WARNING",
  caution: "CAUTION"
};

/** Language label for a `<pre>`'s child `<code>`. */
function readCodeClassName(children: React.ReactNode): string | undefined {
  const first = React.Children.toArray(children)[0] as
    | React.ReactElement<{ className?: string }>
    | undefined;
  return first?.props?.className;
}

/**
 * A single markdown render pass.
 *
 * Callouts re-enter here with `depth` raised, because a callout body is
 * markdown in its own right. Depth is capped so a pathological answer cannot
 * recurse indefinitely.
 */
function MarkdownBody({
  markdown,
  components,
  depth: _depth
}: {
  markdown: string;
  components: Components;
  depth: number;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={components}
    >
      {markdown}
    </ReactMarkdown>
  );
}

export const RichStudyText = memo(function RichStudyText({
  content,
  compact = false,
  onAction
}: {
  content: string;
  compact?: boolean;
  /**
   * Optional. Supplied only by the chat message render, which is the one place
   * with a send function. When absent, interactive blocks render their static
   * form so no button ever leads nowhere.
   */
  onAction?: (text: string) => void;
}) {
  const prepared = useMemo(() => extractCallouts(prepareStudyContent(content)), [content]);

  const components = useMemo<Components>(() => {
    /*
     * Fenced blocks. The only place blocks are handled — see the file comment
     * for why `code` is not overridden.
     */
    const renderFence = (children: React.ReactNode, depth: number): React.ReactElement | null => {
      const className = readCodeClassName(children);
      const code = nodeToText(children).replace(/\n$/, "");

      const calloutKind = readCalloutFenceLanguage(className);
      if (calloutKind) {
        const kind = CALLOUT_KIND_MAP[calloutKind];
        // Re-parse the body so markdown inside a callout still works.
        return (
          <StudyCallout kind={kind}>
            {depth < 2 ? (
              <MarkdownBody markdown={code} components={components} depth={depth + 1} />
            ) : (
              <p>{code}</p>
            )}
          </StudyCallout>
        );
      }

      if (/language-mermaid/i.test(className ?? "")) {
        return <StudyMermaid chart={code} />;
      }

      const blockLanguage = readBlockLanguage(className);
      if (blockLanguage) {
        const block = renderChatBlock(blockLanguage, code);
        if (block) return block;
      }

      return <StudyCodeBlock code={code} className={className} />;
    };

    const build = (depth: number): Components => ({
      pre: ({ children }) => renderFence(children, depth),

      a: ({ href, children, ...rest }) => {
        // Never render an unsafe target. The text is still readable.
        if (!isSafeHref(href)) {
          return <span className="study-link-blocked">{children}</span>;
        }

        const isExternal = typeof href === "string" && /^https?:/i.test(href);

        return (
          <a
            {...rest}
            href={href}
            className="study-link"
            {...(isExternal ? { target: "_blank", rel: "noreferrer noopener" } : {})}
          >
            {children}
            {isExternal ? (
              <ExternalLink className="study-link-icon" aria-hidden="true" />
            ) : null}
          </a>
        );
      },

      table: ({ children }) => (
        <div className="study-table-wrap" tabIndex={0} role="region" aria-label="Table">
          <table className="study-table">{children}</table>
        </div>
      ),

      img: ({ src, alt }) => {
        // Answers should not pull remote images into a study page.
        if (typeof src !== "string" || !isSafeHref(src)) {
          return alt ? <span className="study-link-blocked">[{alt}]</span> : null;
        }
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt ?? ""} className="study-image" loading="lazy" />
        );
      }
    });

    return build(0);
  }, []);

  return (
    <BlockActionContext.Provider value={onAction ?? null}>
      <div
        className={`rich-study-text ${compact ? "rich-study-text-compact" : ""}`}
        data-compact={compact ? "true" : "false"}
      >
        <MarkdownBody markdown={prepared} components={components} depth={0} />
      </div>
    </BlockActionContext.Provider>
  );
});
