import { NextResponse } from "next/server";
import { attachRefreshedSpotifySession, spotifyApiFetch } from "@/lib/music/spotify";

export async function GET(req: Request) {
  const { tokens, response } = await spotifyApiFetch(req, "/me/player/currently-playing");

  if (!tokens) {
    return response;
  }

  if (response.status === 204) {
    const payload = NextResponse.json({ playing: false, track: null });
    return attachRefreshedSpotifySession(payload, tokens);
  }

  if (!response.ok) {
    const payload = NextResponse.json(
      { playing: false, track: null, error: "Unable to read Spotify playback state." },
      { status: response.status }
    );
    return attachRefreshedSpotifySession(payload, tokens);
  }

  const json = (await response.json()) as {
    is_playing?: boolean;
    item?: {
      id: string;
      name: string;
      uri: string;
      duration_ms: number;
      artists: Array<{ name: string }>;
      album: { name: string; images?: Array<{ url: string }> };
    };
  };

  const track = json.item
    ? {
        id: json.item.id,
        name: json.item.name,
        uri: json.item.uri,
        artist: json.item.artists.map((artist) => artist.name).join(", "),
        album: json.item.album.name,
        imageUrl: json.item.album.images?.[0]?.url ?? null,
        durationMs: json.item.duration_ms
      }
    : null;

  const payload = NextResponse.json({
    playing: Boolean(json.is_playing),
    track
  });
  return attachRefreshedSpotifySession(payload, tokens);
}
