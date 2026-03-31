import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromFile } from "@/lib/documents/parser";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const files = form.getAll("files") as File[];
    const sessionId = String(form.get("sessionId") || "");
    if (!sessionId || files.length === 0) {
      return NextResponse.json({ error: "No files or session ID" }, { status: 400 });
    }

    const uploaded = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const storagePath = `${user.id}/${sessionId}/${Date.now()}-${file.name}`;
      const { error: storageError } = await supabase.storage
        .from("study-files")
        .upload(storagePath, arrayBuffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false
        });
      if (storageError) throw storageError;

      const text = await extractTextFromFile(file);
      const { data, error } = await supabase
        .from("study_files")
        .insert([
          {
            session_id: sessionId,
            user_id: user.id,
            file_name: file.name,
            file_type: file.type,
            storage_path: storagePath,
            extracted_text: text
          }
        ])
        .select("*")
        .single();
      if (error) throw error;
      uploaded.push(data);
    }

    return NextResponse.json({ files: uploaded });
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Upload failed.") },
      { status: 400 }
    );
  }
}
