import { AIRequest } from "@/types";
import { hasOpenRouterKey } from "@/lib/ai/openrouter-keys";

function hasKey(value?: string | null) {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeAIRequest(input: AIRequest): AIRequest {
  const message = input.message || input.prompt || input.content || "";
  const mode = input.mode || input.action;

  return {
    ...input,
    message,
    mode
  };
}

export function selectProvider(_input: AIRequest): string {
  // OpenRouter is the primary provider. Its vision route receives source
  // images as private base64 data URLs and falls back to Gemini when needed.
  if (_input.imageAttachments?.length && hasOpenRouterKey()) {
    return "openrouter_v2";
  }
  if (_input.imageAttachments?.length && hasKey(process.env.GEMINI_API_KEY)) {
    return "gemini";
  }

  const openRouterFirstActions = new Set(["summary", "flashcards", "quiz", "notes", "exam", "chat", "concepts", "hard_mode", "study_plan", "insights"]);
  if (openRouterFirstActions.has(String(_input.action || _input.mode || "")) && hasOpenRouterKey()) {
    return "openrouter_v2";
  }

  const preferred = (process.env.AI_PRIMARY_PROVIDER || "").toLowerCase();
  const providers = ["openrouter_v2", "groq_v2", "groq", "gemini", "huggingface", "together", "local"];

  if (preferred && providers.includes(preferred)) {
    if (preferred.startsWith("openrouter") && hasOpenRouterKey()) return preferred;
    if (preferred.startsWith("groq") && hasKey(process.env.GROQ_API_KEY)) return preferred;
    if (preferred === "gemini" && hasKey(process.env.GEMINI_API_KEY)) return preferred;
    if (preferred === "huggingface" && hasKey(process.env.HUGGINGFACE_API_KEY)) return preferred;
    if (preferred === "together" && hasKey(process.env.TOGETHER_API_KEY)) return preferred;
    if (preferred === "local") return preferred;
  }

  if (hasKey(process.env.GROQ_API_KEY)) return "groq_v2";
  if (hasKey(process.env.GEMINI_API_KEY)) return "gemini";
  if (hasOpenRouterKey()) return "openrouter_v2";
  if (hasKey(process.env.TOGETHER_API_KEY)) return "together";
  if (hasKey(process.env.HUGGINGFACE_API_KEY)) return "huggingface";

  return "local";
}
