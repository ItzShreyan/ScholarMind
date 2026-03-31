import { NextResponse } from "next/server";
import { z } from "zod";
import { generateWithFallback } from "@/lib/ai/fallback";

const schema = z.object({
  action: z.enum([
    "summary",
    "flashcards",
    "quiz",
    "chat",
    "concepts",
    "eli10",
    "hard_mode",
    "study_plan",
    "insights"
  ]),
  prompt: z.string().min(2),
  context: z.string().optional(),
  sessionId: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value : undefined),
    z.string().optional()
  )
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const result = await generateWithFallback(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Generation failed" },
      { status: 400 }
    );
  }
}
