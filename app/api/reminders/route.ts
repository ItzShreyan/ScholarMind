import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const reminderAt = new Date(Date.now() + (body.daysAhead || 2) * 86400000).toISOString();

    const { data, error } = await supabase
      .from("study_reminders")
      .insert([
        {
          user_id: user.id,
          session_id: body.sessionId,
          reminder_at: reminderAt,
          message: body.message || "Time for your next spaced repetition review."
        }
      ])
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to create reminder.") },
      { status: 400 }
    );
  }
}
