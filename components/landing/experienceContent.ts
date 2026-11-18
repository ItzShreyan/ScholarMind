/**
 * Every word and every link the landing experience renders.
 *
 * Kept in one module for two reasons: the copy is the product claim, so it
 * should be reviewable in one place, and every link here is a *real route* that
 * already exists in the application. Nothing on this page promises a screen
 * that has not been built.
 */

export type ExperienceNavLink = {
  label: string;
  href: string;
  /** Section id, when the link scrolls within the page. */
  sectionId: string;
};

export const EXPERIENCE_NAV: readonly ExperienceNavLink[] = [
  { label: "World", href: "#world", sectionId: "world" },
  { label: "Features", href: "#library", sectionId: "library" },
  { label: "How it works", href: "#how-it-works", sectionId: "how-it-works" },
  { label: "About", href: "#about", sectionId: "about" }
] as const;

export const STAGE_ORDER = [
  "hero",
  "library",
  "observatory",
  "practice",
  "constellation",
  "hub"
] as const;

export type StageId = (typeof STAGE_ORDER)[number];

export const STAGE_INDEX: Record<StageId, number> = {
  hero: 0,
  library: 1,
  observatory: 2,
  practice: 3,
  constellation: 4,
  hub: 5
};

/** Short label per stage, for the progress rail. */
export const STAGE_LABELS: Record<StageId, string> = {
  hero: "World",
  library: "Library",
  observatory: "Observatory",
  practice: "Practice",
  constellation: "Connections",
  hub: "Hub"
};

/* -------------------------------------------------------------------------- */
/* Footer                                                                      */
/* -------------------------------------------------------------------------- */

export type FooterColumn = {
  title: string;
  links: readonly { label: string; href: string }[];
};

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Learning World", href: "/#world" },
      { label: "Study Studio", href: "/studio" },
      { label: "AI Tutor", href: "/ai-study-assistant" },
      { label: "Features", href: "/#library" }
    ]
  },
  {
    title: "Explore",
    links: [
      { label: "Study Tools", href: "/study-tools" },
      { label: "Flashcards", href: "/flashcard-generator" },
      { label: "Quizzes", href: "/quiz-maker" },
      { label: "Revision", href: "/revision-planner" }
    ]
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#about" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Security", href: "/security" }
    ]
  }
] as const;

export const FOOTER_STATEMENT = "Better learning. Real progress.";

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

export const HERO_EYEBROW = "Your study, reimagined";

export const HERO_HEADLINE = {
  lead: "Your mind.",
  mid: "Your world.",
  tail: "Your way of learning."
} as const;

export const HERO_SUPPORT =
  "Explore your own learning world. Bring your notes together, understand difficult ideas and turn what you learn into lasting knowledge.";

/* -------------------------------------------------------------------------- */
/* Section copy                                                                */
/* -------------------------------------------------------------------------- */

export type FeatureBullet = {
  title: string;
  copy: string;
};

export const LIBRARY_COPY = {
  eyebrow: "01 · The Library",
  headline: "Everything begins with what you learn.",
  support:
    "Your notes, resources and study materials come together in one organised space.",
  bullets: [
    {
      title: "Upload documents",
      copy: "PDFs, slide decks, Word files, spreadsheets and photographs of handwritten pages."
    },
    {
      title: "Organise sources",
      copy: "Sources live inside a studio per class, so a subject is a folder rather than a scrollback."
    },
    {
      title: "Read PDFs in place",
      copy: "Open the document beside the chat. No download, no second tab, no lost page."
    },
    {
      title: "Highlight and annotate",
      copy: "Mark the paragraph you will be asked about in the exam, not the whole chapter."
    },
    {
      title: "Search your library",
      copy: "Answers cite the sources you added, using the curriculum stage from your profile."
    }
  ] satisfies FeatureBullet[]
} as const;

export const OBSERVATORY_COPY = {
  eyebrow: "02 · The Observatory",
  headline: "Turn information into understanding.",
  support:
    "Ask questions, explore ideas and make difficult topics easier to understand with an intelligent study companion.",
  bullets: [
    {
      title: "Grounded in your sources",
      copy: "The answer is written from your uploaded material, and names the source it used."
    },
    {
      title: "Worked method, not a paragraph",
      copy: "Substitutions, units and the step that earns the mark are written out."
    },
    {
      title: "Choose the model, or let Auto decide",
      copy: "Pro and Flash are named explicitly. Auto shows which it picked and why before you send."
    },
    {
      title: "Typeset mathematics",
      copy: "Fractions, indices and chemical equations render properly, not as plain text."
    }
  ] satisfies FeatureBullet[]
} as const;

export const PRACTICE_COPY = {
  eyebrow: "03 · The Practice Grounds",
  headline: "Understanding is only the beginning.",
  support:
    "Put your knowledge to the test, identify gaps and build confidence through practice.",
  bullets: [
    {
      title: "Flashcards",
      copy: "Spaced-repetition cards generated from your sources, reviewed on a schedule."
    },
    {
      title: "Quizzes",
      copy: "Multiple choice with an explanation on every answer, not just a score."
    },
    {
      title: "Exam generation",
      copy: "Full mock papers with mark schemes, exportable as PDF or JSON."
    },
    {
      title: "Revision preparation",
      copy: "Every wrong answer feeds the performance report that decides what to study next."
    }
  ] satisfies FeatureBullet[]
} as const;

export const KNOWLEDGE_COPY = {
  eyebrow: "04 · The Knowledge Constellation",
  headline: "Everything connects.",
  support:
    "Build understanding across topics, strengthen what you know and discover what needs your attention next.",
  /** Stated plainly so the network is never mistaken for measured analytics. */
  note: "A visual metaphor for connected study material — not a dashboard of student statistics."
} as const;

export const FINAL_COPY = {
  eyebrow: "05 · The Learning Hub",
  headline: "Your next chapter starts here.",
  support: "One place to organise, understand, practise and grow.",
  primaryCta: "Start learning",
  secondaryCta: "Explore ScholarMind"
} as const;

/* -------------------------------------------------------------------------- */
/* How it works                                                                */
/* -------------------------------------------------------------------------- */

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Add the real material",
    copy: "Upload the PDFs, slides and handwritten pages you already revise from."
  },
  {
    step: "02",
    title: "Understand it",
    copy: "Ask questions about your own sources and get worked answers with the method shown."
  },
  {
    step: "03",
    title: "Test it",
    copy: "Quizzes, flashcards and mock papers. Wrong answers decide what comes next."
  },
  {
    step: "04",
    title: "Keep the plan",
    copy: "Lay a revision schedule over the weeks before the exam and open each day as a session."
  }
] as const;
