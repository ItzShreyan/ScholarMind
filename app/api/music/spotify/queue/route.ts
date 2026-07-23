import { NextResponse } from "next/server";
import { attachRefreshedSpotifySession, spotifyApiFetch } from "@/lib/music/spotify";

/**
 * GET /api/music/spotify/queue
 * Returns the currently-playing track and the upcoming Spotify queue.
 * Spotify response shape: { currently_playing: TrackObject | null, queue: TrackObject[] }
 */
export async function GET(req: Request) {
  try {
    const { tokens, response } = await spotifyApiFetch(req, "/me/player/queue", {
      method: "GET"
    });

    if (!tokens) {
      return response;
    }

    if (!response.ok) {
      const details = await response.text();
      const payload = NextResponse.json(
        {
          error:
            response.status === 404
              ? "No active Spotify device found. Start playing something first."
              : details || "Unable to fetch the Spotify queue."
        },
        { status: response.status }
      );
      return attachRefreshedSpotifySession(payload, tokens);
    }

    const json = await response.json().catch(() => ({}));
    const payload = NextResponse.json({ ok: true, ...json });
    return attachRefreshedSpotifySession(payload, tokens);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Unable to fetch the Spotify queue." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/music/spotify/queue
 * Body: { uri: string; deviceId?: string }
 * Adds a track (or episode) to the end of the current Spotify queue.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { uri?: string; deviceId?: string };
    const { uri, deviceId } = body;

    if (!uri?.trim()) {
      return NextResponse.json({ error: "Missing track uri." }, { status: 400 });
    }

    const params = new URLSearchParams({ uri: uri.trim() });
    if (deviceId) {
      params.set("device_id", deviceId);
    }

    const { tokens, response } = await spotifyApiFetch(
      req,
      `/me/player/queue?${params.toString()}`,
      { method: "POST" }
    );

    if (!tokens) {
      return response;
    }

    if (response.status === 204) {
      const payload = NextResponse.json({ ok: true });
      return attachRefreshedSpotifySession(payload, tokens);
    }

    if (!response.ok) {
      const details = await response.text();
      const payload = NextResponse.json(
        {
          error:
            response.status === 403
              ? "Spotify Premium is required to add tracks to the queue."
              : response.status === 404
                ? "No active Spotify device found. Start playing something first."
                : details || "Unable to add track to the Spotify queue."
        },
        { status: response.status }
      );
      return attachRefreshedSpotifySession(payload, tokens);
    }

    const json = await response.json().catch(() => ({}));
    const payload = NextResponse.json({ ok: true, ...json });
    return attachRefreshedSpotifySession(payload, tokens);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Unable to add track to the Spotify queue." },
      { status: 500 }
    );
  }
}
