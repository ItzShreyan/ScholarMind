import { NextResponse } from "next/server";
import { generateWithFallback } from "@/lib/ai/fallback";
import { normalizeErrorMessage } from "@/lib/ai/util";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await generateWithFallback({
      action: "study_plan",
      prompt: body.prompt || "Create a 7-day study plan from these notes.",
      context: body.context,
      sessionId: body.sessionId
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: normalizeErrorMessage(error) }, { status: 400 });
  }
}
