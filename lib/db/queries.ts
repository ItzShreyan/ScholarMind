import { createClient } from "@/lib/supabase/server";
import { defaultUserPreferences, type UserPreferences } from "@/lib/preferences/defaults";

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

export async function getUserPreferences(userId?: string, existingClient?: AppSupabaseClient): Promise<UserPreferences> {
  const supabase = existingClient ?? (await createClient());
  const resolvedUserId = await resolveUserId(supabase, userId);
  if (!resolvedUserId) return defaultUserPreferences;

  const { data } = await supabase
    .from("study_user_preferences")
    .select("*")
    .eq("user_id", resolvedUserId)
    .maybeSingle();

  return {
    theme: data?.theme === "light" ? "light" : "dark",
    playfulMotion: data?.playful_motion ?? defaultUserPreferences.playfulMotion,
    rememberLastStudio: data?.remember_last_studio ?? defaultUserPreferences.rememberLastStudio,
    lastStudioId: data?.last_studio_id ?? defaultUserPreferences.lastStudioId,
    defaultTool: data?.default_tool ?? defaultUserPreferences.defaultTool
  };
}

export async function getRevisionPlans(userId?: string, existingClient?: AppSupabaseClient) {
  const supabase = existingClient ?? (await createClient());
  const resolvedUserId = await resolveUserId(supabase, userId);
  if (!resolvedUserId) return [];

  const { data } = await supabase
    .from("study_revision_plans")
    .select("*")
    .eq("user_id", resolvedUserId)
    .order("updated_at", { ascending: false });

  return data ?? [];
}
