import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";

const messageSchema = z.object({
  role: z.enum(["user", "ai"]),
  content: z.string().max(12000)
});

const saveSchema = z.object({
  sessionId: z.string().uuid(),
  messages: z.array(messageSchema).max(80)
});

function isMissingChatTable(error: unknown) {
  const message = String((error as Error)?.message || error || "").toLowerCase();
  return message.includes("study_chat_messages") || message.includes("schema cache") || message.includes("does not exist");
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId") || "";
    if (!sessionId) return NextResponse.json({ messages: [] });

    const { data, error } = await supabase
      .from("study_chat_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(80);

    if (error) throw error;

    return NextResponse.json({ messages: data ?? [] });
  } catch (error) {
    if (isMissingChatTable(error)) {
      return NextResponse.json({ messages: [], warning: "Chat history table is not set up yet." });
    }

    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to load chat history.") },
      { status: 400 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = saveSchema.parse(await req.json());
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error: deleteError } = await supabase
      .from("study_chat_messages")
      .delete()
      .eq("user_id", user.id)
      .eq("session_id", body.sessionId);

    if (deleteError) throw deleteError;

    const rows = body.messages
      .filter((message) => message.content.trim())
      .slice(-80)
      .map((message, index) => ({
        user_id: user.id,
        session_id: body.sessionId,
        role: message.role,
        content: message.content.trim(),
        created_at: new Date(Date.now() + index).toISOString()
      }));

    if (rows.length) {
      const { error: insertError } = await supabase.from("study_chat_messages").insert(rows);
      if (insertError) throw insertError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingChatTable(error)) {
      return NextResponse.json({ ok: false, warning: "Chat history table is not set up yet." });
    }

    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to save chat history.") },
      { status: 400 }
    );
  }
}
