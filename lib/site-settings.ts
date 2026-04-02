import { createClient } from "@/lib/supabase/server";

type AppSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type SiteSettings = {
  aiDailyLimit: number;
  aiHourlyLimit: number;
  examWeeklyLimit: number;
  researchModeLocked: boolean;
  maintenanceMessage: string;
};

export const defaultSiteSettings: SiteSettings = {
  aiDailyLimit: 20,
  aiHourlyLimit: 8,
  examWeeklyLimit: 3,
  researchModeLocked: true,
  maintenanceMessage: ""
};

export function mapSiteSettings(row?: {
  ai_daily_limit?: number | null;
  ai_hourly_limit?: number | null;
  exam_weekly_limit?: number | null;
  research_mode_locked?: boolean | null;
  maintenance_message?: string | null;
} | null): SiteSettings {
  return {
    aiDailyLimit: Math.max(1, row?.ai_daily_limit ?? defaultSiteSettings.aiDailyLimit),
    aiHourlyLimit: Math.max(0, row?.ai_hourly_limit ?? defaultSiteSettings.aiHourlyLimit),
    examWeeklyLimit: Math.max(1, row?.exam_weekly_limit ?? defaultSiteSettings.examWeeklyLimit),
    researchModeLocked: row?.research_mode_locked ?? defaultSiteSettings.researchModeLocked,
    maintenanceMessage: row?.maintenance_message ?? defaultSiteSettings.maintenanceMessage
  };
}

export async function getSiteSettings(existingClient?: AppSupabaseClient): Promise<SiteSettings> {
  const supabase = existingClient ?? (await createClient());

  try {
    const { data } = await supabase.from("study_site_settings").select("*").eq("id", true).maybeSingle();
    return mapSiteSettings(data);
  } catch {
    return defaultSiteSettings;
  }
}
