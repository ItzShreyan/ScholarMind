import { NextResponse } from "next/server";
import { mapSpotifyPlaylist } from "@/lib/music/spotify-catalog";
import { attachRefreshedSpotifySession, spotifyApiFetch } from "@/lib/music/spotify";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 20), 1), 50);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

  const { tokens, response } = await spotifyApiFetch(
    req,
    `/me/playlists?limit=${limit}&offset=${offset}`
  );

  if (!tokens) {
    return response;
  }

  if (!response.ok) {
    const details = await response.text();
    const payload = NextResponse.json(
      { error: details || "Unable to load Spotify playlists." },
      { status: response.status }
    );
    return attachRefreshedSpotifySession(payload, tokens);
  }

  const json = (await response.json()) as {
    items?: Array<{
      id: string;
      name: string;
      uri: string;
      description?: string | null;
      owner?: { display_name?: string | null };
      images?: Array<{ url: string }>;
      tracks?: { total?: number };
    }>;
    total?: number;
  };

  const playlists = (json.items ?? []).map(mapSpotifyPlaylist);
  const payload = NextResponse.json({
    playlists,
    total: json.total ?? playlists.length,
    offset,
    limit
  });
  return attachRefreshedSpotifySession(payload, tokens);
}
