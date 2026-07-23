import { NextResponse } from "next/server";
import {
  encryptSpotifyTokens,
  exchangeSpotifyCode,
  getSpotifyRedirectUri,
  sanitizeReturnPath,
  spotifyReturnCookie,
  spotifySessionCookie,
  spotifyStateCookie
} from "@/lib/music/spotify";

function readCookie(req: Request, name: string) {
  return req.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function redirectWithStatus(req: Request, returnTo: string, status: string) {
  const url = new URL(sanitizeReturnPath(returnTo), new URL(req.url).origin);
  url.searchParams.set("music", status);
  const response = NextResponse.redirect(url);
  response.cookies.set(spotifyStateCookie, "", { path: "/", maxAge: 0 });
  response.cookies.set(spotifyReturnCookie, "", { path: "/", maxAge: 0 });
  return response;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const returnTo = sanitizeReturnPath(decodeURIComponent(readCookie(req, spotifyReturnCookie) || "/studio"));
  const cookieState = readCookie(req, spotifyStateCookie);

  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectWithStatus(req, returnTo, "spotify_not_connected");
  }

  try {
    const redirectUri = getSpotifyRedirectUri(req);
    const tokens = await exchangeSpotifyCode(code, redirectUri);
    const response = redirectWithStatus(req, returnTo, "spotify_connected");
    response.cookies.set(spotifySessionCookie, encryptSpotifyTokens(tokens), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/"
    });
    return response;
  } catch {
    return redirectWithStatus(req, returnTo, "spotify_not_connected");
  }
}
