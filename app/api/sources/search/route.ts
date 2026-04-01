import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { searchWebSources } from "@/lib/sources/web";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  query: z.string().min(2).max(120),
  engine: z.enum(["scholar", "google", "duckduckgo"]).default("scholar")
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());
    const results = await searchWebSources(body.query, body.engine);
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      {
        error: (error as Error).message || "Unable to search the web right now."
      },
      { status: 400 }
    );
  }
}
