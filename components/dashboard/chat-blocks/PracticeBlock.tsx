"use client";

import { memo, useState } from "react";
import { Check, Lightbulb, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useBlockAction } from "@/components/dashboard/chat-blocks/BlockActionContext";
import { InlineMarkdown } from "@/components/dashboard/chat-blocks/InlineMarkdown";
import type { PracticeData } from "@/components/dashboard/chat-blocks/parse";

/**
 * An interactive practice question.
 *
 * With a send function available (the chat message render) this becomes a real
 * control: type an answer, submit it, and the tutor marks it. Without one (the
 * six saved-output call sites) it degrades to a static question — no dead
 * buttons anywhere.
 *
 * The submitted state is announced in text as well as by the icon, so it never
 * depends on colour.
 */
export const PracticeBlock = memo(function PracticeBlock({ data }: { data: PracticeData }) {
  const onAction = useBlockAction();
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);

  const interactive = typeof onAction === "function";
  const answeredSomething = value.trim().length > 0;

  const submit = () => {
    if (!onAction || !answeredSomething || submitted) return;
    onAction(
      `My answer to: ${data.question} is: ${value.trim()}. Mark it and explain.`
    );
    setSubmitted(true);
  };

  return (
    <section className="block-card" aria-label="Practice question">
      <header className="block-card-header text-[color:var(--accent-coral)]">
        <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
        Your turn
      </header>

      <div className="space-y-3 px-4 py-3">
        <div className="text-sm font-medium leading-7 text-[color:var(--text-1)]">
          <InlineMarkdown content={data.question} />
        </div>

        {hintOpen && data.hint ? (
          <div className="rounded-[var(--radius-md)] border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] px-3 py-2 text-xs leading-6 text-[color:var(--text-2)]">
            <span className="font-semibold text-[color:var(--text-1)]">Hint: </span>
            <InlineMarkdown content={data.hint} className="inline" />
          </div>
        ) : null}

        {interactive ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <label
              className="block text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-3)]"
              htmlFor="chat-practice-answer"
            >
              Your answer
            </label>

            <input
              id="chat-practice-answer"
              className="block-input"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={data.placeholder}
              disabled={submitted}
              autoComplete="off"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" disabled={submitted || !answeredSomething}>
                {submitted ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    Sent
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    Check my answer
                  </>
                )}
              </Button>

              {data.hint ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setHintOpen((current) => !current)}
                  aria-expanded={hintOpen}
                >
                  <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                  {hintOpen ? "Hide hint" : "Show hint"}
                </Button>
              ) : null}
            </div>
          </form>
        ) : data.hint ? (
          <details className="rounded-[var(--radius-md)] border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-[color:var(--text-2)]">
              Show hint
            </summary>
            <div className="mt-2 text-xs leading-6 text-[color:var(--text-2)]">
              <InlineMarkdown content={data.hint} />
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
});
