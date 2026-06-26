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
import { extractStructuredOutput, looksLikeReasoningLeak } from "@/lib/ai/strip-reasoning";
import { hasOpenRouterKey } from "@/lib/ai/openrouter-keys";

const providers: Record<string, AIProvider> = {
  gemini: geminiProvider,
  groq: groqProvider,
  groq_v2: groqProviderV2,
  huggingface: huggingFaceProvider,
  local: localProvider,
  openrouter_v2: openrouterProviderV2,
  together: togetherProvider
};

const remoteOnlyToolActions = new Set([
  "summary",
  "flashcards",
  "quiz",
  "notes",
  "exam",
  "concepts",
  "hard_mode",
  "study_plan",
  "insights"
]);

function hasRemoteProviderConfigured() {
  return (
    hasOpenRouterKey() ||
    Boolean(process.env.GROQ_API_KEY?.trim()) ||
    Boolean(process.env.GEMINI_API_KEY?.trim()) ||
    Boolean(process.env.TOGETHER_API_KEY?.trim()) ||
    Boolean(process.env.HUGGINGFACE_API_KEY?.trim())
  );
}

function requiresRemoteAI(input: AIRequest) {
  return remoteOnlyToolActions.has(String(input.action || input.mode || ""));
}

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
  if (mode === "flashcards" && !normalized.includes('"front"') && !normalized.includes("q:") && !normalized.includes("flashcard")) return true;
  if (mode === "quiz" && !normalized.includes('"question"') && !/\b1\./.test(normalized)) return true;
  if (mode === "notes" && !normalized.includes('"sections"') && !normalized.includes("#")) return true;
  if (looksLikeReasoningLeak(text, String(mode))) return true;
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
  const strictRemote = requiresRemoteAI(input);
  const cacheKey = JSON.stringify({ v: 7, mode: input.mode, message: input.message });
  const cached = getCached(cacheKey);
  if (cached) return { text: normalizeAIText(cached), provider: "cache" };

  if (strictRemote && !hasRemoteProviderConfigured()) {
    throw new Error(
      "Study tools require a configured AI provider. Add OPENROUTER_API_KEY in .env.local or Netlify environment variables, then restart the app."
    );
  }

  // ✅ SMART ROUTING (THIS IS THE MAIN UPGRADE)
  const selected = selectProvider(input);
  const primary = providers[selected];

  const failures: string[] = [];

  try {
    if (primary && !(strictRemote && primary.name === "local")) {
      const result = await primary.generate(input);
      const normalizedText = extractStructuredOutput(normalizeAIText(result.text));
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
  const openrouterConfigured = hasOpenRouterKey();
  const openrouterFirstActions = new Set(["summary", "flashcards", "quiz", "notes", "exam", "chat"]);
  const fallbackOrder =
    strictRemote
      ? [
          providers.openrouter_v2,
          providers.groq_v2,
          providers.groq,
          providers.gemini,
          providers.together,
          providers.huggingface
        ]
      : openrouterConfigured && openrouterFirstActions.has(String(input.action))
      ? [providers.openrouter_v2, providers.local]
      : [
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
    if (strictRemote && provider.name === "local") continue;

    try {
      const result = await provider.generate(input);
      const normalizedText = extractStructuredOutput(normalizeAIText(result.text));
      if (normalizedText && !isBadResponse(normalizedText, input)) {
        setCached(cacheKey, normalizedText);
        return { ...result, text: normalizedText };
      }
      failures.push(`${provider.name}: bad/empty response`);
    } catch (error) {
      failures.push(`${provider.name}: ${normalizeErrorMessage(error)}`);
    }
  }

  throw new Error(
    strictRemote
      ? `Study tools require a live AI response, and every configured AI provider failed. ${failures.join(" | ")}`
      : `All AI providers failed. ${failures.join(" | ")}`
  );
}
