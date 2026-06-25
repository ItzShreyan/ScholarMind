import { NextResponse } from "next/server";

function dashboardRedirect(req: Request, status: string) {
  const url = new URL("/dashboard", new URL(req.url).origin);
  url.searchParams.set("music", status);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("scholarmind_spotify_state="))
    ?.split("=")[1];

  if (!code || !state || !cookieState || state !== cookieState) {
    return dashboardRedirect(req, "spotify_not_connected");
  }

  // Token exchange and playback controls need encrypted account-token storage.
  // For launch preview, this confirms OAuth wiring without storing Spotify tokens.
  return dashboardRedirect(req, "spotify_oauth_ready");
}
