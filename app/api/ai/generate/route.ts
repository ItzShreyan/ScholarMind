import { NextResponse } from "next/server";
import { z } from "zod";
import { generateWithFallback } from "@/lib/ai/fallback";
import { createClient } from "@/lib/supabase/server";
import {
  formatExamLimitMessage,
  formatAiLimitMessage,
  releaseExamUsage,
  releaseAiUsage,
  reserveExamUsage,
  reserveAiUsage
} from "@/lib/ai/limits";

const schema = z.object({
  action: z.enum([
    "summary",
    "flashcards",
    "quiz",
    "chat",
    "exam",
    "concepts",
    "eli10",
    "hard_mode",
    "study_plan",
    "insights"
  ]),
  prompt: z.string().min(2),
  context: z.string().optional(),
  sessionId: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value : undefined),
    z.string().optional()
  )
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const actorKey = user?.id || forwardedFor || "anonymous";
    const examReservation = body.action === "exam" ? reserveExamUsage(actorKey) : null;

    if (examReservation && !examReservation.allowed) {
      return NextResponse.json(
        {
          error: formatExamLimitMessage()
        },
        { status: 429 }
      );
    }

    const reservation = reserveAiUsage(actorKey);

    if (!reservation.allowed) {
      if (examReservation?.allowed) {
        releaseExamUsage(actorKey, examReservation.token);
      }
      return NextResponse.json(
        {
          error: formatAiLimitMessage()
        },
        { status: 429 }
      );
    }

    try {
      const result = await generateWithFallback(body);
      if (result.provider === "cache") {
        releaseAiUsage(actorKey, reservation.token);
        if (examReservation?.allowed) {
          releaseExamUsage(actorKey, examReservation.token);
        }
      }

      return NextResponse.json({
        ...result,
        usage: {
          hourlyRemaining: reservation.hourlyRemaining,
          dailyRemaining: reservation.dailyRemaining,
          examDailyRemaining: examReservation?.dailyRemaining
        }
      });
    } catch (error) {
      releaseAiUsage(actorKey, reservation.token);
      if (examReservation?.allowed) {
        releaseExamUsage(actorKey, examReservation.token);
      }

      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Generation failed" },
      { status: 400 }
    );
  }
}
