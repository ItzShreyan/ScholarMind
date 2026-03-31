import { NextResponse } from "next/server";
import { generateWithFallback } from "@/lib/ai/fallback";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await generateWithFallback({
      action: "chat",
      prompt: body.prompt,
      context: body.context,
      sessionId: body.sessionId
    });

    const encoder = new TextEncoder();
    const chunks = result.text.match(/.{1,180}/g) || [result.text];

    const stream = new ReadableStream({
      start(controller) {
        chunks.forEach((part, index) => {
          setTimeout(() => controller.enqueue(encoder.encode(part)), index * 25);
        });
        setTimeout(() => controller.close(), chunks.length * 25 + 10);
      }
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache"
      }
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
