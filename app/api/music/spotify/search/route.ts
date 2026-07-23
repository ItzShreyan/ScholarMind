import { NextResponse } from "next/server";
import { z } from "zod";
import { mapSpotifyTrack } from "@/lib/music/spotify-catalog";
import { attachRefreshedSpotifySession, spotifyApiFetch } from "@/lib/music/spotify";

const schema = z.object({
  query: z.string().min(1).max(120)
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = schema.safeParse({ query: searchParams.get("q")?.trim() || "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a search term." }, { status: 400 });
  }

  const encoded = encodeURIComponent(parsed.data.query);
  const { tokens, response } = await spotifyApiFetch(
    req,
    `/search?q=${encoded}&type=track&limit=12`
  );

  if (!tokens) {
    return response;
  }

  if (!response.ok) {
    const details = await response.text();
    const payload = NextResponse.json(
      { error: details || "Spotify search failed." },
      { status: response.status }
    );
    return attachRefreshedSpotifySession(payload, tokens);
  }

  const json = (await response.json()) as {
    tracks?: {
      items?: Array<Parameters<typeof mapSpotifyTrack>[0]>;
    };
  };

  const tracks =
    json.tracks?.items
      ?.map((track) => mapSpotifyTrack(track))
      .filter((track): track is NonNullable<typeof track> => Boolean(track)) ?? [];

  const payload = NextResponse.json({ tracks });
  return attachRefreshedSpotifySession(payload, tokens);
}
