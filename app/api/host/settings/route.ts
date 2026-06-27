import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isHostOwner } from "@/lib/host";
import { mapSiteSettings } from "@/lib/site-settings";

const schema = z.object({
  aiDailyLimit: z.number().int().min(1).max(200),
  aiHourlyLimit: z.number().int().min(0).max(100),
  chatDailyLimit: z.number().int().min(1).max(200),
  toolDailyLimit: z.number().int().min(1).max(200),
  examWeeklyLimit: z.number().int().min(1).max(20),
  examPracticeWeeklyLimit: z.number().int().min(1).max(20),
  researchModeLocked: z.boolean(),
  maintenanceMessage: z.string().max(280)
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!isHostOwner(user?.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = schema.parse(await req.json());

    const { data, error } = await supabase
      .from("study_site_settings")
      .upsert(
        {
          id: true,
          ai_daily_limit: body.aiDailyLimit,
          ai_hourly_limit: body.aiHourlyLimit,
          chat_daily_limit: body.chatDailyLimit,
          tool_daily_limit: body.toolDailyLimit,
          exam_weekly_limit: body.examWeeklyLimit,
          exam_practice_weekly_limit: body.examPracticeWeeklyLimit,
          research_mode_locked: body.researchModeLocked,
          maintenance_message: body.maintenanceMessage
        },
        { onConflict: "id" }
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ settings: mapSiteSettings(data) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Unable to save settings." }, { status: 400 });
  }
}
