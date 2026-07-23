import { NextResponse } from "next/server";
import { spotifySessionCookie } from "@/lib/music/spotify";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  
  // Clear the Spotify session cookie
  response.cookies.set(spotifySessionCookie, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });

  return response;
}
