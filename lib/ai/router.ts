import { AIRequest } from "@/types";

export function normalizeAIRequest(input: AIRequest): AIRequest {
  const message = input.message || input.prompt || input.content || "";
  const mode = input.mode || input.action;

  return {
    ...input,
    message,
    mode
  };
}

export function selectProvider(input: AIRequest): string {
  const norm = normalizeAIRequest(input);

  // Explicit per-mode routing
  if (norm.mode === "flashcards" || norm.action === "flashcards") {
    return "groq_v2";
  }

  if (norm.mode === "quiz" || norm.action === "quiz") {
    return "groq_v2";
  }

  if (norm.mode === "exam" || norm.action === "exam") {
    return "openrouter_v2";
  }

  if (norm.mode === "study_plan" || norm.action === "study_plan" || norm.action === "insights") {
    return "groq_v2";
  }

  if (norm.mode === "chat" || norm.action === "chat") {
    return "openrouter_v2";
  }

  // fallback default
  return "groq_v2";
}
