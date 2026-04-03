import { AIRequest } from "@/types";
import { getCached, setCached } from "@/lib/cache";
import { AIProvider } from "@/lib/ai/types";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { groqProvider } from "@/lib/ai/providers/groq";
import { groqProviderV2 } from "@/lib/ai/providers/groq_v2";
import { huggingFaceProvider } from "@/lib/ai/providers/huggingface";
import { localProvider } from "@/lib/ai/providers/local";
import { openrouterProviderV2 } from "@/lib/ai/providers/openrouter_v2";
import { togetherProvider } from "@/lib/ai/providers/together";
import { selectProvider } from "@/lib/ai/router";
import { normalizeAIText, normalizeErrorMessage } from "@/lib/ai/util";

const providers: Record<string, AIProvider> = {
  gemini: geminiProvider,
  groq: groqProvider,
  groq_v2: groqProviderV2,
  huggingface: huggingFaceProvider,
  local: localProvider,
  openrouter_v2: openrouterProviderV2,
  together: togetherProvider
};

function normalizeInput(input: AIRequest): AIRequest {
  const message = input.message || input.prompt || input.content || "";
  const mode = input.mode || input.action;
  const history = input.history?.slice(-8) ?? [];

  return {
    ...input,
    message,
    mode,
    history
  };
}

const groundingStopWords = new Set([
  "about",
  "answer",
  "because",
  "chapter",
  "content",
  "definition",
  "example",
  "explain",
  "explanation",
  "guide",
  "help",
  "learn",
  "material",
  "notes",
  "prompt",
  "question",
  "revise",
  "source",
  "sources",
  "step",
  "steps",
  "study",
  "summary",
  "teach",
  "topic",
  "tutor",
  "uploaded",
  "using",
  "what",
  "your"
]);

function groundingTerms(text: string) {
  return [...new Set((text.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? []).filter((term) => !groundingStopWords.has(term)))];
}

function isGroundedEnough(text: string, input: AIRequest) {
  if (!input.context) return true;
  const response = text.toLowerCase();
  const contextTerms = groundingTerms(`${input.prompt || ""} ${input.context || ""}`).slice(0, 12);
  if (!contextTerms.length) return true;
  return contextTerms.some((term) => response.includes(term));
}

function isBadResponse(text: string, input: AIRequest): boolean {
  const normalized = (text || "").toLowerCase();
  const letters = (normalized.match(/[a-z]/g) ?? []).length;
  const digits = (normalized.match(/\d/g) ?? []).length;
  const mode = input.mode;

  if (!normalized.trim()) return true;
  if ((mode === "flashcards" || mode === "flashcards") && !normalized.includes("q:")) return true;
  if ((mode === "quiz" || mode === "quiz") && !/\b1\./.test(normalized)) return true;
  if (normalized === "[object object]" || normalized === "{}") return true;
  if (/(?:0{3,},){4,}0{3,}/.test(normalized)) return true;
  if (digits > letters * 2 && normalized.length > 80) return true;
  if (/^(okay|sure|alright)[,\s]+(?:0|,|\.){12,}/.test(normalized)) return true;
  if (["chat", "summary", "insights", "concepts", "study_plan", "hard_mode"].includes(String(mode)) && !isGroundedEnough(normalized, input)) {
    return true;
  }

  return false;
}

export async function generateWithFallback(rawInput: AIRequest) {
  const input = normalizeInput(rawInput);
  const cacheKey = JSON.stringify({ v: 6, mode: input.mode, message: input.message });
  const cached = getCached(cacheKey);
  if (cached) return { text: normalizeAIText(cached), provider: "cache" };

  // ✅ SMART ROUTING (THIS IS THE MAIN UPGRADE)
  const selected = selectProvider(input);
  const primary = providers[selected];

  const failures: string[] = [];

  try {
    if (primary) {
      const result = await primary.generate(input);
      const normalizedText = normalizeAIText(result.text);
      if (normalizedText && !isBadResponse(normalizedText, input)) {
        setCached(cacheKey, normalizedText);
        return { ...result, text: normalizedText };
      }
      failures.push(`${primary.name}: bad response`);
    }
  } catch (err) {
    failures.push(`${primary?.name || "primary"}: ${normalizeErrorMessage(err)}`);
  }

  // 🔁 FALLBACK CHAIN
  const fallbackOrder = [
    providers.groq_v2,
    providers.groq,
    providers.gemini,
    providers.openrouter_v2,
    providers.together,
    providers.huggingface,
    providers.local
  ];

  for (const provider of fallbackOrder) {
    if (!provider) continue;

    try {
      const result = await provider.generate(input);
      const normalizedText = normalizeAIText(result.text);
      if (normalizedText && !isBadResponse(normalizedText, input)) {
        setCached(cacheKey, normalizedText);
        return { ...result, text: normalizedText };
      }
      failures.push(`${provider.name}: bad/empty response`);
    } catch (error) {
      failures.push(`${provider.name}: ${normalizeErrorMessage(error)}`);
    }
  }

  throw new Error(`All AI providers failed. ${failures.join(" | ")}`);
}
