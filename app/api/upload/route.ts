import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { defaultMaxUploadFileSizeMb, getFileExtension, inferFileMimeType, isImageDocument } from "@/lib/documents/formats";
import { extractDocumentContent } from "@/lib/documents/parser";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";

export const runtime = "nodejs";
// Images are persisted immediately and analyzed later by the vision provider,
// but documents can still take longer than a default serverless invocation.
export const maxDuration = 300;
const FILE_PROCESSING_TIMEOUT_MS = 40_000;

function withFileTimeout<T>(promise: Promise<T>, fileName: string, stage: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${fileName} took too long during ${stage}. It was skipped; try a smaller or simpler copy.`)),
      FILE_PROCESSING_TIMEOUT_MS
    );
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function storageFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFKC")
    .replace(/[\\/\\?%*:|\"<>\\u0000-\\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const safe = normalized.replace(/^\.+/, "") || "upload";
  return safe.slice(0, 180);
}

async function verifyStorageMetadata({
  supabase,
  folder,
  storedName,
  expectedMimeType,
  fileName
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  folder: string;
  storedName: string;
  expectedMimeType: string;
  fileName: string;
}) {
  try {
    const { data, error } = await withFileTimeout(
      supabase.storage.from("study-files").list(folder, { limit: 10, search: storedName }),
      fileName,
      "storage metadata verification"
    );
    if (error) throw error;

    const stored = data?.find((entry) => entry.name === storedName);
    const persistedMimeType = stored?.metadata?.mimetype || "";
    const matches = persistedMimeType.toLowerCase() === expectedMimeType.toLowerCase();
    console.info("study_upload_storage_metadata", {
      fileName,
      expectedMimeType,
      persistedMimeType: persistedMimeType || null,
      matches
    });
    if (!matches) {
      console.warn("study_upload_storage_metadata_mismatch", {
        fileName,
        expectedMimeType,
        persistedMimeType: persistedMimeType || null
      });
    }
  } catch (error) {
    // A failed metadata read should not discard an otherwise successful upload.
    console.warn("study_upload_storage_metadata_check_failed", {
      fileName,
      expectedMimeType,
      message: error instanceof Error ? error.message : "Unknown metadata verification error"
    });
  }
}

function isUploadedFile(entry: FormDataEntryValue): entry is File {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "arrayBuffer" in entry &&
    typeof entry.arrayBuffer === "function" &&
    "name" in entry
  );
}

const blockedExtensions = new Set([
  "app",
  "bat",
  "bin",
  "cmd",
  "com",
  "dll",
  "dmg",
  "exe",
  "jar",
  "js",
  "mjs",
  "php",
  "ps1",
  "scr",
  "sh",
  "svg",
  "vbs"
]);

const audioExtensions = new Set(["mp3", "wav", "m4a", "ogg", "flac", "aac"]);
const textExtensions = new Set(["txt", "md", "markdown", "json", "yaml", "yml", "xml", "html", "htm", "rtf", "csv", "tsv"]);
const zipDocumentExtensions = new Set(["docx", "xlsx", "pptx", "ods", "odp"]);
const legacyOfficeExtensions = new Set(["doc", "xls", "ppt"]);

function startsWithBytes(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

function asciiAt(bytes: Uint8Array, start: number, length: number) {
  return Array.from(bytes.slice(start, start + length))
    .map((byte) => String.fromCharCode(byte))
    .join("");
}

async function validateFileSignature(file: File) {
  const extension = getFileExtension(file.name);
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const type = (file.type || "").toLowerCase();

  if (blockedExtensions.has(extension)) {
    return "This file type is not allowed for safety. Upload a PDF, image, document, spreadsheet, or plain text source instead.";
  }

  const isPdf = startsWithBytes(header, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  const isPng = startsWithBytes(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isJpeg = startsWithBytes(header, [0xff, 0xd8, 0xff]);
  const isGif = startsWithBytes(header, [0x47, 0x49, 0x46, 0x38]);
  const isBmp = startsWithBytes(header, [0x42, 0x4d]);
  const isTiff = startsWithBytes(header, [0x49, 0x49, 0x2a, 0x00]) || startsWithBytes(header, [0x4d, 0x4d, 0x00, 0x2a]);
  const isWebp = asciiAt(header, 0, 4) === "RIFF" && asciiAt(header, 8, 4) === "WEBP";
  const isHeic = asciiAt(header, 4, 4) === "ftyp" && /heic|heif|mif1|msf1/i.test(asciiAt(header, 8, 8));
  const isMp3 = startsWithBytes(header, [0x49, 0x44, 0x33]); // ID3v2 tag
  const isWav = startsWithBytes(header, [0x52, 0x49, 0x46, 0x46]) && asciiAt(header, 8, 4) === "WAVE";
  const isFlac = startsWithBytes(header, [0x66, 0x4c, 0x61, 0x43]);
  const isOgg = startsWithBytes(header, [0x4f, 0x67, 0x67, 0x53]);
  const isM4a = asciiAt(header, 4, 4) === "ftyp" && asciiAt(header, 8, 4) === "M4A ";
  const isZip = startsWithBytes(header, [0x50, 0x4b, 0x03, 0x04]) || startsWithBytes(header, [0x50, 0x4b, 0x05, 0x06]) || startsWithBytes(header, [0x50, 0x4b, 0x07, 0x08]);
  const isLegacyOffice = startsWithBytes(header, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  const hasNullByte = header.includes(0);

  if (extension === "pdf" || type.includes("pdf")) {
    return isPdf ? "" : "This PDF does not look like a real PDF file. Re-export it and upload again.";
  }

  if (["png", "jpg", "jpeg", "gif", "bmp", "tif", "tiff", "webp", "heic", "heif"].includes(extension) || type.startsWith("image/")) {
    const validImage = isPng || isJpeg || isGif || isBmp || isTiff || isWebp || isHeic;
    return validImage ? "" : "This image file could not be verified. Reupload it as PNG, JPG, WebP, TIFF, HEIC, or PDF.";
  }

  if (zipDocumentExtensions.has(extension)) {
    return isZip ? "" : "This Office/OpenDocument file could not be verified. Re-export it and upload again.";
  }

  if (legacyOfficeExtensions.has(extension)) {
    return isLegacyOffice ? "" : "This legacy Office file could not be verified. Re-export it as PDF, DOCX, or XLSX.";
  }

  if (audioExtensions.has(extension) || type.startsWith("audio/")) {
    const validAudio = isMp3 || isWav || isFlac || isOgg || isM4a;
    return validAudio ? "" : "This audio file could not be verified. Reupload it as MP3, WAV, M4A, OGG, or FLAC.";
  }

  if (textExtensions.has(extension) || type.startsWith("text/") || type.includes("json") || type.includes("xml")) {
    if (isPdf || isZip || isLegacyOffice || isPng || isJpeg || isGif || isBmp || isTiff || isWebp || isHeic || hasNullByte) {
      return "This text file appears to contain binary data. Reupload a clean text, CSV, markdown, or PDF copy.";
    }
    return "";
  }

  return "Unsupported file type. Upload a PDF, image, DOCX, PPTX, ODP, spreadsheet, CSV, markdown, plain text, or audio source.";
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

    const { data: ownedSession, error: sessionError } = await supabase
      .from("study_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!ownedSession) {
      return NextResponse.json({ error: "You can only upload sources to your own studio." }, { status: 403 });
    }

    const maxUploadFileSizeMb = Math.max(1, Number(process.env.MAX_UPLOAD_FILE_MB ?? defaultMaxUploadFileSizeMb));
    const maxUploadFileSizeBytes = maxUploadFileSizeMb * 1024 * 1024;
    const uploaded: unknown[] = [];
    const rejectedFiles: { fileName: string; reason: string }[] = [];

    for (const [index, file] of files.entries()) {
      let storagePath: string | null = null;
      const startedAt = Date.now();
      const contentType = inferFileMimeType(file.name, file.type);
      const storedName = storageFileName(file.name);
      try {
        console.info("study_upload_file_started", {
          fileName: file.name,
          storedName,
          mimeType: contentType,
          size: file.size,
          position: index + 1,
          total: files.length
        });
        if (file.size > maxUploadFileSizeBytes) {
          console.warn("study_upload_file_rejected", { fileName: file.name, size: file.size, reason: "file_too_large" });
          rejectedFiles.push({
            fileName: file.name,
            reason: `${file.name} is larger than the ${maxUploadFileSizeMb} MB upload limit.`
          });
          continue;
        }

        const signatureError = await withFileTimeout(validateFileSignature(file), file.name, "file validation");
        if (signatureError) {
          console.warn("study_upload_file_rejected", { fileName: file.name, reason: "signature_validation", mimeType: contentType });
          rejectedFiles.push({
            fileName: file.name,
            reason: signatureError
          });
          continue;
        }

        // Text-only OCR is optional enrichment for images. Do not make an image
        // upload depend on OCR: vision providers receive the original bytes.
        const extraction = isImageDocument(file.name, contentType)
          ? { text: "[Image source available for visual analysis.]", readable: true }
          : await withFileTimeout(extractDocumentContent(file), file.name, "content extraction");
        if (!extraction.readable) {
          console.warn("study_upload_file_rejected", { fileName: file.name, reason: "content_unreadable", mimeType: contentType });
          rejectedFiles.push({
            fileName: file.name,
            reason: extraction.rejectionReason || "This file could not be read."
          });
          continue;
        }

        const arrayBuffer = await withFileTimeout(file.arrayBuffer(), file.name, "file read");
        const folder = `${user.id}/${sessionId}`;
        const realStoragePath = `${folder}/${Date.now()}-${crypto.randomUUID()}-${storedName}`;
        storagePath = realStoragePath;

        const { error: storageError } = await withFileTimeout(
          supabase.storage
            .from("study-files")
            .upload(realStoragePath, arrayBuffer, {
              contentType,
              cacheControl: "3600",
              metadata: {
                originalName: file.name,
                mimeType: contentType
              },
              upsert: false
            }),
          file.name,
          "Supabase upload"
        );

        if (storageError) {
          throw new Error(
            "The original file could not be saved for previewing on your other devices. Please try again after confirming the study-files storage bucket accepts this file type."
          );
        }

        await verifyStorageMetadata({
          supabase,
          folder,
          storedName: realStoragePath.slice(folder.length + 1),
          expectedMimeType: contentType,
          fileName: file.name
        });

        const { data, error } = await withFileTimeout(
          (async () =>
            supabase
              .from("study_files")
              .insert([
                {
                  session_id: sessionId,
                  user_id: user.id,
                  file_name: file.name,
                  file_type: contentType,
                  storage_path: realStoragePath,
                  extracted_text: extraction.text
                }
              ])
              .select("*")
              .single())(),
          file.name,
          "file record creation"
        );
        if (error) throw error;
        uploaded.push(data);
        storagePath = null;
        console.info("study_upload_file_saved", {
          fileName: file.name,
          mimeType: contentType,
          size: file.size,
          visualSource: isImageDocument(file.name, contentType),
          durationMs: Date.now() - startedAt
        });
      } catch (error) {
        if (storagePath) {
          const { error: cleanupError } = await supabase.storage.from("study-files").remove([storagePath]);
          if (cleanupError) {
            console.error("study_upload_file_cleanup_failed", {
              fileName: file.name,
              storagePath,
              message: cleanupError.message
            });
          }
        }
        console.error("study_upload_file_failed", {
          userId: user.id,
          sessionId,
          fileName: file.name,
          mimeType: inferFileMimeType(file.name, file.type),
          size: file.size,
          message: error instanceof Error ? error.message : "Unknown upload error",
          durationMs: Date.now() - startedAt
        });
        rejectedFiles.push({
          fileName: file.name,
          reason: (error as Error).message || "This file could not be read clearly enough. Reupload another copy of it."
        });
      }
    }

    const { data: savedFiles, error: fetchError } = await supabase
      .from("study_files")
      .select("*")
      .eq("user_id", user.id)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    if (fetchError) throw fetchError;

    return NextResponse.json({
      files: savedFiles ?? uploaded,
      uploadedCount: uploaded.length,
      warnings: rejectedFiles.length ? ["Some files could not be uploaded. The remaining files are ready to use."] : [],
      rejectedFiles
    });
  } catch (error) {
    return NextResponse.json(
      { error: formatSupabaseSetupError((error as Error).message || "Upload failed.") },
      { status: 400 }
    );
  }
}
