import type { createClient } from "@/lib/supabase/server";
import { parseFlashcards } from "@/lib/ai/parse";
import {
  calculateStreak,
  cardFingerprint,
  createCardState,
  isValidGrade,
  scheduleReview,
  type CardState,
  type ReviewGrade
} from "@/lib/srs";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** One scheduled card, as the UI needs it. */
export type ReviewCard = {
  cardId: string;
  front: string;
  back: string;
  dueAt: string;
  intervalDays: number;
  reps: number;
  lapses: number;
  state: CardState;
};

export type ReviewStats = {
  dueCount: number;
  totalCards: number;
  reviewedToday: number;
  streak: number;
  /** Cards never reviewed yet — the queue is empty but there is work to do. */
  newCount: number;
};

export type ImportableDeck = {
  resultId: string;
  title: string;
  sessionId: string | null;
  createdAt: string;
  newCards: number;
  totalCards: number;
};

const DUE_LIMIT = 60;
const MAX_DECK_SCAN = 25;
/** A hard cap so a study result can never flood the queue. */
const MAX_CARDS_PER_IMPORT = 120;

type ReviewRow = {
  card_id: string;
  front: string;
  back: string;
  due_at: string;
  stability: number;
  difficulty: number;
  interval_days: number;
  reps: number;
  lapses: number;
  last_reviewed_at: string | null;
};

function toReviewCard(row: ReviewRow): ReviewCard {
  return {
    cardId: row.card_id,
    front: row.front,
    back: row.back,
    dueAt: row.due_at,
    intervalDays: row.interval_days ?? 0,
    reps: row.reps ?? 0,
    lapses: row.lapses ?? 0,
    state: {
      stability: row.stability ?? 2.5,
      difficulty: row.difficulty ?? 0.3,
      reps: row.reps ?? 0,
      lapses: row.lapses ?? 0,
      intervalDays: row.interval_days ?? 0,
      lastReviewedAt: row.last_reviewed_at
    }
  };
}

/** Cards that are due to be reviewed right now, soonest first. */
export async function loadDueCards(
  supabase: SupabaseServerClient,
  userId: string,
  now: Date = new Date()
): Promise<ReviewCard[]> {
  const { data, error } = await supabase
    .from("flashcard_reviews")
    .select("card_id, front, back, due_at, stability, difficulty, interval_days, reps, lapses, last_reviewed_at")
    .eq("user_id", userId)
    .lte("due_at", now.toISOString())
    .order("due_at", { ascending: true })
    .limit(DUE_LIMIT);

  if (error) throw error;
  return ((data ?? []) as ReviewRow[]).map(toReviewCard);
}

/** Counts and the study streak. Reads only what those numbers need. */
export async function loadReviewStats(
  supabase: SupabaseServerClient,
  userId: string,
  now: Date = new Date()
): Promise<ReviewStats> {
  const { data, error } = await supabase
    .from("flashcard_reviews")
    .select("due_at, reps, last_reviewed_at")
    .eq("user_id", userId)
    .limit(5000);

  if (error) throw error;

  const rows = (data ?? []) as Array<{ due_at: string; reps: number; last_reviewed_at: string | null }>;
  const todayKey = now.toISOString().slice(0, 10);

  return {
    dueCount: rows.filter((row) => new Date(row.due_at).getTime() <= now.getTime()).length,
    totalCards: rows.length,
    newCount: rows.filter((row) => !row.last_reviewed_at).length,
    reviewedToday: rows.filter(
      (row) => row.last_reviewed_at && new Date(row.last_reviewed_at).toISOString().slice(0, 10) === todayKey
    ).length,
    streak: calculateStreak(
      rows.map((row) => row.last_reviewed_at).filter((value): value is string => Boolean(value)),
      now
    )
  };
}

/**
 * Flashcard study results the student can add to their review deck.
 *
 * Cards already scheduled are counted but not re-imported, so the number shown
 * is genuinely new work rather than a misleading total.
 */
export async function loadImportableDecks(
  supabase: SupabaseServerClient,
  userId: string
): Promise<ImportableDeck[]> {
  const [{ data: results, error: resultsError }, { data: scheduled, error: scheduledError }] = await Promise.all([
    supabase
      .from("study_tool_results")
      .select("id, session_id, title, output, created_at")
      .eq("user_id", userId)
      .eq("action", "flashcards")
      .order("created_at", { ascending: false })
      .limit(MAX_DECK_SCAN),
    supabase.from("flashcard_reviews").select("card_id").eq("user_id", userId).limit(5000)
  ]);

  if (resultsError) throw resultsError;
  if (scheduledError) throw scheduledError;

  const known = new Set(((scheduled ?? []) as Array<{ card_id: string }>).map((row) => row.card_id));

  return ((results ?? []) as Array<{
    id: string;
    session_id: string | null;
    title: string;
    output: string;
    created_at: string;
  }>)
    .map((result) => {
      const cards = parseFlashcards(result.output).slice(0, MAX_CARDS_PER_IMPORT);
      const newCards = cards.filter(
        (card) => !known.has(cardFingerprint(card.question, card.answer))
      ).length;

      return {
        resultId: result.id,
        title: result.title,
        sessionId: result.session_id,
        createdAt: result.created_at,
        newCards,
        totalCards: cards.length
      };
    })
    .filter((deck) => deck.newCards > 0);
}

export type ImportInput = {
  resultId: string;
  sessionId: string | null;
};

/** Add every card from a study result to the schedule. Existing cards are kept. */
export async function importDeck(
  supabase: SupabaseServerClient,
  userId: string,
  input: ImportInput
): Promise<{ imported: number; total: number }> {
  const { data: result, error } = await supabase
    .from("study_tool_results")
    .select("id, session_id, output")
    .eq("id", input.resultId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!result) throw new Error("That flashcard set is no longer available.");

  const cards = parseFlashcards((result as { output: string }).output).slice(0, MAX_CARDS_PER_IMPORT);
  if (!cards.length) throw new Error("No flashcards could be read from that set.");

  const now = new Date();
  const rows = cards.map((card) => ({
    user_id: userId,
    session_id: input.sessionId ?? (result as { session_id: string | null }).session_id,
    card_id: cardFingerprint(card.question, card.answer),
    front: card.question,
    back: card.answer,
    due_at: now.toISOString(),
    stability: 2.5,
    difficulty: 0.3,
    interval_days: 0,
    reps: 0,
    lapses: 0,
    updated_at: now.toISOString()
  }));

  const unique = Array.from(new Map(rows.map((row) => [row.card_id, row])).values());

  // `ignoreDuplicates` keeps an existing schedule intact — re-importing a deck
  // must never reset a card the student has already earned progress on.
  const { error: upsertError } = await supabase
    .from("flashcard_reviews")
    .upsert(unique, { onConflict: "user_id,card_id", ignoreDuplicates: true });

  if (upsertError) throw upsertError;

  const { count } = await supabase
    .from("flashcard_reviews")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  return { imported: unique.length, total: count ?? unique.length };
}

export type GradeInput = {
  cardId: string;
  grade: ReviewGrade;
};

/** Apply a grade and return the card's new due date. */
export async function applyGrade(
  supabase: SupabaseServerClient,
  userId: string,
  input: GradeInput,
  now: Date = new Date()
): Promise<{ dueAt: string; intervalDays: number }> {
  if (!isValidGrade(input.grade)) {
    throw new Error("Unknown review outcome.");
  }

  const { data: existing, error } = await supabase
    .from("flashcard_reviews")
    .select("front, back, stability, difficulty, interval_days, reps, lapses, last_reviewed_at")
    .eq("user_id", userId)
    .eq("card_id", input.cardId)
    .maybeSingle();

  if (error) throw error;
  if (!existing) throw new Error("That card is not in your review deck.");

  const row = existing as {
    front: string;
    back: string;
    stability: number;
    difficulty: number;
    interval_days: number;
    reps: number;
    lapses: number;
    last_reviewed_at: string | null;
  };

  const state: CardState = row
    ? {
        stability: row.stability ?? 2.5,
        difficulty: row.difficulty ?? 0.3,
        reps: row.reps ?? 0,
        lapses: row.lapses ?? 0,
        intervalDays: row.interval_days ?? 0,
        lastReviewedAt: row.last_reviewed_at
      }
    : createCardState();

  const result = scheduleReview(state, input.grade, now);

  const { error: updateError } = await supabase
    .from("flashcard_reviews")
    .update({
      due_at: result.dueAt.toISOString(),
      stability: result.state.stability,
      difficulty: result.state.difficulty,
      interval_days: result.intervalDays,
      reps: result.state.reps,
      lapses: result.state.lapses,
      last_reviewed_at: result.state.lastReviewedAt,
      updated_at: now.toISOString()
    })
    .eq("user_id", userId)
    .eq("card_id", input.cardId);

  if (updateError) throw updateError;

  return { dueAt: result.dueAt.toISOString(), intervalDays: result.intervalDays };
}
