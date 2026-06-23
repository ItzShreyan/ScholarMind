# ScholarMind Music Player Setup

The Studio music player works without provider accounts by using the built-in quiet focus queue. Provider connections are optional and need public/client credentials.

## Environment Variables

Paste keys in `.env.local` for local development and in Netlify site environment variables for production.

```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
NEXT_PUBLIC_YOUTUBE_API_KEY=
NEXT_PUBLIC_SOUNDCLOUD_CLIENT_ID=
```

Restart `npm run dev` after editing `.env.local`.

## Spotify

1. Go to the Spotify Developer Dashboard and create an app.
2. Add redirect URLs for local and production, for example:
   `http://localhost:3000/api/music/spotify/callback`
   `https://YOUR_DOMAIN/api/music/spotify/callback`
3. Paste the Client ID into `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`.
4. Paste the Client Secret into `SPOTIFY_CLIENT_SECRET`.
5. For real in-browser playback, Spotify requires their Web Playback SDK and a Spotify Premium account for the signed-in listener.

Official docs:
- https://developer.spotify.com/documentation/web-api
- https://developer.spotify.com/documentation/web-playback-sdk

## YouTube Music / YouTube

YouTube Music does not expose a separate public web playback API like Spotify. Use YouTube Data API for searching metadata and YouTube IFrame Player API for embedded playback where allowed.

Current launch note: the value you pasted looks like an OAuth client ID, not a YouTube Data API key. Keep YouTube Music marked as limited/unavailable until you create a real API key. If Google asks for billing before issuing the key, leave `NEXT_PUBLIC_YOUTUBE_API_KEY` blank and use the built-in focus queue instead.

1. Open Google Cloud Console and enable YouTube Data API v3.
2. Create an API key.
3. Paste it into `NEXT_PUBLIC_YOUTUBE_API_KEY`.
4. For playback, use the YouTube IFrame Player API with normal YouTube video IDs or playlist IDs.

Official docs:
- https://developers.google.com/youtube/v3/getting-started
- https://developers.google.com/youtube/iframe_api_reference

## SoundCloud

Current launch note: mark SoundCloud account linking as unavailable. You found that the account/app access path requires Artist Pro, so the Studio should not promise SoundCloud login or browsing yet.

If you later get SoundCloud developer access:

1. Register a SoundCloud developer app if app registration is available for your account.
2. Paste the app Client ID into `NEXT_PUBLIC_SOUNDCLOUD_CLIENT_ID`.
3. Use SoundCloud URLs or track IDs for playback/search features supported by the current SoundCloud API access.

Official docs:
- https://developers.soundcloud.com/docs/api/guide

## Notes

- Do not expose provider client secrets to browser code. Only `NEXT_PUBLIC_*` values are visible to the frontend.
- Add the same production keys in Netlify before deploying.
- Keep the built-in focus queue as a fallback if a provider is unavailable, rate-limited, or blocked by account requirements.
