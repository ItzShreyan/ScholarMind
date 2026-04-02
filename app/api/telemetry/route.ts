import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  eventType: z.enum(["page_view", "feature_use", "source_search", "source_import"]),
  page: z.string().max(220).optional(),
  feature: z.string().max(120).optional(),
  visitorKey: z.string().max(120).optional(),
  metadata: z.record(z.any()).optional()
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    await supabase.from("study_site_events").insert({
      visitor_key: body.visitorKey || user?.id || "anonymous",
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      event_type: body.eventType,
      page: body.page ?? null,
      feature: body.feature ?? null,
      metadata: body.metadata ?? {}
    });
  } catch {
    // Telemetry should never block the user flow.
  }

  return NextResponse.json({ ok: true });
}
