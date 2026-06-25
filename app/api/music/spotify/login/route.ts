import { NextResponse } from "next/server";

function getSiteUrl(req: Request) {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.VERCEL_URL;

  if (configured) {
    return configured.startsWith("http") ? configured : `https://${configured}`;
  }

  return new URL(req.url).origin;
}

export async function GET(req: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;

  if (!clientId?.trim()) {
    const fallback = new URL("/dashboard", getSiteUrl(req));
    fallback.searchParams.set("music", "spotify_setup_required");
    return NextResponse.redirect(fallback);
  }

  const redirectUri = `${getSiteUrl(req)}/api/music/spotify/callback`;
  const state = crypto.randomUUID();
  const scopes = [
    "user-read-email",
    "user-read-private",
    "user-read-playback-state",
    "user-modify-playback-state",
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
  response.cookies.set("scholarmind_spotify_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/"
  });
  return response;
}
