/**
 * Spaced repetition scheduling.
 *
 * ScholarMind generates flashcards but never scheduled them, so a card seen once
 * was never seen again. This module is the schedule: SM-2 with the adjustments
 * the modern algorithms (FSRS, Anki) have settled on — a short relearning step
 * for a lapsed card, and separate ease and difficulty estimates instead of one
 * number doing both jobs.
 *
 * Pure functions only, so the same code runs on the server (authoritative) and
 * in the UI (to show the next interval under each button, before it is pressed).
 *
 * Column meanings in `flashcard_reviews` (they are FSRS vocabulary, so the table
 * reads the same as every other spaced-repetition tool):
 *   stability  → SM-2 ease factor. Higher means this card is easy for you.
 *   difficulty → 0–1 normalised difficulty, derived from your recent grades.
 */

export type ReviewGrade = "again" | "hard" | "good" | "easy";

export const REVIEW_GRADES: ReviewGrade[] = ["again", "hard", "good", "easy"];

export const GRADE_LABEL: Record<ReviewGrade, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy"
};

/** SM-2 grade for each button. `again` is a failure. */
const GRADE_QUALITY: Record<ReviewGrade, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5
};

export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.2;

/** How soon a failed card comes back, in minutes. */
export const RELEARNING_MINUTES = 10;

/** Days covered by the first successful reviews. */
const FIRST_INTERVAL_DAYS = 1;
const SECOND_INTERVAL_DAYS = 6;
const EASY_FIRST_INTERVAL_DAYS = 4;

const MS_PER_DAY = 86_400_000;
const MS_PER_MINUTE = 60_000;

export type CardState = {
  /** SM-2 ease factor. */
  stability: number;
  /** 0–1 normalised difficulty. */
  difficulty: number;
  /** Consecutive successful reviews. Resets when the card lapses. */
  reps: number;
  /** How many times the card has been forgotten. */
  lapses: number;
  /** Previous successful interval, in days. */
  intervalDays: number;
  lastReviewedAt: string | null;
};

export type ScheduleResult = {
  dueAt: Date;
  intervalDays: number;
  state: CardState;
};

export function createCardState(): CardState {
  return {
    stability: DEFAULT_EASE,
    difficulty: 0.3,
    reps: 0,
    lapses: 0,
    intervalDays: 0,
    lastReviewedAt: null
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Apply one grade and return the next due time.
 *
 * - `again`  → back in {@link RELEARNING_MINUTES} and the review streak resets
 * - `hard`   → a slower-than-scheduled step (1.2×, never less than a day)
 * - `good`   → the scheduled step (the ease factor)
 * - `easy`   → the scheduled step with a bonus, and the card gets easier
 */
export function scheduleReview(state: CardState, grade: ReviewGrade, now: Date = new Date()): ScheduleResult {
  const quality = GRADE_QUALITY[grade];
  const isLapse = grade === "again";

  const reps = isLapse ? 0 : state.reps + 1;
  const lapses = isLapse ? state.lapses + 1 : state.lapses;

  // SM-2 ease update, clamped so a card can never become impossible.
  const easeDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const stability = clamp(state.stability + easeDelta, MIN_EASE, MAX_EASE);

  // Difficulty: a weighted read on how often this card is failed.
  const difficulty = clamp(
    state.difficulty * 0.7 + (isLapse ? 0.35 : grade === "hard" ? 0.2 : grade === "easy" ? -0.1 : 0) * 0.3,
    0,
    1
  );

  let intervalDays: number;

  if (isLapse) {
    return {
      dueAt: new Date(now.getTime() + RELEARNING_MINUTES * MS_PER_MINUTE),
      intervalDays: 0,
      state: { stability, difficulty, reps, lapses, intervalDays: 0, lastReviewedAt: now.toISOString() }
    };
  }

  if (grade === "hard") {
    const base = state.intervalDays > 0 ? state.intervalDays : FIRST_INTERVAL_DAYS;
    intervalDays = Math.max(FIRST_INTERVAL_DAYS, Math.round(base * 1.2));
  } else if (state.reps === 0) {
    intervalDays = grade === "easy" ? EASY_FIRST_INTERVAL_DAYS : FIRST_INTERVAL_DAYS;
  } else if (state.reps === 1) {
    intervalDays = grade === "easy" ? SECOND_INTERVAL_DAYS + 4 : SECOND_INTERVAL_DAYS;
  } else {
    const base = state.intervalDays || FIRST_INTERVAL_DAYS;
    intervalDays = Math.round(base * stability * (grade === "easy" ? 1.3 : 1));
  }

  intervalDays = clamp(intervalDays, 1, 365);

  return {
    dueAt: new Date(now.getTime() + intervalDays * MS_PER_DAY),
    intervalDays,
    state: { stability, difficulty, reps, lapses, intervalDays, lastReviewedAt: now.toISOString() }
  };
}

/** What each button would do, for the labels under the grade buttons. */
export function describeNextIntervals(state: CardState, now: Date = new Date()): Record<ReviewGrade, string> {
  const labels = {} as Record<ReviewGrade, string>;
  for (const grade of REVIEW_GRADES) {
    const result = scheduleReview(state, grade, now);
    labels[grade] = formatInterval(result.dueAt.getTime() - now.getTime());
  }
  return labels;
}

/** "10m" / "1d" / "3w" / "5mo" — short enough to sit under a button. */
export function formatInterval(milliseconds: number): string {
  if (milliseconds <= 0) return "now";
  const minutes = Math.round(milliseconds / MS_PER_MINUTE);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

export function isDue(dueAt: string | Date, now: Date = new Date()): boolean {
  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  return due.getTime() <= now.getTime();
}

export function isValidGrade(value: unknown): value is ReviewGrade {
  return value === "again" || value === "hard" || value === "good" || value === "easy";
}

/**
 * Stable identity for a generated card.
 *
 * Flashcards in ScholarMind are produced as text, not stored as rows, so a card
 * is identified by its own content. The same card generated twice is the same
 * card to revise — which is exactly what spaced repetition needs.
 */
export function cardFingerprint(front: string, back: string): string {
  const source = `${front.replace(/\s+/g, " ").trim().toLowerCase()}\u0000${back.replace(/\s+/g, " ").trim().toLowerCase()}`;
  let hashA = 0x811c9dc5;
  let hashB = 0x1000193;

  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    hashA = (hashA ^ code) >>> 0;
    hashA = Math.imul(hashA, 0x01000193) >>> 0;
    hashB = Math.imul(hashB ^ code, 0x85ebca6b) >>> 0;
  }

  return `${hashA.toString(16).padStart(8, "0")}${hashB.toString(16).padStart(8, "0")}`;
}

/**
 * A study streak: consecutive days ending today (or yesterday, so a streak is
 * not shown as broken before the student studies today) with at least one review.
 */
export function calculateStreak(reviewDates: string[], now: Date = new Date()): number {
  if (!reviewDates.length) return 0;

  const days = new Set(
    reviewDates
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map((date) => date.toISOString().slice(0, 10))
  );

  const dayKey = (date: Date) => date.toISOString().slice(0, 10);
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Today not studied yet, but yesterday was: the streak is still alive.
  if (!days.has(dayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}
