import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";

const schema = z.object({
  discoverySource: z.array(z.string()).default([]),
  educationLevel: z.string().min(1),
  country: z.string().min(1),
  curriculumStage: z.string().min(1),
  stateRegion: z.string().optional().default(""),
  subjects: z.array(z.string()).default([]),
  examBoards: z.record(z.string(), z.string()).optional().default({}),
  subjectTiers: z.record(z.string(), z.string()).optional().default({}),
  universitySubject: z.string().optional().default(""),
  learningStyle: z.array(z.string()).default([]),
  goal: z.string().min(1)
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("study_user_onboarding")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ onboarding: data ?? null, completed: Boolean(data?.completed_at) });
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to load onboarding.") },
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
    const payload = {
      user_id: user.id,
      discovery_source: body.discoverySource,
      education_level: body.educationLevel,
      country: body.country,
      curriculum_stage: body.curriculumStage,
      state_region: body.stateRegion,
      subjects: body.subjects,
      exam_boards: body.examBoards,
      subject_tiers: body.subjectTiers,
      university_subject: body.universitySubject,
      learning_style: body.learningStyle,
      goal: body.goal,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("study_user_onboarding")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) throw error;

    try {
      await supabase.from("study_site_events").insert({
        visitor_key: user.id,
        user_id: user.id,
        user_email: user.email ?? null,
        event_type: "feature_use",
        page: "/onboarding",
        feature: "onboarding_completed",
        metadata: {
          educationLevel: body.educationLevel,
          country: body.country,
          curriculumStage: body.curriculumStage,
          subjects: body.subjects,
          learningStyle: body.learningStyle,
          goal: body.goal
        }
      });
    } catch {
      // Onboarding should not fail because analytics failed.
    }

    return NextResponse.json({ onboarding: data, completed: true });
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to save onboarding.") },
      { status: 400 }
    );
  }
}
