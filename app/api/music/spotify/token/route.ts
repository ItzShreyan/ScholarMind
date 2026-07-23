import { NextResponse } from "next/server";
import {
  attachRefreshedSpotifySession,
  getSpotifyClientCredentials,
  getSpotifySessionFromRequest
} from "@/lib/music/spotify";

export async function GET(req: Request) {
  const credentials = getSpotifyClientCredentials();
  if (!credentials) {
    return NextResponse.json({ error: "Spotify is not configured." }, { status: 503 });
  }

  const tokens = await getSpotifySessionFromRequest(req);
  if (!tokens?.accessToken) {
    return NextResponse.json({ error: "Spotify is not connected." }, { status: 401 });
  }

  const response = NextResponse.json({
    accessToken: tokens.accessToken,
    expiresAt: tokens.expiresAt,
    clientId: credentials.clientId
  });
  return attachRefreshedSpotifySession(response, tokens);
}
