import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inferFileMimeType, isAudioDocument } from "@/lib/documents/formats";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Maximum audio tracks a single user may upload. Adjust here to change the limit. */
const MAX_AUDIO_UPLOADS_PER_USER = 20;

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
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Upload cap check ─────────────────────────────────────────────────
    const { count: existingCount, error: countError } = await supabase
      .from("user_audio_tracks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      return NextResponse.json({ error: "Failed to check upload limit." }, { status: 500 });
    }

    if (existingCount !== null && existingCount >= MAX_AUDIO_UPLOADS_PER_USER) {
      return NextResponse.json(
        {
          error: `You've reached the upload limit of ${MAX_AUDIO_UPLOADS_PER_USER} songs. Delete some tracks to upload more.`,
          limit: MAX_AUDIO_UPLOADS_PER_USER,
          current: existingCount
        },
        { status: 429 }
      );
    }

    const form = await req.formData();
    const files = form.getAll("files").filter(isUploadedFile);
    if (files.length === 0) {
      return NextResponse.json({ error: "No audio files provided" }, { status: 400 });
    }

    const errors: string[] = [];

    // Don't allow uploading more files than remaining capacity
    const remaining = existingCount !== null ? MAX_AUDIO_UPLOADS_PER_USER - existingCount : files.length;
    const filesToProcess = files.slice(0, remaining);
    if (filesToProcess.length < files.length) {
      errors.push(
        `Upload limit reached. Only ${remaining} of ${files.length} file(s) were processed. Delete some tracks to upload more.`
      );
    }

    const uploaded: Array<{
      id: string;
      name: string;
      artist: string;
      file_name: string;
      playback_url: string;
      duration: number;
    }> = [];

    for (const file of filesToProcess) {
      try {
        const mimeType = inferFileMimeType(file.name, file.type);
        if (!isAudioDocument(file.name, mimeType)) {
          errors.push(`${file.name}: Unsupported audio format.`);
          continue;
        }

        if (file.size > 50 * 1024 * 1024) {
          errors.push(`${file.name}: File exceeds 50 MB limit.`);
          continue;
        }

        const arrayBuffer = await file.arrayBuffer();
        const storagePath = `${user.id}/${Date.now()}-${file.name}`;

        const { error: storageError } = await supabase.storage
          .from("user-audio")
          .upload(storagePath, arrayBuffer, {
            contentType: mimeType,
            upsert: false
          });

        if (storageError) {
          errors.push(`${file.name}: Upload failed.`);
          continue;
        }

        const { data: track, error: dbError } = await supabase
          .from("user_audio_tracks")
          .insert([
            {
              user_id: user.id,
              name: file.name.replace(/\.[^/.]+$/, ""),
              artist: "Uploaded audio",
              file_name: file.name,
              file_type: mimeType,
              storage_path: storagePath,
              duration: 0
            }
          ])
          .select("*")
          .single();

        if (dbError) {
          errors.push(`${file.name}: Database error.`);
          continue;
        }

        uploaded.push({
          id: track.id,
          name: track.name,
          artist: track.artist,
          file_name: track.file_name,
          playback_url: `/api/music/tracks/${encodeURIComponent(track.id)}/stream`,
          duration: track.duration
        });
      } catch (error) {
        console.error("music_upload_failed", {
          fileName: file.name,
          message: error instanceof Error ? error.message : "Unknown upload error"
        });
        errors.push(`${file.name}: Upload failed.`);
      }
    }

    return NextResponse.json({ tracks: uploaded, errors });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Upload failed." },
      { status: 500 }
    );
  }
}
