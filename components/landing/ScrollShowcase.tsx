"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

const sceneCards = [
  {
    eyebrow: "Upload",
    title: "Drop lecture slides, textbook pages, or a transcript into one session.",
    copy: "The session becomes the source of truth for summary, questions, and follow-up revision."
  },
  {
    eyebrow: "Summarise",
    title: "Condense long material into the points worth revising first.",
    copy: "Dense content is reduced to a short study sheet with key ideas, definitions, and likely weak spots."
  },
  {
    eyebrow: "Practise",
    title: "Turn the same material into quizzes, flashcards, and next-step review prompts.",
    copy: "Instead of rewriting notes by hand, students move straight into active recall."
  }
];

export function ScrollShowcase() {
  const ref = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1024px)");
    const sync = () => setIsCompact(mediaQuery.matches);
    sync();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", sync);
      return () => mediaQuery.removeEventListener("change", sync);
    }
    mediaQuery.addListener(sync);
    return () => mediaQuery.removeListener(sync);
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 24, mass: 0.3 });
  const boardRotateX = useTransform(progress, [0, 0.5, 1], prefersReducedMotion ? [0, 0, 0] : [9, 2, -1]);
  const boardRotateY = useTransform(progress, [0, 0.5, 1], prefersReducedMotion ? [0, 0, 0] : [-8, 0, 6]);
  const boardScale = useTransform(progress, [0, 0.5, 1], [0.96, 1, 1.02]);
  const boardY = useTransform(progress, [0, 0.5, 1], [28, 0, -16]);

  const leftCardY = useTransform(progress, [0, 0.5, 1], [34, 10, -10]);
  const leftCardRotate = useTransform(progress, [0, 0.5, 1], [-10, -7, -4]);
  const rightCardY = useTransform(progress, [0, 0.5, 1], [24, 8, -8]);
  const rightCardRotate = useTransform(progress, [0, 0.5, 1], [10, 7, 4]);
  const bottomCardY = useTransform(progress, [0, 0.5, 1], [20, 8, -8]);
  const bottomCardScale = useTransform(progress, [0, 0.5, 1], [0.96, 1, 1.02]);
  const auraScale = useTransform(progress, [0, 1], isCompact ? [0.92, 1.04] : [0.88, 1.12]);
  const auraOpacity = useTransform(progress, [0, 0.4, 1], [0.16, 0.28, 0.18]);
  const summaryWidth = useTransform(progress, [0, 1], ["42%", "90%"]);
  const questionsWidth = useTransform(progress, [0, 1], ["36%", "82%"]);
  const flashcardsWidth = useTransform(progress, [0, 1], ["28%", "76%"]);

  const outputCards = [
    { label: "Summary", value: "Short key-point sheet", width: summaryWidth },
    { label: "Questions", value: "Custom quiz prompts", width: questionsWidth },
    { label: "Flashcards", value: "Recall set", width: flashcardsWidth }
  ];

  return (
    <section ref={ref} className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent-coral)]">
          Study Flow
        </p>
        <h2 className="mt-3 text-4xl font-semibold md:text-5xl">
          Move from raw material to active recall in one pass.
        </h2>
        <p className="muted mt-3 text-sm md:text-base">
          Upload first, then summarise, ask questions, generate flashcards, build a quiz, and set up the
          next review session.
        </p>
      </div>

      <div className="panel panel-border relative overflow-hidden rounded-[34px] px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mesh-overlay absolute inset-0 opacity-30" />
        <motion.div
          style={{ scale: auraScale, opacity: auraOpacity }}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,209,102,0.28),rgba(255,125,89,0.1)_44%,transparent_70%)] blur-2xl sm:h-[22rem] sm:w-[22rem] lg:h-[25rem] lg:w-[25rem]"
        />
        <motion.div
          style={{ scale: auraScale }}
          className="pointer-events-none absolute inset-x-8 top-8 h-24 rounded-full bg-[rgba(57,208,255,0.14)] blur-3xl sm:inset-x-12 sm:h-28 lg:inset-x-16 lg:h-32"
        />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-sky)]">
              One Session, Many Outputs
            </p>
            <p className="mt-2 text-sm">
              A student can keep the source material, the condensed explanation, and the practice layer
              connected inside one study stack.
            </p>
          </div>
          <div className="glass rounded-full px-4 py-2 text-xs font-medium">
            Text • Images • PDFs • Transcripts
          </div>
        </div>

        <div className="perspective-stage relative z-10 mt-6 grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)_15rem] lg:grid-rows-[1fr_auto]">
          <motion.article
            style={{ y: leftCardY, rotate: leftCardRotate }}
            className="glass will-change-transform self-center rounded-[28px] p-4 shadow-[0_24px_60px_rgba(255,125,89,0.18)]"
          >
            <div className="mb-4 h-1.5 w-14 rounded-full bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-gold))]" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
              {sceneCards[0].eyebrow}
            </p>
            <h3 className="mt-2 text-lg font-semibold">{sceneCards[0].title}</h3>
            <p className="muted mt-2 text-sm">{sceneCards[0].copy}</p>
          </motion.article>

          <motion.div
            style={{
              rotateX: boardRotateX,
              rotateY: boardRotateY,
              scale: boardScale,
              y: boardY,
              transformPerspective: 1800
            }}
            className="panel-border will-change-transform relative rounded-[34px] border border-white/15 bg-[linear-gradient(150deg,rgba(255,255,255,0.82),rgba(255,255,255,0.14))] p-4 text-[color:var(--accent-ink)] shadow-[0_35px_80px_rgba(15,23,42,0.24)] sm:p-5 lg:row-span-2 lg:min-h-[25rem]"
          >
            <div className="absolute inset-0 rounded-[34px] bg-[radial-gradient(circle_at_top_left,rgba(255,125,89,0.2),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(57,208,255,0.18),transparent_32%)]" />
            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
                    Revision Workspace
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    The same notes can power summary, Q&A, and practice.
                  </p>
                </div>
                <div className="rounded-full bg-[rgba(16,23,39,0.08)] px-4 py-2 text-xs font-medium">
                  Review stack
                </div>
              </div>

              <div className="mt-5 grid flex-1 gap-3 md:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[28px] bg-[rgba(255,255,255,0.48)] p-4">
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent-sky)]">
                    Session Summary
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-[rgba(16,23,39,0.08)] px-4 py-3">
                      Short bullet summary generated from textbook pages and lecture notes.
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-[rgba(255,255,255,0.56)] px-4 py-3">
                        Definitions and key concepts pulled into one place
                      </div>
                      <div className="rounded-2xl bg-[rgba(255,255,255,0.56)] px-4 py-3">
                        Follow-up questions grounded in the same material
                      </div>
                    </div>
                    <div className="rounded-2xl bg-[linear-gradient(135deg,rgba(255,125,89,0.18),rgba(255,209,102,0.22),rgba(57,208,255,0.18))] px-4 py-3">
                      When revision gets harder, the same session can switch into flashcards or a quiz.
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] bg-[rgba(16,23,39,0.08)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
                    Output Stack
                  </p>
                  <div className="mt-4 space-y-3">
                    {outputCards.map((item) => (
                      <div key={item.label} className="rounded-2xl bg-[rgba(255,255,255,0.52)] px-4 py-3">
                        <div className="mb-2 flex items-center justify-between text-sm font-medium">
                          <span>{item.label}</span>
                          <span>{item.value}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[rgba(16,23,39,0.08)]">
                          <motion.div
                            style={{ width: item.width }}
                            className="h-full rounded-full bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-sky))]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4">
          <motion.article
            style={{ y: rightCardY, rotate: rightCardRotate }}
            className="glass will-change-transform rounded-[28px] p-4 shadow-[0_24px_60px_rgba(57,208,255,0.18)]"
          >
              <div className="mb-4 h-1.5 w-14 rounded-full bg-[linear-gradient(135deg,var(--accent-sky),var(--accent-mint))]" />
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-sky)]">
                {sceneCards[1].eyebrow}
              </p>
              <h3 className="mt-2 text-lg font-semibold">{sceneCards[1].title}</h3>
              <p className="muted mt-2 text-sm">{sceneCards[1].copy}</p>
            </motion.article>

            <motion.article
              style={{ y: bottomCardY, scale: bottomCardScale }}
              className="glass will-change-transform rounded-[30px] p-4 shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
                    {sceneCards[2].eyebrow}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">{sceneCards[2].title}</h3>
                </div>
                <div className="rounded-full bg-[rgba(16,23,39,0.08)] px-3 py-1 text-xs font-medium">
                  Quiz • Flashcards
                </div>
              </div>
              <p className="muted text-sm">{sceneCards[2].copy}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Summary", "Q&A", "Quiz", "Flashcards"].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-[rgba(255,255,255,0.48)] px-3 py-1 text-xs font-medium"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </motion.article>
          </div>

          <div className="relative z-10 flex items-center justify-between gap-4 lg:col-span-3">
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-2.5 w-2.5 rounded-full bg-white/40" />
              ))}
            </div>
            <div className="text-sm font-medium">Upload once, revise in multiple ways.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
