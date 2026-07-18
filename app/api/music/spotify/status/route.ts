import { NextResponse } from "next/server";
import { attachRefreshedSpotifySession, getValidSpotifyTokens, spotifySessionCookie } from "@/lib/music/spotify";

export async function GET(req: Request) {
  const cookieValue = req.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${spotifySessionCookie}=`))
    ?.split("=")
    .slice(1)
    .join("=");

  const tokens = await getValidSpotifyTokens(cookieValue);
  const payload = NextResponse.json({
    connected: Boolean(tokens?.accessToken),
    scope: tokens?.scope ?? null
  });
  return attachRefreshedSpotifySession(payload, tokens);
}
