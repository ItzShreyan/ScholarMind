import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FlashcardReviewQueue } from "@/components/dashboard/FlashcardReviewQueue";
import { loadDueCards, loadImportableDecks, loadReviewStats, type ImportableDeck, type ReviewCard, type ReviewStats } from "@/lib/reviews/queries";

export const metadata = {
  title: "Reviews",
  description: "Review the flashcards that are due today, scheduled with spaced repetition."
};

export const dynamic = "force-dynamic";

const EMPTY_STATS: ReviewStats = {
  dueCount: 0,
  totalCards: 0,
  reviewedToday: 0,
  streak: 0,
  newCount: 0
};

/**
 * Spaced-repetition review queue.
 *
 * If the `flashcard_reviews` migration has not been applied to this database
 * yet, the page says so plainly instead of failing — the rest of the product
 * carries on working.
 */
export default async function ReviewPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  let due: ReviewCard[] = [];
  let stats: ReviewStats = EMPTY_STATS;
  let decks: ImportableDeck[] = [];
  let setupRequired = false;

  try {
    [due, stats, decks] = await Promise.all([
      loadDueCards(supabase, user.id),
      loadReviewStats(supabase, user.id),
      loadImportableDecks(supabase, user.id)
    ]);
  } catch {
    setupRequired = true;
  }

  return (
    <>
      <DashboardHeader
        email={user.email}
        firstName={typeof user.user_metadata?.first_name === "string" ? user.user_metadata.first_name : undefined}
      />

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 md:px-6">
        <Link
          href="/dashboard"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-[color:var(--text-3)] transition hover:text-[color:var(--text-1)]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to dashboard
        </Link>

        <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label text-[color:var(--accent-coral)]">Spaced repetition</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Due today</h1>
            <p className="mt-2 max-w-xl text-sm text-[color:var(--text-3)]">
              Your flashcards come back exactly when you are about to forget them. Grade each one
              honestly — the schedule does the rest.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-token-md bg-[color:var(--surface-2)] px-4 py-3 text-sm">
            <CalendarClock aria-hidden="true" className="h-4 w-4 text-[color:var(--accent-sky)]" />
            <span className="font-semibold">{stats.dueCount}</span>
            <span className="text-[color:var(--text-3)]">due</span>
          </div>
        </header>

        <div className="mt-6">
          {setupRequired ? (
            <section className="panel rounded-token-lg p-5">
              <h2 className="text-lg font-semibold">Reviews need one setup step.</h2>
              <p className="mt-2 text-sm text-[color:var(--text-3)]">
                Run <code className="rounded bg-[color:var(--surface-3)] px-1.5 py-0.5">supabase/migration_flashcard_reviews.sql</code>{" "}
                in your Supabase SQL editor to create the review schedule table. Everything else keeps working
                until then.
              </p>
            </section>
          ) : (
            <FlashcardReviewQueue initialDue={due} initialStats={stats} initialDecks={decks} />
          )}
        </div>
      </main>
    </>
  );
}
