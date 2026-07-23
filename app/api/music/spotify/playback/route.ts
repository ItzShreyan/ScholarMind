import { NextResponse } from "next/server";
import { z } from "zod";
import { attachRefreshedSpotifySession, spotifyApiFetch } from "@/lib/music/spotify";

const schema = z.object({
  action: z.enum(["play", "pause", "resume", "next", "previous", "transfer", "repeat", "shuffle"]),
  uri: z.string().optional(),
  contextUri: z.string().optional(),
  deviceId: z.string().optional(),
  positionMs: z.number().int().nonnegative().optional(),
  offsetPosition: z.number().int().nonnegative().optional(),
  /** repeat: "track" | "context" | "off" */
  repeatState: z.enum(["track", "context", "off"]).optional(),
  /** shuffle: true | false */
  shuffleState: z.boolean().optional()
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const deviceQuery = body.deviceId ? `?device_id=${encodeURIComponent(body.deviceId)}` : "";

    let path = "";
    let init: RequestInit = { method: "PUT" };

    switch (body.action) {
      case "play":
        path = `/me/player/play${deviceQuery}`;
        init = {
          method: "PUT",
          body: JSON.stringify(
            body.contextUri
              ? {
                  context_uri: body.contextUri,
                  offset:
                    typeof body.offsetPosition === "number" ? { position: body.offsetPosition } : undefined
                }
              : {
                  uris: body.uri ? [body.uri] : undefined,
                  position_ms: body.positionMs
                }
          )
        };
        break;
      case "pause":
        path = `/me/player/pause${deviceQuery}`;
        break;
      case "resume":
        path = `/me/player/play${deviceQuery}`;
        init = { method: "PUT", body: JSON.stringify({}) };
        break;
      case "next":
        path = `/me/player/next${deviceQuery}`;
        init = { method: "POST" };
        break;
      case "previous":
        path = `/me/player/previous${deviceQuery}`;
        init = { method: "POST" };
        break;
      case "transfer":
        if (!body.deviceId) {
          return NextResponse.json({ error: "Missing Spotify device id." }, { status: 400 });
        }
        path = "/me/player";
        init = {
          method: "PUT",
          body: JSON.stringify({
            device_ids: [body.deviceId],
            play: false
          })
        };
        break;
      case "repeat": {
        const state = body.repeatState ?? "off";
        path = `/me/player/repeat?state=${encodeURIComponent(state)}${body.deviceId ? `&device_id=${encodeURIComponent(body.deviceId)}` : ""}`;
        init = { method: "PUT" };
        break;
      }
      case "shuffle": {
        const shuffleOn = body.shuffleState ?? false;
        path = `/me/player/shuffle?state=${shuffleOn}${body.deviceId ? `&device_id=${encodeURIComponent(body.deviceId)}` : ""}`;
        init = { method: "PUT" };
        break;
      }
    }

    const { tokens, response } = await spotifyApiFetch(req, path, init);

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
              ? "Spotify Premium is required for in-browser playback on this device."
              : response.status === 404
                ? "No active Spotify device found yet. Wait a moment and try again."
              : details || "Spotify playback request failed."
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
      { error: (error as Error).message || "Invalid playback request." },
      { status: 400 }
    );
  }
}
