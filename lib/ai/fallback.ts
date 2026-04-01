import { AIRequest } from "@/types";
import { getCached, setCached } from "@/lib/cache";
import { AIProvider } from "@/lib/ai/types";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { groqProvider } from "@/lib/ai/providers/groq";
import { huggingFaceProvider } from "@/lib/ai/providers/huggingface";
import { localProvider } from "@/lib/ai/providers/local";
import { openRouterProvider } from "@/lib/ai/providers/openrouter";
import { togetherProvider } from "@/lib/ai/providers/together";

function providerOrder(): AIProvider[] {
  const preferred = process.env.AI_PRIMARY_PROVIDER || "gemini";
  const all: Record<string, AIProvider> = {
    gemini: geminiProvider,
    groq: groqProvider,
    huggingface: huggingFaceProvider,
    local: localProvider,
    openrouter: openRouterProvider,
    together: togetherProvider
  };
  const defaults = [preferred, "gemini", "groq", "huggingface", "openrouter", "together", "local"];
  const unique = Array.from(new Set(defaults));
  return unique.map((name) => all[name]).filter(Boolean);
}

export async function generateWithFallback(input: AIRequest) {
  const cacheKey = JSON.stringify({ version: 2, input });
  const cached = getCached(cacheKey);
  if (cached) return { text: cached, provider: "cache" };

  const failures: string[] = [];
  for (const provider of providerOrder()) {
    try {
      const result = await provider.generate(input);
      if (result.text?.trim()) {
        setCached(cacheKey, result.text);
        return result;
      }
      failures.push(`${provider.name}: empty response`);
    } catch (error) {
      failures.push(`${provider.name}: ${(error as Error).message}`);
    }
  }

  throw new Error(`All AI providers failed. ${failures.join(" | ")}`);
}
