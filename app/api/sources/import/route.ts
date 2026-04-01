import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { extractWebSourceText } from "@/lib/sources/web";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  sessionId: z.string().min(1),
  title: z.string().min(2).max(180),
  url: z.string().url(),
  snippet: z.string().optional(),
  source: z.string().optional(),
  trustLabel: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = schema.parse(await req.json());
    const extractedText = await extractWebSourceText(body);
    const sourceName = body.source ? `${body.title} (${body.source})` : body.title;

    const { data: session, error: sessionError } = await supabase
      .from("study_sessions")
      .select("id")
      .eq("id", body.sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      throw new Error("Open or create a studio before importing web sources.");
    }

    const { data: insertedFile, error: insertError } = await supabase
      .from("study_files")
      .insert([
        {
          session_id: body.sessionId,
          user_id: user.id,
          file_name: sourceName,
          file_type: "text/web",
          storage_path: `inline://web/${user.id}/${body.sessionId}/${Date.now()}`,
          extracted_text: extractedText
        }
      ])
      .select("*")
      .single();

    if (insertError) {
      throw insertError;
    }

    const { data: savedFiles, error: fetchError } = await supabase
      .from("study_files")
      .select("*")
      .eq("user_id", user.id)
      .eq("session_id", body.sessionId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    return NextResponse.json({
      file: insertedFile,
      files: savedFiles ?? [insertedFile]
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: formatSupabaseSetupError((error as Error).message || "Unable to import the web source.")
      },
      { status: 400 }
    );
  }
}
