import { NextResponse } from "next/server";
import { z } from "zod";
import { generateWithFallback } from "@/lib/ai/fallback";
import { reserveAiUsage, releaseAiUsage, formatAiLimitMessage } from "@/lib/ai/limits";
import { buildStudyContext } from "@/lib/ai/source-context";
import { createClient } from "@/lib/supabase/server";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";
import { buildRevisionPlanPrompt, parseRevisionPlanDays } from "@/lib/revision-plans/utils";

const schema = z.object({
  sessionId: z.string().uuid(),
  examName: z.string().min(2).max(160),
  examDate: z.string().min(4).max(40),
  cadence: z.enum(["daily", "weekly"]),
  goals: z.string().max(1200).optional()
});

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    let query = supabase
      .from("study_revision_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ plans: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to load revision plans.") },
      { status: 400 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = schema.parse(await req.json());

    const { data: session, error: sessionError } = await supabase
      .from("study_sessions")
      .select("id, title")
      .eq("id", body.sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Study studio not found." }, { status: 404 });
    }

    const { data: files, error: filesError } = await supabase
      .from("study_files")
      .select("*")
      .eq("user_id", user.id)
      .eq("session_id", body.sessionId)
      .order("created_at", { ascending: false });

    if (filesError) throw filesError;
    const sourceEnabledFiles = (files ?? []).filter((file) => file.source_enabled !== false);
    if (!sourceEnabledFiles.length) {
      return NextResponse.json(
        { error: "Upload study sources to this studio before generating a revision schedule." },
        { status: 400 }
      );
    }

    const actorKey = user.id;
    const reservation = await reserveAiUsage({
      supabase,
      actorKey,
      userId: user.id
    });

    if (!reservation.allowed) {
      return NextResponse.json({ error: formatAiLimitMessage() }, { status: 429 });
    }

    try {
      const prompt = buildRevisionPlanPrompt(body);
      const context = buildStudyContext(sourceEnabledFiles, `${body.examName} ${body.goals || ""}`, {
        maxCharacters: 12000,
        maxChunks: 14
      });
      const result = await generateWithFallback({
        action: "study_plan",
        prompt,
        context,
        sessionId: body.sessionId,
        userId: user.id
      });
      const days = parseRevisionPlanDays(result.text);

      if (!days.length) {
        throw new Error("The revision schedule did not come back in a usable format. Try again.");
      }

      const { data, error } = await supabase
        .from("study_revision_plans")
        .insert({
          user_id: user.id,
          session_id: body.sessionId,
          exam_name: body.examName,
          exam_date: body.examDate,
          cadence: body.cadence,
          goals: body.goals?.trim() || "",
          plan_markdown: result.text,
          days,
          current_day: 0,
          updated_at: new Date().toISOString()
        })
        .select("*")
        .single();

      if (error) throw error;

      return NextResponse.json({
        plan: data,
        usage: {
          hourlyRemaining: reservation.hourlyRemaining,
          dailyRemaining: reservation.dailyRemaining
        }
      });
    } catch (error) {
      await releaseAiUsage({
        supabase,
        actorKey,
        userId: user.id,
        token: reservation.token,
        persisted: reservation.persisted
      });
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to generate the revision schedule.") },
      { status: 400 }
    );
  }
}
