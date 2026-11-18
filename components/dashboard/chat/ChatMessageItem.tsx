"use client";

import { memo, useState } from "react";
import { CheckCircle2, Copy, Globe2, RefreshCw } from "lucide-react";
import { m } from "framer-motion";
import { RichStudyText } from "@/components/dashboard/RichStudyText";
import { ChatThinkingIndicator } from "@/components/dashboard/ChatThinkingIndicator";
import { ReadAloudButton } from "@/components/dashboard/ReadAloudButton";
import { ShareAnswerButton } from "@/components/dashboard/ShareAnswerButton";
import { isSafeHref } from "@/lib/safe-markup";

export type ChatSourceCitation = {
  title: string;
  url: string;
  source: string;
};

export type ChatMessageMetaView = {
  /** Human label for the tier or model that actually answered. */
  answeredWith: string;
  /** The server's own explanation of an Auto decision, verbatim. */
  reason?: string;
  sources?: ChatSourceCitation[];
};

/**
 * What the research step actually did, reported by the server.
 *
 * Present only when a search ran, so the UI can honestly distinguish "did not
 * look" from "looked and found nothing".
 */
export type ChatResearchReport = {
  mode: "auto" | "off" | "on" | "deep";
  depth: "quick" | "deep";
  queries: string[];
  domains: string[];
  degraded?: string;
  conflicts: number;
};

/**
 * One message in the tutor conversation.
 *
 * The assistant is typeset, not bubbled: answers here are pages of learning
 * material, and a rounded chat bubble fights the KaTeX, the tables and the
 * headings that `RichStudyText` produces. So the answer sits directly on the
 * panel surface against a hairline gutter, at a readable measure, exactly like
 * a page in a textbook.
 *
 * The student's own question keeps a distinct surface so it is easy to find
 * when scrolling back, but it is deliberately quieter than the answer: the
 * question is context, the answer is the content.
 */
export const ChatMessageItem = memo(function ChatMessageItem({
  role,
  content,
  reasoning,
  answeredWith,
  reason,
  sources,
  startedAt,
  completedAt,
  stageLabel,
  research,
  previousQuestion,
  onRetry,
  onAskFollowUp
}: {
  role: "user" | "ai";
  content: string;
  reasoning?: string;
  answeredWith?: string;
  reason?: string;
  sources?: ChatSourceCitation[];
  startedAt?: number;
  completedAt?: number;
  stageLabel?: string | null;
  /** Absent when this turn did not search, which the UI must not imply. */
  research?: ChatResearchReport;
  /** The student's earlier question, used by "Retry". */
  previousQuestion?: string;
  onRetry?: (question: string, instructions?: string) => void;
  /** Sends a suggested follow-up, from a block action inside the answer. */
  onAskFollowUp?: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [instructions, setInstructions] = useState("");

  if (role === "user") {
    return (
      <m.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] rounded-[18px] rounded-br-[6px] border border-[color:var(--surface-border)] bg-[color:var(--surface-2)] px-4 py-2.5">
          <p className="whitespace-pre-wrap text-[13.5px] leading-6 text-[color:var(--text-2)]">
            {content}
          </p>
        </div>
      </m.div>
    );
  }

  const streaming = !content.trim();
  const thoughtSeconds =
    startedAt && completedAt ? Math.max(1, Math.round((completedAt - startedAt) / 1000)) : null;

  const copyAnswer = () => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <m.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group/answer relative pl-3 sm:pl-4"
      aria-label={answeredWith ? `Answer from ${answeredWith}` : "Tutor answer"}
    >
      {/* The gutter: a hairline that quietly marks where the answer begins. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-0 w-px bg-[linear-gradient(180deg,var(--accent-gold),transparent)] opacity-45"
      />

      <header className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-3)]">
          {answeredWith || "Tutor"}
        </span>
        {thoughtSeconds ? (
          <span className="text-[11px] tabular-nums text-[color:var(--text-3)] opacity-70">
            · {thoughtSeconds}s
          </span>
        ) : null}
      </header>

      {streaming ? (
        <ChatThinkingIndicator
          reasoning={reasoning || ""}
          startedAt={startedAt}
          tierLabel={answeredWith}
          stageLabel={stageLabel ?? null}
        />
      ) : (
        <>
          <RichStudyText
            content={content}
            onAction={onAskFollowUp ? (text) => onAskFollowUp(text) : undefined}
          />

          {reason ? (
            <p className="mt-3 text-[11px] leading-5 text-[color:var(--text-3)]">{reason}</p>
          ) : null}

          {research ? (
            <section className="mt-3 border-t border-[color:var(--surface-border)] pt-2.5">
              <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-3)]">
                <Globe2 className="h-3 w-3" aria-hidden="true" />
                {research.depth === "deep" ? "Research brief" : "Web check"}
              </h3>
              <p className="mt-1.5 text-[11px] leading-5 text-[color:var(--text-3)]">
                {research.depth === "deep"
                  ? `Ran ${research.queries.length} ${
                      research.queries.length === 1 ? "search" : "searches"
                    } across ${research.domains.length} ${
                      research.domains.length === 1 ? "domain" : "domains"
                    }${research.conflicts > 0 ? `, with ${research.conflicts} possible disagreement${research.conflicts === 1 ? "" : "s"} between sources` : ", with no disagreements between sources"}.`
                  : "One search was used for this answer."}
              </p>

              {research.queries.length ? (
                <ul className="mt-1.5 space-y-0.5">
                  {research.queries.map((query) => (
                    <li
                      key={query}
                      className="truncate text-[11px] leading-5 text-[color:var(--text-3)]"
                      title={query}
                    >
                      · {query}
                    </li>
                  ))}
                </ul>
              ) : null}

              {research.degraded ? (
                <p className="mt-1.5 text-[11px] leading-5 text-[color:var(--accent-gold)]">
                  {research.degraded}
                </p>
              ) : null}

              {research.domains.length === 1 && research.depth === "deep" ? (
                <p className="mt-1.5 text-[11px] leading-5 text-[color:var(--accent-gold)]">
                  Every source came from the same domain, so nothing here is independently corroborated.
                </p>
              ) : null}
            </section>
          ) : null}

          {sources?.length ? (
            <section className="mt-3 border-t border-[color:var(--surface-border)] pt-2.5">
              <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-3)]">
                <Globe2 className="h-3 w-3" aria-hidden="true" />
                Sources used for this answer
              </h3>
              <ol className="mt-1.5 space-y-1">
                {sources.map((source, index) => (
                  <li
                    key={`${source.url}-${index}`}
                    className="flex items-start gap-2 text-[11px] leading-5"
                  >
                    <span className="mt-px shrink-0 font-mono text-[color:var(--accent-sky)]">
                      [{index + 1}]
                    </span>
                    {isSafeHref(source.url) ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="min-w-0 flex-1 break-words text-[color:var(--text-2)] underline decoration-dotted underline-offset-2 hover:text-[color:var(--text-1)]"
                      >
                        {source.title || source.url}
                        <span className="ml-1 whitespace-nowrap text-[color:var(--text-3)]">
                          · {source.source}
                        </span>
                      </a>
                    ) : (
                      <span className="min-w-0 flex-1 break-words text-[color:var(--text-3)]">
                        {source.title}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <footer className="mt-2.5 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={copyAnswer}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium text-[color:var(--text-3)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-1)]"
              aria-label="Copy this answer"
            >
              {copied ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent-mint)]" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>

            <ReadAloudButton content={content} />
            <ShareAnswerButton content={content} />

            {previousQuestion && onRetry ? (
              <details className="group/retry">
                <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium text-[color:var(--text-3)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-1)] [&::-webkit-details-marker]:hidden">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry
                </summary>
                <div className="mt-2 w-full max-w-sm rounded-[var(--radius-md)] border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-3">
                  <button
                    type="button"
                    onClick={() => onRetry(previousQuestion)}
                    className="w-full rounded-[10px] border border-[color:var(--surface-border)] px-3 py-2 text-left text-[11px] font-semibold text-[color:var(--text-1)] transition-colors hover:border-[color:var(--accent-coral)]"
                  >
                    Answer the same question again
                  </button>
                  <form
                    className="mt-2 space-y-1.5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const next = instructions.trim();
                      if (!next) return;
                      setInstructions("");
                      onRetry(previousQuestion, next);
                    }}
                  >
                    <label
                      htmlFor={`retry-instructions-${startedAt ?? "message"}`}
                      className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-3)]"
                    >
                      Or add an instruction
                    </label>
                    <input
                      id={`retry-instructions-${startedAt ?? "message"}`}
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value)}
                      className="w-full rounded-[10px] border border-[color:var(--surface-border)] bg-transparent px-2.5 py-2 text-[11px] text-[color:var(--text-1)] outline-none focus:border-[color:var(--accent-sky)]"
                      placeholder="e.g. shorter, or with an example"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-[10px] bg-[color:var(--surface-3)] px-3 py-2 text-[11px] font-semibold text-[color:var(--text-1)]"
                    >
                      Retry with that instruction
                    </button>
                  </form>
                </div>
              </details>
            ) : null}
          </footer>
        </>
      )}
    </m.article>
  );
});
