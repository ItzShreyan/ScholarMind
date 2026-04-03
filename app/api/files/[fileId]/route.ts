import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";

export async function PATCH(req: Request, context: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId } = await context.params;
    const body = await req.json();
    const sourceEnabled = body?.sourceEnabled;

    if (typeof sourceEnabled !== "boolean") {
      return NextResponse.json({ error: "Choose whether this file should stay source-enabled." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: file, error } = await supabase
      .from("study_files")
      .update({ source_enabled: sourceEnabled })
      .eq("id", fileId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !file) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    return NextResponse.json({ file });
  } catch (error) {
    return NextResponse.json(
      {
        error: formatSupabaseSetupError((error as Error).message || "Unable to update this source.")
      },
      { status: 400 }
    );
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: file, error: fileError } = await supabase
      .from("study_files")
      .select("id, session_id, storage_path")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .single();

    if (fileError || !file) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    if (file.storage_path && !file.storage_path.startsWith("inline://")) {
      await supabase.storage.from("study-files").remove([file.storage_path]);
    }

    const { error: deleteError } = await supabase
      .from("study_files")
      .delete()
      .eq("id", fileId)
      .eq("user_id", user.id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ ok: true, sessionId: file.session_id, fileId });
  } catch (error) {
    return NextResponse.json(
      {
        error: formatSupabaseSetupError((error as Error).message || "Unable to remove this source.")
      },
      { status: 400 }
    );
  }
}
