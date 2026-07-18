import { createHash } from "crypto";
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

function hasRemoteProviderConfigured() {
  return (
    hasOpenRouterKey() ||
    Boolean(process.env.GROQ_API_KEY?.trim()) ||
    Boolean(process.env.GEMINI_API_KEY?.trim()) ||
    Boolean(process.env.TOGETHER_API_KEY?.trim()) ||
    Boolean(process.env.HUGGINGFACE_API_KEY?.trim())
  );
}

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
  "about", "answer", "because", "chapter", "content", "definition", "example",
  "explain", "explanation", "guide", "help", "learn", "material", "notes",
  "prompt", "question", "revise", "source", "sources", "step", "steps",
  "study", "summary", "teach", "topic", "tutor", "uploaded", "using",
  "what", "your"
]);

function groundingTerms(text: string) {
  return [...new Set(
    (text.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? []).filter((term) => !groundingStopWords.has(term))
  )];
}

function isGroundedEnough(text: string, input: AIRequest) {
  if (!input.context) return true;
  const response = text.toLowerCase();
  const contextTerms = groundingTerms(`${input.prompt || ""} ${input.context || ""}`).slice(0, 12);
  if (!contextTerms.length) return true;
  return contextTerms.some((term) => response.includes(term));
}

function isBadResponse(text: string, input: AIRequest): boolean {
  const normalized = (text || "").trim();
  if (!normalized) return true;
  if (normalized.toLowerCase() === "[object object]" || normalized === "{}") return true;

  const mode = String(input.mode || "");
  if (normalized.length < 10 && looksLikeReasoningLeak(text, mode)) return true;

  if (mode === "summary" && input.context && normalized.length < 30 && !isGroundedEnough(normalized, input)) {
    return true;
  }

  if (mode === "notes" && normalized.length >= 50) return false;

  if (normalized.length >= 15) return false;

  return false;
}

export async function generateWithFallback(rawInput: AIRequest) {
  const input = normalizeInput(rawInput);
  const strictRemote = requiresRemoteAI(input);
  const contextHash = input.context
    ? createHash("md5").update(input.context).digest("hex").slice(0, 8)
    : "no-context";
  const cacheKey = JSON.stringify({
    v: 10,
    mode: input.mode,
    examMode: input.examMode,
    message: input.message,
    contextHash
  });
  const cached = getCached(cacheKey);
  if (cached) return { text: normalizeAIText(cached), provider: "cache" as const };

  if (strictRemote && !hasRemoteProviderConfigured()) {
    throw new Error(
      "Study tools require a configured AI provider. Add OPENROUTER_API_KEY, GEMINI_API_KEY, or GROQ_API_KEY in .env.local, then restart the app."
    );
  }

  const selected = selectProvider(input);
  const primary = providers[selected];
  const failures: string[] = [];

  // Try primary provider first
  if (primary && !(strictRemote && primary.name === "local")) {
    try {
      const result = await primary.generate(input);
      const normalizedText = extractStructuredOutput(normalizeAIText(result.text));
      if (normalizedText && !isBadResponse(normalizedText, input)) {
        setCached(cacheKey, normalizedText);
        return { ...result, text: normalizedText };
      }
      failures.push(`${primary.name}: bad/empty response`);
    } catch (err) {
      failures.push(`${primary?.name || "primary"}: ${normalizeErrorMessage(err)}`);
    }
  }

  // Fallback chain — try all available providers including local
  const openrouterConfigured = hasOpenRouterKey();
  const openrouterFirstActions = new Set(["summary", "flashcards", "quiz", "notes", "exam", "chat", "concepts", "hard_mode", "study_plan", "insights"]);
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
    if (!provider || provider.name === primary?.name) continue;
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

  const failureDetails = failures.slice(0, 5).join(" | ");
  const errorMessage = strictRemote
    ? `Study tools require a live AI response. All providers failed: ${failureDetails}. Try again in a moment or check your API keys.`
    : `All AI providers failed: ${failureDetails}. Try again or enable an AI provider in .env.local.`;
  throw new Error(errorMessage);
}
