import { NextResponse } from "next/server";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { getSiteUrl } from "@/lib/site-url";

export type SpotifyTokenBundle = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope?: string;
};

export const spotifyReturnCookie = "scholarmind_spotify_return";
export const spotifyStateCookie = "scholarmind_spotify_state";
export const spotifySessionCookie = "scholarmind_spotify_session";

function getEncryptionKey() {
  const raw = process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  return createHash("sha256").update(raw).digest();
}

export function getSpotifyRedirectUri(req?: Request) {
  const configured = process.env.SPOTIFY_REDIRECT_URI?.trim();
  if (configured) {
    return configured.startsWith("http") ? configured : `https://${configured}`;
  }

  if (req) {
    return `${new URL(req.url).origin}/api/music/spotify/callback`;
  }

  return `${getSiteUrl()}/api/music/spotify/callback`;
}

export function getSpotifyClientCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!clientId?.trim() || !clientSecret) return null;
  return { clientId: clientId.trim(), clientSecret };
}

export function encryptSpotifyTokens(tokens: SpotifyTokenBundle) {
  const key = getEncryptionKey();
  if (!key) {
    return Buffer.from(JSON.stringify(tokens)).toString("base64url");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(tokens), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptSpotifyTokens(payload: string | undefined | null): SpotifyTokenBundle | null {
  if (!payload) return null;

  try {
    const key = getEncryptionKey();
    if (!key) {
      return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SpotifyTokenBundle;
    }

    const buffer = Buffer.from(payload, "base64url");
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    return JSON.parse(decrypted) as SpotifyTokenBundle;
  } catch {
    return null;
  }
}

export async function exchangeSpotifyCode(code: string, redirectUri: string) {
  const credentials = getSpotifyClientCredentials();
  if (!credentials) {
    throw new Error("Spotify is not configured on this deployment.");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")}`
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    throw new Error(`Spotify token exchange failed (${response.status}).`);
  }

  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!json.access_token) {
    throw new Error("Spotify did not return an access token.");
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || "",
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    scope: json.scope
  } satisfies SpotifyTokenBundle;
}

export async function refreshSpotifyTokens(refreshToken: string) {
  const credentials = getSpotifyClientCredentials();
  if (!credentials || !refreshToken) {
    throw new Error("Spotify refresh is unavailable.");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")}`
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    throw new Error(`Spotify refresh failed (${response.status}).`);
  }

  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!json.access_token) {
    throw new Error("Spotify refresh did not return an access token.");
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || refreshToken,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    scope: json.scope
  } satisfies SpotifyTokenBundle;
}

export async function getValidSpotifyTokens(cookieValue?: string | null) {
  const current = decryptSpotifyTokens(cookieValue);
  if (!current) return null;

  if (current.expiresAt > Date.now() + 60_000) {
    return current;
  }

  if (!current.refreshToken) return null;

  try {
    return await refreshSpotifyTokens(current.refreshToken);
  } catch {
    return null;
  }
}

export function sanitizeReturnPath(value: string | null | undefined) {
  if (!value?.startsWith("/")) return "/studio";
  if (value.startsWith("//") || value.includes("://")) return "/studio";
  return value;
}

export function readSpotifySessionCookie(req: Request) {
  return req.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${spotifySessionCookie}=`))
    ?.slice(spotifySessionCookie.length + 1);
}

export async function getSpotifySessionFromRequest(req: Request) {
  return getValidSpotifyTokens(readSpotifySessionCookie(req));
}

export async function spotifyApiFetch(
  req: Request,
  path: string,
  init?: RequestInit
): Promise<{ tokens: SpotifyTokenBundle | null; response: Response }> {
  let tokens = await getSpotifySessionFromRequest(req);
  if (!tokens?.accessToken) {
    return {
      tokens: null,
      response: new Response(JSON.stringify({ error: "Spotify is not connected." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    };
  }

  const request = (accessToken: string) =>
    fetch(`https://api.spotify.com/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {})
      }
    });

  let response = await request(tokens.accessToken);

  if (response.status === 401 && tokens.refreshToken) {
    try {
      tokens = await refreshSpotifyTokens(tokens.refreshToken);
      response = await request(tokens.accessToken);
    } catch {
      return {
        tokens,
        response: new Response(JSON.stringify({ error: "Spotify session expired. Reconnect Spotify." }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        })
      };
    }
  }

  return { tokens, response };
}

export function attachRefreshedSpotifySession(response: NextResponse, tokens: SpotifyTokenBundle | null) {
  if (!tokens) return response;
  response.cookies.set(spotifySessionCookie, encryptSpotifyTokens(tokens), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
  });
  return response;
}
