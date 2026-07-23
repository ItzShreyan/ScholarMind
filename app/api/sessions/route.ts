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

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!sessionId) {
      return NextResponse.json({ error: "Studio not found." }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "Give the studio a title first." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("study_sessions")
      .update({ title })
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !data) {
      throw error || new Error("Unable to rename this studio.");
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to rename this studio.") },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

    if (!sessionId) {
      return NextResponse.json({ error: "Studio not found." }, { status: 400 });
    }

    const { data: files, error: filesError } = await supabase
      .from("study_files")
      .select("id, storage_path")
      .eq("session_id", sessionId)
      .eq("user_id", user.id);

    if (filesError) {
      throw filesError;
    }

    const storagePaths = (files ?? [])
      .map((file) => file.storage_path)
      .filter((path): path is string => Boolean(path && !path.startsWith("inline://")));

    if (storagePaths.length) {
      await supabase.storage.from("study-files").remove(storagePaths);
    }

    const { error } = await supabase
      .from("study_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    const { data: sessions, error: sessionsError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (sessionsError) {
      throw sessionsError;
    }

    return NextResponse.json({
      ok: true,
      sessionId,
      sessions: sessions ?? []
    });
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to delete this studio.") },
      { status: 400 }
    );
  }
}
