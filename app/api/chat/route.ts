import { NextResponse } from "next/server";
import { normalizeAIText, normalizeErrorMessage } from "@/lib/ai/util";

type ProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function normalizeHistory(history: unknown): ProviderMessage[] {
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
    "When useful, use clean headings, tables, formulas, or simple ASCII/markdown diagrams. Keep maths readable with LaTeX-style notation such as $F = ma$.",
    "You can suggest tools like AI Notes, Quiz, Flashcards, or Exam Generator when they help, but do not claim to run a tool unless the frontend has asked you to.",
    context ? `Uploaded source context:\n${context}` : "",
    screenContext ? `Current screen context:\n${screenContext}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(req: Request) {
  try {
    const { input } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENROUTER_API_KEY. Add it to .env.local, then restart npm run dev." },
        { status: 400 }
      );
    }

    const message = normalizeAIText(input?.message || input?.prompt || "");
    if (!message) {
      return NextResponse.json({ error: "No chat message was provided." }, { status: 400 });
    }

    const context = normalizeAIText(input?.context || "");
    const screenContext = normalizeAIText(input?.screenContext || "");
    const messages: ProviderMessage[] = [
      { role: "system", content: buildSystemPrompt(context, screenContext) },
      ...normalizeHistory(input?.history || input?.messages),
      { role: "user", content: message }
    ];

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
        model: process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free",
        messages,
        temperature: 0.35,
        max_tokens: 1200,
        stream: true
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok || !response.body) {
      const detail = normalizeErrorMessage(await response.text(), `OpenRouter failed with status ${response.status}.`);
      return NextResponse.json({ error: detail }, { status: response.status || 400 });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: normalizeErrorMessage(error, "Unable to contact the AI tutor.") },
      { status: 400 }
    );
  }
}
