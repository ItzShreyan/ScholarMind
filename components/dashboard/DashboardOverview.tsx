import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Compass,
  FileStack,
  FolderOpen,
  MessageSquare,
  NotebookPen,
  Sparkles
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { StudioShelf } from "@/components/dashboard/StudioShelf";

type Session = { id: string; title: string; created_at?: string };

/**
 * The dashboard.
 *
 * The governing idea is that a student arriving here should not have to decide
 * what to do — the most recently touched studio is the largest thing on the
 * page, and everything else is either a genuine next step or a real number.
 *
 * Two rules are enforced throughout:
 *
 *   1. Nothing is invented. The studio and file counts come straight from the
 *      database; the revision region is rendered by the page and omitted
 *      entirely when there is no review data, so an empty card can never
 *      promise a streak that does not exist.
 *   2. The page is not a grid of identical cards. Continue, revision and the
 *      studio shelf are three different shapes because they are three
 *      different jobs: resume, schedule, browse.
 */
export function DashboardOverview({
  sessions,
  fileCount,
  firstName,
  reviewSummary
}: {
  sessions: Session[];
  fileCount: number;
  /** Preferred name from onboarding, when the account has one. */
  firstName?: string;
  /**
   * The revision region, rendered by the dashboard page so it can be omitted
   * entirely when there is no review data to show — better than an empty card
   * promising a streak that does not exist.
   */
  reviewSummary?: React.ReactNode;
}) {
  const current = sessions[0] ?? null;
  const otherStudios = sessions.slice(1, 4);
  const hasStudios = sessions.length > 0;

  return (
    <Container className="py-6">
      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div>
          <p className="label text-[color:var(--accent-gold)]">Your desk</p>

          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-[color:var(--text-1)] sm:text-4xl">
            {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-7 text-[color:var(--text-3)]">
            {current
              ? "The studio you were last in is open below. Your notes, the tutor and the study tools stay in the same place."
              : "Start by creating a studio, then add the notes you already revise from. Everything else in ScholarMind works from those sources."}
          </p>

          {/* Continue — the one action this page exists to offer. */}
          {current ? (
            <Link
              href={`/dashboard/workspace/${current.id}`}
              className="group mt-5 block rounded-[var(--radius-xl)] border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-5 transition-colors duration-150 hover:border-[color:var(--accent-gold)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-3)]">
                    <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
                    Continue studying
                  </p>
                  <p className="mt-2 truncate font-display text-xl font-semibold text-[color:var(--text-1)]">
                    {current.title}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-[color:var(--text-3)]">
                    Sources, tutor chat, quizzes, flashcards and notes for this studio.
                  </p>
                </div>

                <span className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[color:var(--accent-gold)] px-4 text-xs font-semibold text-[#1a1208] transition-transform duration-150 group-hover:translate-x-0.5">
                  Open studio
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          ) : (
            <div className="mt-5 rounded-[var(--radius-xl)] border border-dashed border-[color:var(--surface-border)] p-5">
              <p className="font-display text-lg font-semibold text-[color:var(--text-1)]">
                No studio yet
              </p>
              <p className="mt-1.5 text-sm leading-7 text-[color:var(--text-3)]">
                Create one below and give it the name of the class, chapter or exam it covers.
              </p>
            </div>
          )}

          {/* Real counts only. No streaks, no mastery, no invented progress. */}
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--radius-lg)] border border-[color:var(--surface-border)] px-4 py-3">
              <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-3)]">
                <FolderOpen className="h-3 w-3" aria-hidden="true" />
                Studios
              </dt>
              <dd className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-[color:var(--text-1)]">
                {sessions.length}
              </dd>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[color:var(--surface-border)] px-4 py-3">
              <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-3)]">
                <FileStack className="h-3 w-3" aria-hidden="true" />
                Sources uploaded
              </dt>
              <dd className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-[color:var(--text-1)]">
                {fileCount}
              </dd>
            </div>
            <div className="col-span-2 rounded-[var(--radius-lg)] border border-[color:var(--surface-border)] px-4 py-3 sm:col-span-1">
              <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-3)]">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Preview
              </dt>
              <dd className="mt-1.5 text-xs leading-6 text-[color:var(--text-2)]">
                Every tool is open
              </dd>
            </div>
          </dl>

          {otherStudios.length ? (
            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-3)]">
                Recently used
              </p>
              <ul className="mt-2 divide-y divide-[color:var(--surface-border)]">
                {otherStudios.map((studio) => (
                  <li key={studio.id}>
                    <Link
                      href={`/dashboard/workspace/${studio.id}`}
                      className="flex min-h-11 items-center justify-between gap-3 py-2.5 text-sm text-[color:var(--text-2)] transition-colors hover:text-[color:var(--text-1)]"
                    >
                      <span className="truncate">{studio.title}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/*
         * The learning world, as a door rather than a decoration. It links to
         * the same list of real destinations the 3D campus renders.
         */}
        <aside className="rounded-[var(--radius-xl)] border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-3)]">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            The learning world
          </p>
          <p className="mt-2 font-display text-lg font-semibold text-[color:var(--text-1)]">
            Five places, five different jobs.
          </p>
          <p className="mt-1.5 text-xs leading-6 text-[color:var(--text-3)]">
            A library for your material, an observatory for what has not clicked, a practice hall for
            testing yourself, a garden for spacing revision, and this desk.
          </p>

          <ul className="mt-3 space-y-1.5">
            {[
              { label: "Library", href: "/studio", Icon: BookOpen },
              { label: "Observatory", href: "/ai-study-assistant", Icon: MessageSquare },
              { label: "Practice hall", href: "/quiz-maker", Icon: Sparkles },
              { label: "Revision garden", href: "/revision-planner", Icon: Compass }
            ].map(({ label, href, Icon }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] px-2 text-sm text-[color:var(--text-2)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-1)]"
                >
                  <Icon className="h-3.5 w-3.5 text-[color:var(--accent-sky)]" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href="/#places"
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-[color:var(--accent-sky)]"
          >
            Walk through the world
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </aside>
      </section>

      {reviewSummary ? <div className="mt-5">{reviewSummary}</div> : null}

      {hasStudios ? <StudioShelf initialStudios={sessions} /> : <StudioShelf initialStudios={[]} />}
    </Container>
  );
}
