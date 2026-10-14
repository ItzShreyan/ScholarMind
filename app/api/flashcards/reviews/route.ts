import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeErrorMessage } from "@/lib/ai/util";
import {
  applyGrade,
  importDeck,
  loadDueCards,
  loadImportableDecks,
  loadReviewStats
} from "@/lib/reviews/queries";

export const runtime = "nodejs";

/**
 * Spaced repetition for flashcards.
 *
 *  GET  → what is due now, the counts, the streak, and flashcard sets that can
 *         still be added to the deck.
 *  POST → `import` a study result's cards, or `grade` one card.
 *
 * The schedule itself lives in lib/srs.ts and is applied server-side, so the
 * client can never drift from the stored due dates.
 */
const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("import"),
    resultId: z.string().min(1),
    sessionId: z.string().uuid().nullable().optional()
  }),
  z.object({
    action: z.literal("grade"),
    cardId: z.string().min(1),
    grade: z.enum(["again", "hard", "good", "easy"])
  })
]);

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to review your flashcards." }, { status: 401 });
    }

    const [due, stats, decks] = await Promise.all([
      loadDueCards(supabase, user.id),
      loadReviewStats(supabase, user.id),
      loadImportableDecks(supabase, user.id)
    ]);

    return NextResponse.json({ due, stats, decks });
  } catch (error) {
    return NextResponse.json({ error: normalizeErrorMessage(error, "Unable to load your reviews.") }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to review your flashcards." }, { status: 401 });
    }

    const body = postSchema.parse(await req.json());

    if (body.action === "import") {
      const result = await importDeck(supabase, user.id, {
        resultId: body.resultId,
        sessionId: body.sessionId ?? null
      });

      const [due, stats, decks] = await Promise.all([
        loadDueCards(supabase, user.id),
        loadReviewStats(supabase, user.id),
        loadImportableDecks(supabase, user.id)
      ]);

      return NextResponse.json({ imported: result.imported, total: result.total, due, stats, decks });
    }

    const graded = await applyGrade(supabase, user.id, {
      cardId: body.cardId,
      grade: body.grade
    });

    const stats = await loadReviewStats(supabase, user.id);

    return NextResponse.json({ graded, stats });
  } catch (error) {
    return NextResponse.json(
      { error: normalizeErrorMessage(error, "Unable to save that review.") },
      { status: 400 }
    );
  }
}
