import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { defaultUserPreferences } from "@/lib/preferences/defaults";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";

const schema = z.object({
  theme: z.enum(["dark", "light"]).optional(),
  playfulMotion: z.boolean().optional(),
  rememberLastStudio: z.boolean().optional(),
  lastStudioId: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value : value === null ? null : undefined),
    z.string().nullable().optional()
  ),
  defaultTool: z.enum(["summary", "flashcards", "quiz", "exam", "insights", "hard_mode", "study_plan", "concepts"]).optional()
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("study_user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      ...defaultUserPreferences,
      theme: data?.theme === "light" ? "light" : defaultUserPreferences.theme,
      playfulMotion: data?.playful_motion ?? defaultUserPreferences.playfulMotion,
      rememberLastStudio: data?.remember_last_studio ?? defaultUserPreferences.rememberLastStudio,
      lastStudioId: data?.last_studio_id ?? defaultUserPreferences.lastStudioId,
      defaultTool: data?.default_tool ?? defaultUserPreferences.defaultTool
    });
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to load your preferences.") },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = schema.parse(await req.json());
    const payload = {
      user_id: user.id,
      theme: body.theme,
      playful_motion: body.playfulMotion,
      remember_last_studio: body.rememberLastStudio,
      last_studio_id: body.lastStudioId,
      default_tool: body.defaultTool,
      updated_at: new Date().toISOString()
    };

    const filteredPayload = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

    const { data, error } = await supabase
      .from("study_user_preferences")
      .upsert(filteredPayload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      theme: data.theme === "light" ? "light" : defaultUserPreferences.theme,
      playfulMotion: data.playful_motion ?? defaultUserPreferences.playfulMotion,
      rememberLastStudio: data.remember_last_studio ?? defaultUserPreferences.rememberLastStudio,
      lastStudioId: data.last_studio_id ?? defaultUserPreferences.lastStudioId,
      defaultTool: data.default_tool ?? defaultUserPreferences.defaultTool
    });
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to save your preferences.") },
      { status: 400 }
    );
  }
}
