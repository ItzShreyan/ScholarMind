import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET: list all playlists for the user, with track counts
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch playlists
    const { data: playlists, error: playlistsError } = await supabase
      .from("user_playlists")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (playlistsError) throw playlistsError;

    // For each playlist, get tracks with signed URLs
    const result = await Promise.all(
      (playlists || []).map(async (playlist) => {
        const { data: playlistTracks, error: ptError } = await supabase
          .from("user_playlist_tracks")
          .select("position, track_id")
          .eq("playlist_id", playlist.id)
          .order("position", { ascending: true });

        if (ptError) throw ptError;

        const trackIds = (playlistTracks || []).map((pt) => pt.track_id);

        let tracks: Array<Record<string, unknown>> = [];
        if (trackIds.length > 0) {
          const { data: trackData, error: trackError } = await supabase
            .from("user_audio_tracks")
            .select("*")
            .in("id", trackIds)
            .eq("user_id", user.id);

          if (trackError) throw trackError;

          tracks = (trackData || []).map((track) => ({
            ...track,
            playback_url: `/api/music/tracks/${encodeURIComponent(track.id)}/stream`
          }));
        }

        return {
          ...playlist,
          tracks: tracks.sort(
            (a, b) =>
              (playlistTracks || []).findIndex((pt) => pt.track_id === a.id) -
              (playlistTracks || []).findIndex((pt) => pt.track_id === b.id)
          )
        };
      })
    );

    return NextResponse.json({ playlists: result });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load playlists." },
      { status: 500 }
    );
  }
}

// POST: create a new playlist
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description = "", trackIds = [] } = body as {
      name?: string;
      description?: string;
      trackIds?: string[];
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Playlist name is required." }, { status: 400 });
    }

    // Create playlist
    const { data: playlist, error: createError } = await supabase
      .from("user_playlists")
      .insert([
        {
          user_id: user.id,
          name: name.trim(),
          description: description.trim()
        }
      ])
      .select("*")
      .single();

    if (createError) throw createError;

    // Add tracks if provided
    if (trackIds.length > 0) {
      const trackEntries = trackIds.map((trackId: string, index: number) => ({
        playlist_id: playlist.id,
        track_id: trackId,
        position: index
      }));

      const { error: tracksError } = await supabase
        .from("user_playlist_tracks")
        .insert(trackEntries);

      if (tracksError) throw tracksError;
    }

    return NextResponse.json({ playlist }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create playlist." },
      { status: 500 }
    );
  }
}

// PUT: update playlist (rename, reorder tracks, add/remove)
export async function PUT(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Playlist ID required" }, { status: 400 });
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("user_playlists")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, trackIds } = body as {
      name?: string;
      description?: string;
      trackIds?: string[];
    };

    // Update metadata if provided
    if (name !== undefined || description !== undefined) {
      const updates: Record<string, string> = { updated_at: new Date().toISOString() };
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined) updates.description = description.trim();

      const { error: updateError } = await supabase
        .from("user_playlists")
        .update(updates)
        .eq("id", id);

      if (updateError) throw updateError;
    }

    // Replace track list if provided
    if (trackIds !== undefined) {
      // Delete existing tracks
      const { error: deleteError } = await supabase
        .from("user_playlist_tracks")
        .delete()
        .eq("playlist_id", id);

      if (deleteError) throw deleteError;

      // Insert new tracks
      if (trackIds.length > 0) {
        const trackEntries = trackIds.map((trackId: string, index: number) => ({
          playlist_id: id,
          track_id: trackId,
          position: index
        }));

        const { error: insertError } = await supabase
          .from("user_playlist_tracks")
          .insert(trackEntries);

        if (insertError) throw insertError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update playlist." },
      { status: 500 }
    );
  }
}

// DELETE: remove a playlist
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Playlist ID required" }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from("user_playlists")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to delete playlist." },
      { status: 500 }
    );
  }
}
