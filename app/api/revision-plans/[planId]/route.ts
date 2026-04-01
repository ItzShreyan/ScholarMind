import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";

const daySchema = z.object({
  id: z.string(),
  label: z.string(),
  focus: z.string(),
  task: z.string(),
  check: z.string(),
  completed: z.boolean(),
  completedAt: z.string().nullable().optional()
});

const patchSchema = z.object({
  examName: z.string().min(2).max(160).optional(),
  examDate: z.string().min(4).max(40).optional(),
  cadence: z.enum(["daily", "weekly"]).optional(),
  goals: z.string().max(1200).optional(),
  currentDay: z.number().int().min(0).optional(),
  days: z.array(daySchema).optional(),
  planMarkdown: z.string().optional()
});

export async function GET(_: Request, context: { params: Promise<{ planId: string }> }) {
  try {
    const { planId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("study_revision_plans")
      .select("*")
      .eq("id", planId)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Revision plan not found." }, { status: 404 });
    }

    return NextResponse.json({ plan: data });
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to load the revision plan.") },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ planId: string }> }) {
  try {
    const { planId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = patchSchema.parse(await req.json());
    const payload = {
      exam_name: body.examName,
      exam_date: body.examDate,
      cadence: body.cadence,
      goals: body.goals,
      current_day: body.currentDay,
      days: body.days,
      plan_markdown: body.planMarkdown,
      updated_at: new Date().toISOString()
    };

    const filteredPayload = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

    const { data, error } = await supabase
      .from("study_revision_plans")
      .update(filteredPayload)
      .eq("id", planId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Unable to update this revision plan." }, { status: 400 });
    }

    return NextResponse.json({ plan: data });
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to save the revision plan.") },
      { status: 400 }
    );
  }
}
