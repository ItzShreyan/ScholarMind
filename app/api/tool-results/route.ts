import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";

export const runtime = "nodejs";

const postSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().uuid(),
  action: z.string().min(1),
  title: z.string().min(1),
  label: z.string().min(1),
  preview: z.string().min(1),
  output: z.string().min(1)
});

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId parameter" }, { status: 400 });
    }

    const { data: results, error } = await supabase
      .from("study_tool_results")
      .select("*")
      .eq("user_id", user.id)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Map database columns back to camelCase for ToolHistoryItem interface
    const mappedResults = (results ?? []).map((item) => ({
      id: item.id,
      action: item.action,
      title: item.title,
      label: item.label,
      preview: item.preview,
      output: item.output,
      createdAt: new Date(item.created_at).getTime()
    }));

    return NextResponse.json({ results: mappedResults });
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to load tool results.") },
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

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = postSchema.parse(await req.json());

    // Verify session ownership
    const { data: session, error: sessionError } = await supabase
      .from("study_sessions")
      .select("id")
      .eq("id", body.sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      throw new Error("Unable to save tool results for this studio.");
    }

    const { data, error } = await supabase
      .from("study_tool_results")
      .insert([
        {
          id: body.id,
          session_id: body.sessionId,
          user_id: user.id,
          action: body.action,
          title: body.title,
          label: body.label,
          preview: body.preview,
          output: body.output
        }
      ])
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      result: {
        id: data.id,
        action: data.action,
        title: data.title,
        label: data.label,
        preview: data.preview,
        output: data.output,
        createdAt: new Date(data.created_at).getTime()
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to save tool result.") },
      { status: 400 }
    );
  }
}
