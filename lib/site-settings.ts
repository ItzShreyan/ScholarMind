import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import {
  defaultChatDailyLimit,
  defaultExamGeneratorWeeklyLimit,
  defaultExamPracticeWeeklyLimit,
  defaultFreePreviewDailyLimit,
  defaultFreePreviewHourlyLimit,
  defaultToolDailyLimit
} from "@/lib/ai/preview";

type AppSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type SiteSettings = {
  aiDailyLimit: number;
  aiHourlyLimit: number;
  chatDailyLimit: number;
  toolDailyLimit: number;
  examWeeklyLimit: number;
  examPracticeWeeklyLimit: number;
  researchModeLocked: boolean;
  maintenanceMessage: string;
};

export const defaultSiteSettings: SiteSettings = {
  aiDailyLimit: defaultFreePreviewDailyLimit,
  aiHourlyLimit: defaultFreePreviewHourlyLimit,
  chatDailyLimit: defaultChatDailyLimit,
  toolDailyLimit: defaultToolDailyLimit,
  examWeeklyLimit: defaultExamGeneratorWeeklyLimit,
  examPracticeWeeklyLimit: defaultExamPracticeWeeklyLimit,
  researchModeLocked: true,
  maintenanceMessage: ""
};

export function mapSiteSettings(row?: {
  ai_daily_limit?: number | null;
  ai_hourly_limit?: number | null;
  chat_daily_limit?: number | null;
  tool_daily_limit?: number | null;
  exam_weekly_limit?: number | null;
  exam_practice_weekly_limit?: number | null;
  research_mode_locked?: boolean | null;
  maintenance_message?: string | null;
} | null): SiteSettings {
  return {
    aiDailyLimit: Math.max(1, row?.ai_daily_limit ?? defaultSiteSettings.aiDailyLimit),
    aiHourlyLimit: Math.max(0, row?.ai_hourly_limit ?? defaultSiteSettings.aiHourlyLimit),
    chatDailyLimit: Math.max(1, row?.chat_daily_limit ?? defaultSiteSettings.chatDailyLimit),
    toolDailyLimit: Math.max(1, row?.tool_daily_limit ?? defaultSiteSettings.toolDailyLimit),
    examWeeklyLimit: Math.max(1, row?.exam_weekly_limit ?? defaultSiteSettings.examWeeklyLimit),
    examPracticeWeeklyLimit: Math.max(
      1,
      row?.exam_practice_weekly_limit ?? defaultSiteSettings.examPracticeWeeklyLimit
    ),
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

export const getCachedSiteSettings = unstable_cache(
  async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return defaultSiteSettings;

    try {
      const supabase = createSupabaseClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data } = await supabase.from("study_site_settings").select("*").eq("id", true).maybeSingle();
      return mapSiteSettings(data);
    } catch {
      return defaultSiteSettings;
    }
  },
  ["scholarmind-site-settings"],
  { revalidate: 60 }
);
