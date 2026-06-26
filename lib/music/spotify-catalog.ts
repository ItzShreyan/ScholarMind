export type SpotifyTrackItem = {
  id: string;
  name: string;
  uri: string;
  artist: string;
  album: string;
  imageUrl: string | null;
  durationMs: number;
};

export type SpotifyPlaylistItem = {
  id: string;
  name: string;
  uri: string;
  description: string;
  owner: string;
  imageUrl: string | null;
  trackCount: number;
};

type SpotifyApiTrack = {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  artists: Array<{ name: string }>;
  album: { name: string; images?: Array<{ url: string }> };
};

type SpotifyApiPlaylist = {
  id: string;
  name: string;
  uri: string;
  description?: string | null;
  owner?: { display_name?: string | null };
  images?: Array<{ url: string }>;
  tracks?: { total?: number };
};

export function mapSpotifyTrack(track: SpotifyApiTrack | null | undefined): SpotifyTrackItem | null {
  if (!track?.id || !track.uri) return null;

  return {
    id: track.id,
    name: track.name,
    uri: track.uri,
    artist: track.artists.map((artist) => artist.name).join(", "),
    album: track.album.name,
    imageUrl: track.album.images?.[0]?.url ?? null,
    durationMs: track.duration_ms
  };
}

export function mapSpotifyPlaylist(playlist: SpotifyApiPlaylist): SpotifyPlaylistItem {
  return {
    id: playlist.id,
    name: playlist.name,
    uri: playlist.uri,
    description: (playlist.description || "").replace(/<[^>]+>/g, "").trim(),
    owner: playlist.owner?.display_name || "Spotify",
    imageUrl: playlist.images?.[0]?.url ?? null,
    trackCount: playlist.tracks?.total ?? 0
  };
}

export function formatTrackDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
