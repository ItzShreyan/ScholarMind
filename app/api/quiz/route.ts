import { NextResponse } from "next/server";
import { z } from "zod";
import { generateWithFallback } from "@/lib/ai/fallback";
import { getSiteSettings } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";
import { normalizeErrorMessage } from "@/lib/ai/util";
import { formatAiLimitMessage, releaseAiUsage, reserveAiUsage } from "@/lib/ai/limits";

export const runtime = "nodejs";
export const maxDuration = 45;

const schema = z.object({
  prompt: z.string().min(2),
  context: z.string().optional(),
  sessionId: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value : undefined),
    z.string().optional()
  )
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    if (!json.prompt) {
      json.prompt = "Create challenging MCQs from this content.";
    }
    const body = schema.parse(json);
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to use study tools." }, { status: 401 });
    }
    const actorKey = user.id;

    const siteSettings = await getSiteSettings(supabase);

    const reservation = await reserveAiUsage({
      supabase,
      actorKey,
      userId: user.id,
      hourlyLimit: siteSettings.aiHourlyLimit,
      dailyLimit: siteSettings.toolDailyLimit,
      scope: "tool"
    });

    if (!reservation.allowed) {
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
            resetInMs: reservation.resetInMs
          }
        },
        { status: 429 }
      );
    }

    try {
      const result = await generateWithFallback({
        action: "quiz",
        prompt: body.prompt,
        context: body.context,
        sessionId: body.sessionId
      });

      try {
        await supabase.from("study_site_events").insert({
          visitor_key: actorKey,
          user_id: user.id,
          user_email: user.email ?? null,
          event_type: "feature_use",
          page: body.sessionId ? `/dashboard/workspace/${body.sessionId}` : "/dashboard",
          feature: "quiz",
          metadata: {
            sessionId: body.sessionId ?? null
          }
        });
      } catch {
        // Telemetry should never block study responses.
      }

      return NextResponse.json({
        ...result,
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
          resetInMs: reservation.resetInMs
        }
      });
    } catch (error) {
      await releaseAiUsage({
        supabase,
        actorKey,
        userId: user.id,
        token: reservation.token,
        persisted: reservation.persisted,
        scope: "tool"
      });
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: normalizeErrorMessage(error) }, { status: 400 });
  }
}
