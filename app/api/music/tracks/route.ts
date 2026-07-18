import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ids = searchParams.get("ids");

    let query = supabase
      .from("user_audio_tracks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ids) {
      const idList = ids.split(",").filter(Boolean);
      if (idList.length > 0) {
        query = query.in("id", idList);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    // Attach signed URLs for playback
    const tracks = await Promise.all(
      (data || []).map(async (track) => {
        const { data: signedUrlData } = await supabase.storage
          .from("user-audio")
          .createSignedUrl(track.storage_path, 60 * 60 * 24 * 7);
        return {
          ...track,
          playback_url: signedUrlData?.signedUrl || ""
        };
      })
    );

    return NextResponse.json({ tracks });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load tracks." },
      { status: 500 }
    );
  }
}

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
      return NextResponse.json({ error: "Track ID required" }, { status: 400 });
    }

    // Fetch track to get storage path
    const { data: track, error: fetchError } = await supabase
      .from("user_audio_tracks")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    // Delete from storage
    await supabase.storage.from("user-audio").remove([track.storage_path]);

    // Delete from DB (cascade removes playlist_tracks entries)
    const { error: deleteError } = await supabase
      .from("user_audio_tracks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to delete track." },
      { status: 500 }
    );
  }
}
