import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site-url";
import {
  getSpotifyRedirectUri,
  sanitizeReturnPath,
  spotifyReturnCookie,
  spotifyStateCookie
} from "@/lib/music/spotify";

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const returnTo = sanitizeReturnPath(requestUrl.searchParams.get("returnTo"));

  if (!clientId?.trim()) {
    const fallback = new URL(returnTo, requestUrl.origin);
    fallback.searchParams.set("music", "spotify_setup_required");
    return NextResponse.redirect(fallback);
  }

  const redirectUri = getSpotifyRedirectUri(req);
  const state = crypto.randomUUID();
  const scopes = [
    "user-read-email",
    "user-read-private",
    "user-read-playback-state",
    "user-modify-playback-state",
    "playlist-read-private",
    "playlist-read-collaborative",
    "streaming"
  ];
  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.set("client_id", clientId.trim());
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("show_dialog", "true");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(spotifyStateCookie, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/"
  });
  response.cookies.set(spotifyReturnCookie, returnTo, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/"
  });
  void getSiteUrl();
  return response;
}
