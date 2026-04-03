import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanStudySourceText } from "@/lib/documents/clean";
import { resolvePreviewKind } from "@/lib/documents/formats";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "Missing file ID." }, { status: 400 });
  }

  const { data: file, error } = await supabase
    .from("study_files")
    .select("id, file_name, file_type, storage_path, extracted_text")
    .eq("id", fileId)
    .eq("user_id", user.id)
    .single();

  if (error || !file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const kind = resolvePreviewKind(file.file_name, file.file_type, file.storage_path);
  const previewText = file.file_type === "text/web" ? cleanStudySourceText(file.extracted_text) : file.extracted_text;

  if ((kind === "pdf" || kind === "image") && !file.storage_path.startsWith("inline://")) {
    const { data: signedData, error: signedError } = await supabase.storage
      .from("study-files")
      .createSignedUrl(file.storage_path, 60 * 60);

    if (signedError || !signedData?.signedUrl) {
      return NextResponse.json({
        kind: "text",
        fileName: file.file_name,
        text: previewText
      });
    }

    return NextResponse.json({
      kind,
      fileName: file.file_name,
      url: signedData.signedUrl,
      text: previewText
    });
  }

  return NextResponse.json({
    kind,
    fileName: file.file_name,
    text: previewText
  });
}
