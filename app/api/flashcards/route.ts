import { NextResponse } from "next/server";
import { generateWithFallback } from "@/lib/ai/fallback";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await generateWithFallback({
      action: "flashcards",
      prompt: body.prompt || "Create flashcards from this content.",
      context: body.context,
      sessionId: body.sessionId
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
