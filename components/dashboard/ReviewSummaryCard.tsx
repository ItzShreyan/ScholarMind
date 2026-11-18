import Link from "next/link";
import { ArrowRight, CalendarClock, Flame, Layers } from "lucide-react";
import type { ReviewStats } from "@/lib/reviews/queries";

/**
 * A quiet dashboard region for real revision data.
 *
 * Every number here comes from `flashcard_reviews` — the streak counts days on
 * which a review was actually completed, and the due count is what the review
 * queue would show right now. Nothing is fabricated or estimated.
 */
export function ReviewSummaryCard({ stats }: { stats: ReviewStats }) {
  const hasDeck = stats.totalCards > 0;
  const due = stats.dueCount;

  return (
    <section className="panel rounded-token-lg p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label text-[color:var(--accent-coral)]">Revision</p>
          <h2 className="mt-2 text-xl font-semibold">
            {due > 0 ? `${due} card${due === 1 ? "" : "s"} due today` : hasDeck ? "Reviews are up to date" : "Start a review deck"}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--text-3)]">
            {hasDeck
              ? "Flashcards return exactly when you are about to forget them."
              : "Add a flashcard set you have already generated and ScholarMind will schedule it for you."}
          </p>
        </div>

        <Link
          href="/review"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-token-md bg-[color:var(--surface-3)] px-4 text-sm font-semibold text-[color:var(--text-1)] transition hover:bg-[color:var(--surface-1)]"
        >
          {due > 0 ? "Start review" : "Open reviews"}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-[color:var(--surface-border)] pt-4">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-[color:var(--text-3)]">
            <Flame aria-hidden="true" className="h-3.5 w-3.5 text-[color:var(--accent-coral)]" />
            Streak
          </dt>
          <dd className="mt-1 text-lg font-semibold">
            {stats.streak} day{stats.streak === 1 ? "" : "s"}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-[color:var(--text-3)]">
            <CalendarClock aria-hidden="true" className="h-3.5 w-3.5 text-[color:var(--accent-sky)]" />
            Reviewed today
          </dt>
          <dd className="mt-1 text-lg font-semibold">{stats.reviewedToday}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-[color:var(--text-3)]">
            <Layers aria-hidden="true" className="h-3.5 w-3.5 text-[color:var(--accent-mint)]" />
            In your deck
          </dt>
          <dd className="mt-1 text-lg font-semibold">{stats.totalCards}</dd>
        </div>
      </dl>
    </section>
  );
}
