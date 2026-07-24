import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function logStreamError(event: string, details: Record<string, unknown>) {
  // Keep diagnostics useful without logging signed URLs or other credentials.
  console.error(event, details);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to play your uploaded music." }, { status: 401 });
  }

  const { data: track, error: trackError } = await supabase
    .from("user_audio_tracks")
    .select("id, file_name, file_type, storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (trackError || !track) {
    logStreamError("music_stream_track_not_found", { trackId: id, userId: user.id, message: trackError?.message });
    return NextResponse.json({ error: "This audio track is no longer available." }, { status: 404 });
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("user-audio")
    .createSignedUrl(track.storage_path, 60 * 10);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    logStreamError("music_stream_signing_failed", { trackId: track.id, userId: user.id, message: signedUrlError?.message });
    return NextResponse.json({ error: "Unable to prepare this audio file for playback." }, { status: 502 });
  }

  const range = req.headers.get("range");
  let upstream: Response;
  try {
    upstream = await fetch(signedUrlData.signedUrl, {
      headers: range ? { Range: range } : undefined,
      cache: "no-store"
    });
  } catch (error) {
    logStreamError("music_stream_fetch_failed", {
      trackId: track.id,
      userId: user.id,
      message: error instanceof Error ? error.message : "Unknown storage fetch error"
    });
    return NextResponse.json({ error: "The audio file could not be reached. Please try again." }, { status: 502 });
  }

  if (!upstream.ok) {
    logStreamError("music_stream_storage_rejected", { trackId: track.id, userId: user.id, status: upstream.status });
    return NextResponse.json({ error: "The audio file is unavailable. Please try again later." }, { status: 502 });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type") || track.file_type || "audio/mpeg";
  headers.set("Content-Type", contentType);
  headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  for (const header of ["content-length", "content-range", "last-modified", "etag"]) {
    const value = upstream.headers.get(header);
    if (value) headers.set(header, value);
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
