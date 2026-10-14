/**
 * The ScholarMind learning world.
 *
 * Five architectural spaces, each mapped to a real destination that already
 * exists in the app. Nothing here is decorative: every space opens something.
 *
 *   Observatory  → /ai-study-assistant  (public)  understanding a concept
 *   Practice hall→ /quiz-maker          (public)  quizzes and mock papers
 *   Revision garden → /revision-planner (public)  long-term revision planning
 *   Library      → /studio              (auth)    your notes, PDFs and sources
 *   Learning hub → /dashboard           (auth)    your active study workspace
 *
 * The two auth-gated spaces link to their real route; existing middleware sends
 * a signed-out visitor through the normal sign-in flow. Access control is never
 * bypassed.
 */

export type WorldSpaceId = "hub" | "observatory" | "practice" | "garden" | "library";

export type WorldSpace = {
  id: WorldSpaceId;
  /** Short label shown on the hotspot. Must stay 1–2 words. */
  label: string;
  /** One line: what this place is for. */
  purpose: string;
  /** What the student actually does once inside. */
  detail: string;
  href: string;
  /** What the destination is, in the reader's terms. */
  destination: string;
  requiresAuth: boolean;
  /** Anchor in world units — where the label pins and the camera aims. */
  position: [number, number, number];
  /** How far above the anchor the label floats. */
  labelHeight: number;
  /** Camera stand-off when this space is focused. */
  focusDistance: number;
  accent: "amber" | "blue" | "mint" | "gold";
};

export const WORLD_SPACES: WorldSpace[] = [
  {
    id: "hub",
    label: "Learning hub",
    purpose: "Where a study session actually happens.",
    detail:
      "One studio per class. Add your notes, then move through summaries, grounded chat, quizzes and flashcards without rebuilding context.",
    href: "/dashboard",
    destination: "Your dashboard",
    requiresAuth: true,
    position: [0, 0.34, 0],
    labelHeight: 3.1,
    focusDistance: 11.5,
    accent: "amber"
  },
  {
    id: "observatory",
    label: "Observatory",
    purpose: "For the concept that has not clicked yet.",
    detail:
      "Ask a question about your own material and get a step-by-step explanation, worked method and diagrams — grounded in what you uploaded.",
    href: "/ai-study-assistant",
    destination: "AI study assistant",
    requiresAuth: false,
    position: [-3.15, 0.3, -1.5],
    labelHeight: 2.5,
    focusDistance: 9.5,
    accent: "blue"
  },
  {
    id: "practice",
    label: "Practice hall",
    purpose: "For testing yourself instead of re-reading.",
    detail:
      "Generate multiple-choice questions, flashcards and full mock papers from your sources, with mark schemes you can answer online or export.",
    href: "/quiz-maker",
    destination: "Quiz maker",
    requiresAuth: false,
    position: [3.2, 0.28, -1.35],
    labelHeight: 2.4,
    focusDistance: 9.5,
    accent: "mint"
  },
  {
    id: "garden",
    label: "Revision garden",
    purpose: "For spacing revision over weeks, not hours.",
    detail:
      "Lay out the days before an exam, open each one as its own session, and keep the plan tied to the same account.",
    href: "/revision-planner",
    destination: "Revision planner",
    requiresAuth: false,
    position: [2.55, 0.2, 2.45],
    labelHeight: 1.9,
    focusDistance: 9,
    accent: "mint"
  },
  {
    id: "library",
    label: "Library",
    purpose: "Where your notes, PDFs and sources live.",
    detail:
      "Upload PDFs, documents, slide decks, tables and photos of handwritten notes. Everything you ask is answered from this material first.",
    href: "/studio",
    destination: "Study studio",
    requiresAuth: true,
    position: [-2.65, 0.2, 2.4],
    labelHeight: 2.6,
    focusDistance: 9.5,
    accent: "gold"
  }
];

export function getWorldSpace(id: WorldSpaceId): WorldSpace {
  return WORLD_SPACES.find((space) => space.id === id) ?? WORLD_SPACES[0];
}

/**
 * The order the world introduces its destinations in. Deliberately starts at
 * the hub so the first thing a visitor understands is that this is a place you
 * study in, not a place you look at.
 */
export const WORLD_TOUR: WorldSpaceId[] = ["hub", "library", "observatory", "practice", "garden"];

/** Accent → CSS custom property, so the DOM overlay matches the 3D lighting. */
export const SPACE_ACCENT_VAR: Record<WorldSpace["accent"], string> = {
  amber: "var(--accent-coral)",
  blue: "var(--accent-sky)",
  mint: "var(--accent-mint)",
  gold: "var(--accent-gold)"
};
