"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { CalendarClock, CheckCircle2, Flame, Layers, RotateCcw } from "lucide-react";
import type { ImportableDeck, ReviewCard, ReviewStats } from "@/lib/reviews/queries";
import { GRADE_SHORTCUT, ReviewGradeButtons } from "@/components/dashboard/ReviewGradeButtons";
import type { ReviewGrade } from "@/lib/srs";
import { panelSwap, tierVariants } from "@/lib/motion";
import { useMotionTier } from "@/hooks/useMotionTier";
import { toast } from "@/lib/toast";
import { cn } from "@/components/ui/cn";

type QueueState = {
  due: ReviewCard[];
  stats: ReviewStats;
  decks: ImportableDeck[];
};

const EMPTY_STATS: ReviewStats = {
  dueCount: 0,
  totalCards: 0,
  reviewedToday: 0,
  streak: 0,
  newCount: 0
};

/**
 * "Due today" review queue.
 *
 * Four outcomes, each showing the interval it schedules. Grading is applied on
 * the server, and the counts come back with the response, so what is on screen
 * is always what is stored.
 */
export function FlashcardReviewQueue({
  initialDue,
  initialStats,
  initialDecks
}: {
  initialDue: ReviewCard[];
  initialStats: ReviewStats;
  initialDecks: ImportableDeck[];
}) {
  const { tier } = useMotionTier();
  const [state, setState] = useState<QueueState>({
    due: initialDue,
    stats: initialStats ?? EMPTY_STATS,
    decks: initialDecks
  });
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [gradedCount, setGradedCount] = useState(0);

  const current = state.due[0];

  const grade = useCallback(
    async (outcome: ReviewGrade) => {
      if (!current || busy) return;
      setBusy(true);
      const optimistic = state.due.slice(1);

      try {
        const response = await fetch("/api/flashcards/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "grade", cardId: current.cardId, grade: outcome })
        });
        const json = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(typeof json.error === "string" ? json.error : "Unable to save that review.");
        }

        setState((previous) => ({
          ...previous,
          due: optimistic,
          stats: json.stats ?? previous.stats
        }));
        setGradedCount((count) => count + 1);
        setRevealed(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save that review.", {
          description: "Your answer was not lost — try again."
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, current, state.due]
  );

  // Keyboard grading: 1–4 grades once the answer is showing, space reveals it.
  useEffect(() => {
    if (!current) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) {
        return;
      }

      if (event.key === " " || event.key === "Enter") {
        if (!revealed) {
          event.preventDefault();
          setRevealed(true);
        }
        return;
      }

      const entry = (Object.entries(GRADE_SHORTCUT) as Array<[ReviewGrade, string]>).find(
        ([, key]) => key === event.key
      );
      if (entry && revealed) {
        event.preventDefault();
        void grade(entry[0]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, grade, revealed]);

  const importDeck = useCallback(async (deck: ImportableDeck) => {
    setImportingId(deck.resultId);

    try {
      const response = await fetch("/api/flashcards/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", resultId: deck.resultId, sessionId: deck.sessionId })
      });
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Unable to add those cards.");
      }

      setState({
        due: json.due ?? [],
        stats: json.stats ?? EMPTY_STATS,
        decks: json.decks ?? []
      });
      setRevealed(false);
      toast.success(`${json.imported ?? deck.newCards} cards added to today's review.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add those cards.", {
        description: "The flashcard set is still safe in its studio."
      });
    } finally {
      setImportingId(null);
    }
  }, []);

  const statsRow = useMemo(
    () => [
      { icon: Flame, label: "Study streak", value: `${state.stats.streak} day${state.stats.streak === 1 ? "" : "s"}` },
      { icon: CalendarClock, label: "Due now", value: String(state.due.length) },
      { icon: CheckCircle2, label: "Reviewed today", value: String(state.stats.reviewedToday) },
      { icon: Layers, label: "In your deck", value: String(state.stats.totalCards) }
    ],
    [state.due.length, state.stats]
  );

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statsRow.map((stat) => (
          <div key={stat.label} className="panel rounded-token-lg p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-3)]">
              <stat.icon aria-hidden="true" className="h-3.5 w-3.5 text-[color:var(--accent-coral)]" />
              {stat.label}
            </dt>
            <dd className="mt-2 text-2xl font-semibold text-[color:var(--text-1)]">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {current ? (
        <section className="panel rounded-token-lg p-5" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-3)]">
            Card {gradedCount + 1} of {gradedCount + state.due.length}
          </p>

          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={current.cardId}
              variants={tierVariants(tier, panelSwap)}
              initial={tier === "off" ? undefined : "hidden"}
              animate={tier === "off" ? undefined : "visible"}
              exit={tier === "off" ? undefined : "exit"}
              className="mt-4"
            >
              <p className="text-xl font-semibold leading-snug text-[color:var(--text-1)]">{current.front}</p>

              {revealed ? (
                <div className="reading-surface mt-4 rounded-token-md p-4">
                  <p className="text-sm leading-relaxed">{current.back}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-[color:var(--text-3)]">
                  Answer it in your head or on paper first — that is what makes it stick.
                </p>
              )}
            </m.div>
          </AnimatePresence>

          <div className="mt-5">
            {revealed ? (
              <ReviewGradeButtons state={current.state} disabled={busy} onGrade={(outcome) => void grade(outcome)} />
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-token-md bg-[color:var(--surface-3)] px-4 text-sm font-semibold text-[color:var(--text-1)] transition hover:bg-[color:var(--surface-2)]"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Show answer
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="panel rounded-token-lg p-5">
          <h2 className="text-lg font-semibold">Nothing is due right now.</h2>
          <p className="mt-2 text-sm text-[color:var(--text-3)]">
            Spaced repetition works because of the gaps — the next batch will appear here when it is time.
            {gradedCount > 0 ? ` You reviewed ${gradedCount} card${gradedCount === 1 ? "" : "s"} just now.` : ""}
          </p>
        </section>
      )}

      {state.decks.length ? (
        <section className="panel rounded-token-lg p-5">
          <h2 className="text-sm font-semibold">Add flashcards to your review deck</h2>
          <p className="mt-1 text-sm text-[color:var(--text-3)]">
            Every flashcard set you have generated, ready to be scheduled.
          </p>
          <ul className="mt-4 space-y-2">
            {state.decks.map((deck) => (
              <li
                key={deck.resultId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-token-md bg-[color:var(--surface-2)] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[color:var(--text-1)]">{deck.title}</p>
                  <p className="text-xs text-[color:var(--text-3)]">
                    {deck.newCards} new card{deck.newCards === 1 ? "" : "s"}
                    {deck.totalCards > deck.newCards ? ` of ${deck.totalCards}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={importingId !== null}
                  onClick={() => void importDeck(deck)}
                  className={cn(
                    "inline-flex min-h-[44px] items-center rounded-token-md px-4 text-sm font-semibold transition",
                    "bg-[color:var(--surface-3)] text-[color:var(--text-1)] hover:bg-[color:var(--surface-1)]",
                    importingId !== null && "opacity-55"
                  )}
                >
                  {importingId === deck.resultId ? "Adding…" : "Add to reviews"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
