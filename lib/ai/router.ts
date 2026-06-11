import { AIRequest } from "@/types";

function hasKey(value?: string | null) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasOpenRouterKey() {
  return hasKey(process.env.OPENROUTER_API_KEY) || hasKey(process.env.OPEN_ROUTER_API_KEY);
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
  if (_input.action === "notes" && hasOpenRouterKey()) return "openrouter_v2";
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
