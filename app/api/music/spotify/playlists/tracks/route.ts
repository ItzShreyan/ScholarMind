import { NextResponse } from "next/server";
import { mapSpotifyTrack } from "@/lib/music/spotify-catalog";
import { attachRefreshedSpotifySession, spotifyApiFetch } from "@/lib/music/spotify";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const playlistId = searchParams.get("playlistId")?.trim();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 30), 1), 50);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

  if (!playlistId) {
    return NextResponse.json({ error: "Missing playlist id." }, { status: 400 });
  }

  const { tokens, response } = await spotifyApiFetch(
    req,
    `/playlists/${encodeURIComponent(playlistId)}/tracks?limit=${limit}&offset=${offset}&fields=items(track(id,name,uri,duration_ms,artists(name),album(name,images))),total`
  );

  if (!tokens) {
    return response;
  }

  if (!response.ok) {
    const details = await response.text();
    const payload = NextResponse.json(
      { error: details || "Unable to load playlist tracks." },
      { status: response.status }
    );
    return attachRefreshedSpotifySession(payload, tokens);
  }

  const json = (await response.json()) as {
    items?: Array<{ track?: Parameters<typeof mapSpotifyTrack>[0] }>;
    total?: number;
  };

  const tracks = (json.items ?? [])
    .map((item) => mapSpotifyTrack(item.track))
    .filter((track): track is NonNullable<typeof track> => Boolean(track));

  const payload = NextResponse.json({
    tracks,
    total: json.total ?? tracks.length,
    offset,
    limit
  });
  return attachRefreshedSpotifySession(payload, tokens);
}
