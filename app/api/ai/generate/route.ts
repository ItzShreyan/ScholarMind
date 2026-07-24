import { NextResponse } from "next/server";
import { z } from "zod";
import { generateWithFallback } from "@/lib/ai/fallback";
import { getSiteSettings } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";
import { normalizeErrorMessage } from "@/lib/ai/util";
import { loadVisionAttachments } from "@/lib/ai/image-attachments";
import {
  formatExamLimitMessage,
  formatAiLimitMessage,
  releaseExamUsage,
  releaseAiUsage,
  reserveExamUsage,
  reserveAiUsage
} from "@/lib/ai/limits";

export const runtime = "nodejs";
// Vision requests need time to download a bounded set of images and let Gemini
// inspect them. Individual provider calls remain capped in the fallback layer.
export const maxDuration = 45;

const schema = z.object({
  action: z.enum([
    "summary",
    "flashcards",
    "quiz",
    "chat",
    "notes",
    "exam",
    "concepts",
    "hard_mode",
    "study_plan",
    "insights"
  ]),
  prompt: z.string().min(2),
  context: z.string().optional(),
  examMode: z.enum(["full", "practice"]).optional(),
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
    const practiceExam = body.action === "exam" && body.examMode === "practice";
    const examScope = practiceExam ? "exam_practice" : "exam";
    const examLimit = practiceExam ? siteSettings.examPracticeWeeklyLimit : siteSettings.examWeeklyLimit;

    const examReservation =
      body.action === "exam"
        ? await reserveExamUsage({
            supabase,
            actorKey,
            userId: user?.id,
            weeklyLimit: examLimit,
            scope: examScope
          })
        : null;

    if (examReservation && !examReservation.allowed) {
      return NextResponse.json(
        {
          error: formatExamLimitMessage(examLimit, practiceExam)
        },
        { status: 429 }
      );
    }

    const reservation = await reserveAiUsage({
      supabase,
      actorKey,
      userId: user?.id,
      hourlyLimit: siteSettings.aiHourlyLimit,
      dailyLimit: siteSettings.toolDailyLimit,
      scope: "tool"
    });

    if (!reservation.allowed) {
      if (examReservation && examReservation.allowed) {
        await releaseExamUsage({
          supabase,
          actorKey,
          userId: user?.id,
          token: examReservation.token,
          persisted: examReservation.persisted,
          scope: examScope
        });
      }
      return NextResponse.json(
        {
          error: formatAiLimitMessage(siteSettings.aiHourlyLimit, siteSettings.toolDailyLimit, reservation),
          usage: {
            hourlyRemaining: reservation.hourlyRemaining,
            dailyRemaining: reservation.dailyRemaining,
            hourlyUsed: reservation.hourlyUsed,
            dailyUsed: reservation.dailyUsed,
            hourlyLimit: reservation.hourlyLimit,
            dailyLimit: reservation.dailyLimit,
            used: reservation.dailyUsed,
            limit: reservation.dailyLimit,
            resetAt: reservation.resetAt,
            resetInMs: reservation.resetInMs,
            examWeeklyRemaining: examReservation?.remaining
          }
        },
        { status: 429 }
      );
    }

    try {
      const vision = user
        ? await loadVisionAttachments(user.id, body.sessionId)
        : { attachments: [], warnings: [] };
      const result = await generateWithFallback({
        action: body.action,
        prompt: body.prompt,
        context: body.context,
        examMode: body.examMode,
        imageAttachments: vision.attachments
      });
      try {
        await supabase.from("study_site_events").insert({
          visitor_key: actorKey,
          user_id: user?.id ?? null,
          user_email: user?.email ?? null,
          event_type: "feature_use",
          page: body.sessionId ? `/dashboard/workspace/${body.sessionId}` : "/dashboard",
          feature: body.action,
          metadata: {
            sessionId: body.sessionId ?? null,
            examMode: body.examMode ?? null
          }
        });
      } catch {
        // Telemetry should never block study responses.
      }

      const text = typeof result.text === "string" ? result.text : JSON.stringify(result.text || "");
      return NextResponse.json({
        ...result,
        text,
        vision: {
          attachedImageCount: vision.attachments.length,
          warnings: vision.warnings
        },
        usage: {
          hourlyRemaining: reservation.hourlyRemaining,
          dailyRemaining: reservation.dailyRemaining,
          hourlyUsed: reservation.hourlyUsed,
          dailyUsed: reservation.dailyUsed,
          hourlyLimit: reservation.hourlyLimit,
          dailyLimit: reservation.dailyLimit,
          used: reservation.dailyUsed,
          limit: reservation.dailyLimit,
          resetAt: reservation.resetAt,
          resetInMs: reservation.resetInMs,
          examWeeklyRemaining: examReservation?.remaining
        }
      });
    } catch (error) {
      await releaseAiUsage({
        supabase,
        actorKey,
        userId: user?.id,
        token: reservation.token,
        persisted: reservation.persisted,
        scope: "tool"
      });
      if (examReservation && examReservation.allowed) {
        await releaseExamUsage({
          supabase,
          actorKey,
          userId: user?.id,
          token: examReservation.token,
          persisted: examReservation.persisted,
          scope: examScope
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
