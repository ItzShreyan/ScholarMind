import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const { data, error } = await supabase
        .from("study_files")
        .select("*")
        .eq("user_id", user.id)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return NextResponse.json({ files: data ?? [] });
    }

    const { data, error } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({ sessions: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to load studios.") },
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

    const body = await req.json();
    const title = body.title || "Untitled Studio";

    const { data, error } = await supabase
      .from("study_sessions")
      .insert([{ user_id: user.id, title }])
      .select("*")
      .single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to create a studio.") },
      { status: 400 }
    );
  }
}
