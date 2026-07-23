import { NextResponse } from "next/server";
import { attachRefreshedSpotifySession, spotifyApiFetch } from "@/lib/music/spotify";

/**
 * GET /api/music/spotify/audio-analysis/:id
 * Proxies GET https://api.spotify.com/v1/audio-analysis/:id
 *
 * Returns the raw Spotify audio-analysis object: { beats, sections, tempo, ... }
 * The response is large (30–200 KB) but only fetched once per track thanks to
 * the client-side Map cache in useSpotifyBeatClock.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing track id." }, { status: 400 });
  }

  const { tokens, response } = await spotifyApiFetch(
    req,
    `/audio-analysis/${encodeURIComponent(id.trim())}`,
    { method: "GET" }
  );

  if (!tokens) {
    return response;
  }

  if (!response.ok) {
    const details = await response.text();
    const payload = NextResponse.json(
      {
        error:
          response.status === 404
            ? "Audio analysis not available for this track."
            : details || "Unable to fetch audio analysis."
      },
      { status: response.status }
    );
    return attachRefreshedSpotifySession(payload, tokens);
  }

  const json = await response.json().catch(() => ({}));
  const payload = NextResponse.json({ ok: true, ...json });
  return attachRefreshedSpotifySession(payload, tokens);
}
