import { NextResponse } from "next/server";
import { normalizeAIText, normalizeErrorMessage } from "@/lib/ai/util";
import { getOpenRouterKeys, isOpenRouterKeyLimitError } from "@/lib/ai/openrouter-keys";
import {
  formatChatLimitMessage,
  releaseChatUsage,
  reserveChatUsage
} from "@/lib/ai/limits";
import { getSiteSettings } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { loadVisionAttachments } from "@/lib/ai/image-attachments";
import {
  buildOpenRouterContent,
  getOpenRouterModel,
  type OpenRouterContent
} from "@/lib/ai/providers/openrouter-content";

type ProviderMessage = {
  role: "system" | "user" | "assistant";
  content: OpenRouterContent;
};

function normalizeHistory(history: unknown): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-8)
    .flatMap((item) => {
      const record = item as { role?: string; content?: unknown };
      const content = normalizeAIText(record?.content);
      if (!content) return [];

      return [{
        role: record?.role === "assistant" || record?.role === "ai" ? "assistant" : "user",
        content
      } satisfies ProviderMessage];
    });
}

function buildSystemPrompt(context: string, screenContext: string) {
  return [
    "You are ScholarMind Tutor, a screen-aware AI tutor for students.",
    "Respond like a normal helpful chat message, not JSON. Never return objects or tool wrappers.",
    "If the user says hi, hey, asks how you are, or makes casual conversation, reply warmly in 1-2 short sentences.",
    "For study questions, answer directly first, then teach step by step. Keep responses concise unless the student asks for depth.",
    "If the student is answering a quiz, exam question, practice question, or asks you to help with a specific question, do not immediately reveal the final answer. Give hints, ask one guiding question, show the method, and only reveal the final answer after they explicitly ask for it or after they have attempted it.",
    "If the student asks to be quizzed inside chat, create exactly one mini question with no answer shown yet, then wait for their attempt.",
    "Use the uploaded/source-enabled material as the main evidence base. If a source does not contain enough information, say what is missing instead of guessing.",
    "When useful, use clean headings, tables, formulas, or simple ASCII/markdown diagrams. Wrap maths in $...$ for inline or $$...$$ for block equations (e.g. $W = Fd\\cos\\theta$, $$P = \\frac{W}{t}$$).",
    "You can suggest tools like AI Notes, Quiz, Flashcards, or Exam Generator when they help, but do not claim to run a tool unless the frontend has asked you to.",
    "When the student asks to open a file, website, quiz, chat, or workspace tab, the frontend may handle navigation automatically. Acknowledge what they asked to open.",
    context ? `Uploaded source context:\n${context}` : "",
    screenContext ? `Current screen context:\n${screenContext}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
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
      "Cache-Control": "no-cache, no-store, must-revalidate"
    }
  });
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to use the AI tutor." }, { status: 401 });
    }

    const { input } = await req.json();
    const apiKeys = getOpenRouterKeys();
    const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());

    if (!apiKeys.length && !geminiConfigured) {
      return NextResponse.json(
        { error: "Missing an AI provider key. Add GEMINI_API_KEY or OPENROUTER_API_KEY in .env.local, then restart npm run dev." },
        { status: 400 }
      );
    }

    const message = normalizeAIText(input?.message || input?.prompt || "");
    if (!message) {
      return NextResponse.json({ error: "No chat message was provided." }, { status: 400 });
    }

    const siteSettings = await getSiteSettings(supabase);
    const actorKey = user.id;
    const chatReservation = await reserveChatUsage({
      supabase,
      actorKey,
      userId: user.id,
      dailyLimit: siteSettings.chatDailyLimit
    });

    if (!chatReservation.allowed) {
      return NextResponse.json({ error: formatChatLimitMessage(siteSettings.chatDailyLimit) }, { status: 429 });
    }

    const context = normalizeAIText(input?.context || "");
    const screenContext = normalizeAIText(input?.screenContext || "");
    const vision = await loadVisionAttachments(user.id, input?.sessionId);

    const messages: ProviderMessage[] = [
      { role: "system", content: buildSystemPrompt(context, screenContext) },
      ...normalizeHistory(input?.history || input?.messages),
      { role: "user", content: buildOpenRouterContent(message, vision.attachments) }
    ];

    let data: { choices?: Array<{ message?: { content?: unknown; reasoning?: unknown } }> } | null = null;
    const failures: string[] = [];
    const model = getOpenRouterModel(vision.attachments, "chat");

    if (vision.attachments.length) {
      console.info("openrouter_vision_chat_request", {
        userId: user.id,
        sessionId: input?.sessionId,
        imageCount: vision.attachments.length,
        model
      });
    }

    for (const [index, apiKey] of apiKeys.entries()) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "ScholarMind"
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.35,
          max_tokens: 1200,
          reasoning: { exclude: true },
          include_reasoning: false,
          stream: false
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const detail = normalizeErrorMessage(await response.text(), `OpenRouter failed with status ${response.status}.`);
        failures.push(`key ${index + 1}: ${detail}`);
        if (index < apiKeys.length - 1 && isOpenRouterKeyLimitError(response.status, detail)) {
          continue;
        }
        return NextResponse.json({ error: detail }, { status: response.status || 400 });
      }

      data = await response.json();
      break;
    }

    // Gemini remains a fallback for both visual and text chat if every
    // OpenRouter key is unavailable, rate-limited, or rejects the request.
    if (!data && geminiConfigured) {
      try {
        const result = await geminiProvider.generate({
          action: "chat",
          prompt: message,
          context: [context, screenContext].filter(Boolean).join("\n\n"),
          history: normalizeHistory(input?.history || input?.messages),
          sessionId: typeof input?.sessionId === "string" ? input.sessionId : undefined,
          imageAttachments: vision.attachments
        });
        if (result.text.trim()) {
          console.info("chat_gemini_fallback_succeeded", {
            userId: user.id,
            sessionId: input?.sessionId,
            imageCount: vision.attachments.length
          });
          return makeSseResponse(result.text);
        }
        failures.push("gemini: empty response");
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown Gemini error";
        console.error("chat_gemini_fallback_failed", {
          userId: user.id,
          sessionId: input?.sessionId,
          imageCount: vision.attachments.length,
          message: detail
        });
        failures.push(`gemini: ${detail}`);
      }
    }

    if (!data) {
      await releaseChatUsage({
        supabase,
        actorKey,
        userId: user.id,
        token: chatReservation.token,
        persisted: chatReservation.persisted
      });
      return NextResponse.json({ error: `All OpenRouter keys failed. ${failures.join(" | ")}` }, { status: 400 });
    }

    const text = normalizeAIText(data.choices?.[0]?.message?.content);
    if (!text) {
      await releaseChatUsage({
        supabase,
        actorKey,
        userId: user.id,
        token: chatReservation.token,
        persisted: chatReservation.persisted
      });
      return NextResponse.json({ error: "OpenRouter returned an empty chat message." }, { status: 400 });
    }

    return makeSseResponse(text);
  } catch (error) {
    return NextResponse.json(
      { error: normalizeErrorMessage(error, "Unable to contact the AI tutor.") },
      { status: 400 }
    );
  }
}
