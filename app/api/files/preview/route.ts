import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanStudySourceText } from "@/lib/documents/clean";
import { resolvePreviewKind } from "@/lib/documents/formats";
import { extractDocxDocumentHtml } from "@/lib/documents/parser";

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
  let previewText = file.file_type === "text/web" ? cleanStudySourceText(file.extracted_text) : file.extracted_text;
  let html: string | undefined;
  const isInlineOnly = file.storage_path.startsWith("inline://");

  // Legacy inline records contain extracted text only. Keep that useful rather
  // than sending a renderer a missing original file.
  if (isInlineOnly) {
    const originalKind = resolvePreviewKind(file.file_name, file.file_type, "stored-file");
    if (originalKind !== "text") {
      previewText = `The original ${file.file_name} was not retained in storage, so only its extracted text is available. Re-upload the file to restore its formatted preview.\n\n${previewText || ""}`;
    }

    return NextResponse.json({
      kind: "text",
      fileName: file.file_name,
      text: previewText
    });
  }

  let signedUrl: string | undefined;
  const needsOriginalFile = kind === "pdf" || kind === "image" || kind === "table" || kind === "audio" || kind === "word";

  if (needsOriginalFile) {
    const { data: signedData, error: signedError } = await supabase.storage
      .from("study-files")
      .createSignedUrl(file.storage_path, 60 * 60);

    if (signedError || !signedData?.signedUrl) {
      return NextResponse.json({
        kind: "text",
        fileName: file.file_name,
        text: `The original file is temporarily unavailable, so its formatted preview cannot be displayed. Try opening it again shortly.\n\n${previewText || ""}`
      });
    }

    signedUrl = signedData.signedUrl;
  }

  // For Word documents, also extract HTML for rich preview
  if (kind === "word" && signedUrl) {
    try {
      const response = await fetch(signedUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const { html: htmlContent, text: plainText } = await extractDocxDocumentHtml(buffer);
      if (htmlContent) html = htmlContent;
      if (plainText) previewText = plainText;
    } catch {
      // The extracted text remains a safe fallback when Word parsing fails.
    }
  }

  if (signedUrl) {
    return NextResponse.json({
      kind,
      fileName: file.file_name,
      url: signedUrl,
      text: previewText,
      html
    });
  }

  return NextResponse.json({
    kind,
    fileName: file.file_name,
    text: previewText,
    html
  });
}
