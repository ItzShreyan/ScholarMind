import { NextResponse } from "next/server";
import { z } from "zod";
import { generateWithFallback } from "@/lib/ai/fallback";
import { getSiteSettings } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";
import { normalizeErrorMessage } from "@/lib/ai/util";
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
    const siteSettings = await getSiteSettings(supabase);

    const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const actorKey = user?.id || forwardedFor || "anonymous";
    const examReservation =
      body.action === "exam"
        ? await reserveExamUsage({
            supabase,
            actorKey,
            userId: user?.id,
            weeklyLimit: siteSettings.examWeeklyLimit
          })
        : null;

    if (examReservation && !examReservation.allowed) {
      return NextResponse.json(
        {
          error: formatExamLimitMessage(siteSettings.examWeeklyLimit)
        },
        { status: 429 }
      );
    }

    const reservation = await reserveAiUsage({
      supabase,
      actorKey,
      userId: user?.id,
      hourlyLimit: siteSettings.aiHourlyLimit,
      dailyLimit: siteSettings.aiDailyLimit
    });

    if (!reservation.allowed) {
      if (examReservation && examReservation.allowed) {
        await releaseExamUsage({
          supabase,
          actorKey,
          userId: user?.id,
          token: examReservation.token,
          persisted: examReservation.persisted
        });
      }
      return NextResponse.json(
        {
          error: formatAiLimitMessage(siteSettings.aiHourlyLimit, siteSettings.aiDailyLimit)
        },
        { status: 429 }
      );
    }

    try {
      const result = await generateWithFallback(body);
      try {
        await supabase.from("study_site_events").insert({
          visitor_key: actorKey,
          user_id: user?.id ?? null,
          user_email: user?.email ?? null,
          event_type: "feature_use",
          page: body.sessionId ? `/dashboard/workspace/${body.sessionId}` : "/dashboard",
          feature: body.action,
          metadata: {
            sessionId: body.sessionId ?? null
          }
        });
      } catch {
        // Telemetry should never block study responses.
      }

      const text = typeof result.text === "string" ? result.text : JSON.stringify(result.text || "");
      return NextResponse.json({
        ...result,
        text,
        usage: {
          hourlyRemaining: reservation.hourlyRemaining,
          dailyRemaining: reservation.dailyRemaining,
          examWeeklyRemaining: examReservation?.remaining
        }
      });
    } catch (error) {
      await releaseAiUsage({
        supabase,
        actorKey,
        userId: user?.id,
        token: reservation.token,
        persisted: reservation.persisted
      });
      if (examReservation && examReservation.allowed) {
        await releaseExamUsage({
          supabase,
          actorKey,
          userId: user?.id,
          token: examReservation.token,
          persisted: examReservation.persisted
        });
      }

      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { error: normalizeErrorMessage(error, "Generation failed") },
      { status: 400 }
    );
  }
}
