import Link from "next/link";
import { ArrowDown, ArrowRight, Moon, Sparkles } from "lucide-react";
import { DeferredLearningWorld } from "@/components/landing/DeferredLearningWorld";
import { Container } from "@/components/ui/Container";
import { buttonVariants } from "@/components/ui/button-variants";
import { WORLD_SPACES } from "@/components/world/worldSpaces";

/**
 * The opening.
 *
 * Reference A's composition, built from real product parts rather than a render:
 * you stand in a dark study, the lamp is on behind you, and the campus is
 * visible through the window. The window *is* the learning world — the same
 * interactive canvas that appears further down the page, not a picture of it.
 *
 * The copy is deliberately off-centre and left-aligned. A centred headline on a
 * gradient is the generic-SaaS shape this redesign exists to avoid.
 */

const facts = [
  { value: "5", label: "spaces, each one a real page" },
  { value: "Your sources", label: "answers grounded in what you upload" },
  { value: "Pro · Flash · Auto", label: "and the model that replied is named" }
];

/** Six motes, hand-placed so they cluster near the lamp rather than scattering. */
const MOTES = [
  { left: "6%", top: "68%", delay: "0s", duration: "19s" },
  { left: "14%", top: "82%", delay: "3.2s", duration: "22s" },
  { left: "22%", top: "61%", delay: "6.4s", duration: "17s" },
  { left: "9%", top: "44%", delay: "9.1s", duration: "24s" },
  { left: "31%", top: "74%", delay: "1.6s", duration: "20s" },
  { left: "18%", top: "35%", delay: "12.4s", duration: "21s" }
];

export function StudyRoomHero() {
  return (
    <section className="room-wall relative isolate overflow-hidden">
      {/* Dust in the lamp light. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {MOTES.map((mote) => (
          <span
            key={`${mote.left}-${mote.top}`}
            className="room-mote absolute h-[3px] w-[3px] rounded-full bg-[var(--accent-gold)]"
            style={{
              left: mote.left,
              top: mote.top,
              animationDelay: mote.delay,
              animationDuration: mote.duration
            }}
          />
        ))}
      </div>

      <Container className="relative py-10 sm:py-14 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-12">
          {/* ---- The room: copy on the wall -------------------------------- */}
          <div className="max-w-xl">
            <p className="label flex items-center gap-2 text-[color:var(--accent-coral)]">
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              Night before the exam
            </p>

            <h1 className="mt-4 font-display text-[clamp(2.25rem,5.2vw,3.75rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-[color:var(--text-1)]">
              Your study journey,
              <br />
              <span className="text-[color:var(--accent-gold)]">reimagined as a place.</span>
            </h1>

            <p className="mt-5 text-sm leading-7 text-[color:var(--text-2)] sm:text-base">
              ScholarMind turns your own notes into a small campus you can walk through:
              a library for what you uploaded, an observatory for the topic that has not
              clicked, a practice hall for testing yourself, and a garden for spacing
              revision over the weeks before an exam.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth"
                className={`${buttonVariants({ size: "lg" })} w-full justify-center sm:w-auto`}
              >
                Enter the learning world
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/ai-study-assistant"
                className={`${buttonVariants({ size: "lg", variant: "secondary" })} w-full justify-center sm:w-auto`}
              >
                Try the tutor first
              </Link>
            </div>

            <dl className="mt-8 grid gap-4 border-t border-[color:var(--surface-border)] pt-5 sm:grid-cols-3 sm:gap-3">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="font-display text-sm font-semibold text-[color:var(--text-1)]">
                    {fact.value}
                  </dt>
                  <dd className="mt-0.5 text-[11px] leading-5 text-[color:var(--text-3)]">
                    {fact.label}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 flex items-center gap-1.5 text-[11px] text-[color:var(--text-3)]">
              <Sparkles className="h-3 w-3 text-[color:var(--accent-coral)]" aria-hidden="true" />
              Every building here opens a page that already exists.
            </p>
          </div>

          {/* ---- The window: the campus, lit ------------------------------- */}
          <div className="relative">
            <div
              aria-hidden="true"
              className="room-spill pointer-events-none absolute -inset-x-8 -inset-y-10 -z-10 blur-2xl"
            />

            <div className="relative rounded-[32px] border border-[rgba(220,165,102,0.3)] bg-[color:var(--surface-1)] p-2 shadow-[0_48px_110px_rgba(0,0,0,0.62)]">
              {/* Corner brackets: the frame reads as joinery, not a card. */}
              <span aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 border-l border-t border-[rgba(233,206,154,0.5)]" />
              <span aria-hidden="true" className="absolute right-3 top-3 h-4 w-4 border-r border-t border-[rgba(233,206,154,0.5)]" />
              <span aria-hidden="true" className="absolute bottom-3 left-3 h-4 w-4 border-b border-l border-[rgba(233,206,154,0.5)]" />
              <span aria-hidden="true" className="absolute bottom-3 right-3 h-4 w-4 border-b border-r border-[rgba(233,206,154,0.5)]" />

              <div className="overflow-hidden rounded-[24px]">
                <DeferredLearningWorld />
              </div>
            </div>

            {/* The sill. */}
            <div
              aria-hidden="true"
              className="mx-6 mt-2 h-px bg-[linear-gradient(90deg,transparent,rgba(233,206,154,0.42),transparent)]"
            />

            <p className="mx-auto mt-3 max-w-md text-center text-[11px] leading-5 text-[color:var(--text-3)]">
              {WORLD_SPACES.length} places, one account. Drag to look around — or read them
              as a list.
            </p>
          </div>
        </div>

        <a
          href="#places"
          className="mt-10 inline-flex min-h-11 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-3)] transition-colors duration-150 hover:text-[color:var(--text-1)]"
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          What each place is for
        </a>
      </Container>
    </section>
  );
}
