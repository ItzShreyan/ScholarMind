import { AIRequest } from "@/types";
import { getCached, setCached } from "@/lib/cache";
import { AIProvider } from "@/lib/ai/types";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { groqProviderV2 } from "@/lib/ai/providers/groq_v2";
import { huggingFaceProvider } from "@/lib/ai/providers/huggingface";
import { localProvider } from "@/lib/ai/providers/local";
import { openrouterProviderV2 } from "@/lib/ai/providers/openrouter_v2";
import { togetherProvider } from "@/lib/ai/providers/together";
import { selectProvider } from "@/lib/ai/router";

const providers: Record<string, AIProvider> = {
  gemini: geminiProvider,
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

function isBadResponse(text: string, mode?: string): boolean {
  const normalized = (text || "").toLowerCase();

  if (!normalized.trim()) return true;
  if ((mode === "flashcards" || mode === "flashcards") && !normalized.includes("q:")) return true;
  if ((mode === "quiz" || mode === "quiz") && !/\b1\./.test(normalized)) return true;

  return false;
}

export async function generateWithFallback(rawInput: AIRequest) {
  const input = normalizeInput(rawInput);
  const cacheKey = JSON.stringify({ v: 6, mode: input.mode, message: input.message });
  const cached = getCached(cacheKey);
  if (cached) return { text: cached, provider: "cache" };

  // ✅ SMART ROUTING (THIS IS THE MAIN UPGRADE)
  const selected = selectProvider(input);
  const primary = providers[selected];

  const failures: string[] = [];

  try {
    if (primary) {
      const result = await primary.generate(input);
      if (result.text?.trim() && !isBadResponse(result.text, input.mode)) {
        setCached(cacheKey, result.text);
        return result;
      }
      failures.push(`${primary.name}: bad response`);
    }
  } catch (err) {
    failures.push(`${primary?.name || "primary"}: ${(err as Error).message}`);
  }

  // 🔁 FALLBACK CHAIN
  const fallbackOrder = [
    providers.gemini,
    providers.groq_v2,
    providers.openrouter_v2,
    providers.huggingface,
    providers.together,
    providers.local
  ];

  for (const provider of fallbackOrder) {
    if (!provider) continue;

    try {
      const result = await provider.generate(input);
      if (result.text?.trim() && !isBadResponse(result.text, input.mode)) {
        setCached(cacheKey, result.text);
        return result;
      }
      failures.push(`${provider.name}: bad/empty response`);
    } catch (error) {
      failures.push(`${provider.name}: ${(error as Error).message}`);
    }
  }

  throw new Error(`All AI providers failed. ${failures.join(" | ")}`);
}
