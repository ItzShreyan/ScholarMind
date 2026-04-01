import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { defaultMaxUploadFileSizeMb } from "@/lib/documents/formats";
import { extractDocumentContent } from "@/lib/documents/parser";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";

export const runtime = "nodejs";
export const maxDuration = 60;

function isUploadedFile(entry: FormDataEntryValue): entry is File {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "arrayBuffer" in entry &&
    typeof entry.arrayBuffer === "function" &&
    "name" in entry
  );
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const files = form.getAll("files").filter(isUploadedFile);
    const sessionId = String(form.get("sessionId") || "");
    if (!sessionId || files.length === 0) {
      return NextResponse.json({ error: "No files or session ID" }, { status: 400 });
    }

    const maxUploadFileSizeMb = Math.max(1, Number(process.env.MAX_UPLOAD_FILE_MB ?? defaultMaxUploadFileSizeMb));
    const maxUploadFileSizeBytes = maxUploadFileSizeMb * 1024 * 1024;
    const uploaded = [];
    const warnings: string[] = [];
    const rejectedFiles: { fileName: string; reason: string }[] = [];
    for (const file of files) {
      try {
        if (file.size > maxUploadFileSizeBytes) {
          rejectedFiles.push({
            fileName: file.name,
            reason: `${file.name} is larger than the ${maxUploadFileSizeMb} MB upload limit.`
          });
          continue;
        }

        const extraction = await extractDocumentContent(file);
        if (!extraction.readable) {
          rejectedFiles.push({
            fileName: file.name,
            reason: extraction.rejectionReason || "This file could not be read."
          });
          continue;
        }

        const arrayBuffer = await file.arrayBuffer();
        const realStoragePath = `${user.id}/${sessionId}/${Date.now()}-${file.name}`;
        let storagePath = realStoragePath;

        const { error: storageError } = await supabase.storage
          .from("study-files")
          .upload(realStoragePath, arrayBuffer, {
            contentType: file.type || "application/octet-stream",
            upsert: false
          });

        if (storageError) {
          storagePath = `inline://${user.id}/${sessionId}/${Date.now()}-${file.name}`;
          warnings.push(
            `Stored ${file.name} as an inline study source because Supabase storage rejected the raw file.`
          );
        }

        const { data, error } = await supabase
          .from("study_files")
          .insert([
            {
              session_id: sessionId,
              user_id: user.id,
              file_name: file.name,
              file_type: file.type,
              storage_path: storagePath,
              extracted_text: extraction.text
            }
          ])
          .select("*")
          .single();
        if (error) throw error;
        uploaded.push(data);
      } catch (error) {
        rejectedFiles.push({
          fileName: file.name,
          reason:
            (error as Error).message ||
            "This file could not be read clearly enough. Reupload another copy of it."
        });
      }
    }

    if (!uploaded.length && rejectedFiles.length) {
      return NextResponse.json(
        {
          error: rejectedFiles[0].reason,
          rejectedFiles
        },
        { status: 400 }
      );
    }

    const { data: savedFiles, error: fetchError } = await supabase
      .from("study_files")
      .select("*")
      .eq("user_id", user.id)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    if (fetchError) throw fetchError;

    return NextResponse.json({ files: savedFiles ?? uploaded, warnings, rejectedFiles });
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Upload failed.") },
      { status: 400 }
    );
  }
}
