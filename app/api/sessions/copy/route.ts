import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";

function createCopiedFileName(originalName: string, sourceTitle: string, existingNames: Set<string>) {
  if (!existingNames.has(originalName)) {
    existingNames.add(originalName);
    return originalName;
  }

  const extensionIndex = originalName.lastIndexOf(".");
  const stem = extensionIndex > 0 ? originalName.slice(0, extensionIndex) : originalName;
  const extension = extensionIndex > 0 ? originalName.slice(extensionIndex) : "";
  const sourceLabel = sourceTitle.trim().slice(0, 24) || "copied";

  let counter = 1;
  let candidate = `${stem} (${sourceLabel})${extension}`;
  while (existingNames.has(candidate)) {
    counter += 1;
    candidate = `${stem} (${sourceLabel} ${counter})${extension}`;
  }

  existingNames.add(candidate);
  return candidate;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const sourceSessionId = String(body.sourceSessionId || "");
    const targetSessionId = String(body.targetSessionId || "");

    if (!sourceSessionId || !targetSessionId) {
      return NextResponse.json({ error: "Source and target studio IDs are required." }, { status: 400 });
    }

    if (sourceSessionId === targetSessionId) {
      return NextResponse.json({ error: "Pick a different studio to copy from." }, { status: 400 });
    }

    const { data: ownedSessions, error: sessionError } = await supabase
      .from("study_sessions")
      .select("id, title")
      .eq("user_id", user.id)
      .in("id", [sourceSessionId, targetSessionId]);
    if (sessionError) throw sessionError;

    const sourceSession = ownedSessions?.find((session) => session.id === sourceSessionId);
    const targetSession = ownedSessions?.find((session) => session.id === targetSessionId);

    if (!sourceSession || !targetSession) {
      return NextResponse.json({ error: "One of those studios could not be found." }, { status: 404 });
    }

    const { data: sourceFiles, error: sourceFilesError } = await supabase
      .from("study_files")
      .select("file_name, file_type, storage_path, extracted_text")
      .eq("user_id", user.id)
      .eq("session_id", sourceSessionId)
      .order("created_at", { ascending: false });
    if (sourceFilesError) throw sourceFilesError;

    const { data: targetFiles, error: targetFilesError } = await supabase
      .from("study_files")
      .select("file_name")
      .eq("user_id", user.id)
      .eq("session_id", targetSessionId);
    if (targetFilesError) throw targetFilesError;

    if (!sourceFiles?.length) {
      const { data: files } = await supabase
        .from("study_files")
        .select("*")
        .eq("user_id", user.id)
        .eq("session_id", targetSessionId)
        .order("created_at", { ascending: false });

      return NextResponse.json({
        files: files ?? [],
        copiedCount: 0,
        message: `${sourceSession.title} does not have any saved sources yet.`
      });
    }

    const existingNames = new Set((targetFiles ?? []).map((file) => file.file_name));
    const copiedRows = sourceFiles.map((file) => ({
      session_id: targetSessionId,
      user_id: user.id,
      file_name: createCopiedFileName(file.file_name, sourceSession.title, existingNames),
      file_type: file.file_type,
      storage_path: file.storage_path,
      extracted_text: file.extracted_text
    }));

    const { error: insertError } = await supabase.from("study_files").insert(copiedRows);
    if (insertError) throw insertError;

    const { data: files, error: filesError } = await supabase
      .from("study_files")
      .select("*")
      .eq("user_id", user.id)
      .eq("session_id", targetSessionId)
      .order("created_at", { ascending: false });
    if (filesError) throw filesError;

    return NextResponse.json({
      files: files ?? [],
      copiedCount: copiedRows.length,
      message: `Copied ${copiedRows.length} source(s) from ${sourceSession.title} into ${targetSession.title}.`
    });
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Unable to copy sources.") },
      { status: 400 }
    );
  }
}
