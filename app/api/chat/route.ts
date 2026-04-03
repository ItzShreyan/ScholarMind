import { NextResponse } from "next/server";
import { generateWithFallback } from "@/lib/ai/fallback";
import { normalizeAIText, normalizeErrorMessage } from "@/lib/ai/util";

function normalizeHistory(history: unknown) {
  if (!Array.isArray(history)) return [];

  return history
    .map((item) => {
      const record = item as { role?: string; content?: unknown };
      const content = normalizeAIText(record?.content);
      if (!content) return null;

      return {
        role: record?.role === "assistant" || record?.role === "ai" ? "assistant" : "user",
        content
      };
    })
    .filter((item): item is { role: "user" | "assistant"; content: string } => Boolean(item));
}

function makeSseResponse(text: string) {
  const encoder = new TextEncoder();
  const payload = JSON.stringify({
    choices: [{ delta: { content: text } }]
  });
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    }
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache"
    }
  });
}

export async function POST(req: Request) {
  try {
    const { input } = await req.json();
    const content = normalizeAIText(input.message || input.prompt || "");
    const baseHistory = input.history?.length
      ? normalizeHistory(input.history)
      : Array.isArray(input.messages)
        ? normalizeHistory(input.messages)
        : [];
    const messages = content
      ? [...baseHistory, { role: "user" as const, content }]
      : baseHistory;

    const result = await generateWithFallback({
      action: "chat",
      prompt: content,
      message: content,
      history: messages,
      context: normalizeAIText(input.context || ""),
      mode: "chat",
      sessionId: input.sessionId
    });

    const safeText = normalizeAIText(result.text);
    if (!safeText || safeText === "[object Object]") {
      throw new Error("The AI reply came back in an unreadable format. Please try again.");
    }

    return makeSseResponse(safeText);
  } catch (error) {
    const message = normalizeErrorMessage(error, "Unexpected error");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
