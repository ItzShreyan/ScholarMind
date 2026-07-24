import { createClient } from "@/lib/supabase/server";
import { inferFileMimeType, isImageDocument } from "@/lib/documents/formats";
import type { AIImageAttachment } from "@/types";

const MAX_VISION_IMAGES = 4;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const supportedVisionMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

type VisionSource = {
  file_name: string;
  file_type: string | null;
  storage_path: string | null;
  source_enabled: boolean | null;
  created_at: string;
};

export type VisionAttachmentResult = {
  attachments: AIImageAttachment[];
  warnings: string[];
};

/**
 * Loads a small, bounded set of source-enabled images for a vision-capable
 * provider. Files are downloaded sequentially to avoid a burst of Storage
 * requests in a single server invocation.
 */
export async function loadVisionAttachments(
  userId: string,
  sessionId?: string
): Promise<VisionAttachmentResult> {
  if (!sessionId) return { attachments: [], warnings: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_files")
    .select("file_name, file_type, storage_path, source_enabled, created_at")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("vision_attachment_query_failed", { sessionId, userId, message: error.message });
    return { attachments: [], warnings: ["Image sources could not be loaded for visual analysis."] };
  }

  const sources = ((data ?? []) as VisionSource[])
    .filter((file) => file.source_enabled !== false)
    .filter((file) => file.storage_path && !file.storage_path.startsWith("inline://"))
    .filter((file) => isImageDocument(file.file_name, file.file_type || undefined))
    .slice(0, MAX_VISION_IMAGES);

  const attachments: AIImageAttachment[] = [];
  const warnings: string[] = [];

  for (const file of sources) {
    const mimeType = inferFileMimeType(file.file_name, file.file_type || undefined);
    if (!supportedVisionMimeTypes.has(mimeType)) {
      warnings.push(`${file.file_name} is stored, but its image format is not supported for visual analysis yet.`);
      continue;
    }

    try {
      const { data: blob, error: downloadError } = await supabase.storage
        .from("study-files")
        .download(file.storage_path!);

      if (downloadError || !blob) {
        throw new Error(downloadError?.message || "Storage did not return the image.");
      }
      if (blob.size > MAX_IMAGE_BYTES) {
        warnings.push(`${file.file_name} is too large for direct visual analysis and was skipped.`);
        continue;
      }

      const data = Buffer.from(await blob.arrayBuffer()).toString("base64");
      const persistedMimeType = blob.type.split(";", 1)[0].trim().toLowerCase();
      if (persistedMimeType && persistedMimeType !== mimeType) {
        console.warn("vision_attachment_mime_mismatch", {
          sessionId,
          userId,
          fileName: file.file_name,
          databaseMimeType: mimeType,
          storageMimeType: persistedMimeType
        });
      }
      console.info("vision_attachment_loaded", {
        sessionId,
        userId,
        fileName: file.file_name,
        mimeType,
        storageMimeType: persistedMimeType || null,
        size: blob.size
      });
      attachments.push({ name: file.file_name, mimeType, data });
    } catch (error) {
      console.error("vision_attachment_load_failed", {
        sessionId,
        userId,
        fileName: file.file_name,
        message: error instanceof Error ? error.message : "Unknown storage download error"
      });
      warnings.push(`${file.file_name} could not be added for visual analysis.`);
    }
  }

  return { attachments, warnings };
}
