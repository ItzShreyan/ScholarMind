import { createClient } from "@/lib/supabase/server";

type AppSupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function resolveUserId(supabase: AppSupabaseClient, userId?: string) {
  if (userId) return userId;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function getUserSessions(userId?: string, existingClient?: AppSupabaseClient) {
  const supabase = existingClient ?? (await createClient());
  const resolvedUserId = await resolveUserId(supabase, userId);
  if (!resolvedUserId) return [];

  const { data } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", resolvedUserId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getSessionFiles(
  sessionId: string,
  userId?: string,
  existingClient?: AppSupabaseClient
) {
  const supabase = existingClient ?? (await createClient());
  const resolvedUserId = await resolveUserId(supabase, userId);
  if (!resolvedUserId) return [];

  const { data } = await supabase
    .from("study_files")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", resolvedUserId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
