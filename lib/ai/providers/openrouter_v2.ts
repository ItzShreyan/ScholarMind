import { AIProvider } from "@/lib/ai/types";
import { buildPrompt } from "@/lib/ai/prompt";
import { AIRequest } from "@/types";
import { fetchWithTimeout, retries } from "@/lib/ai/providers/shared";
import { normalizeAIText, normalizeErrorMessage } from "@/lib/ai/util";
import { getOpenRouterKeys, isOpenRouterKeyLimitError } from "@/lib/ai/openrouter-keys";
import {
  buildOpenRouterContent,
  getOpenRouterModel,
  type OpenRouterContent
} from "@/lib/ai/providers/openrouter-content";

type OpenRouterMessage = {
  role: "user" | "assistant";
  content: OpenRouterContent;
};

function buildMessages(input: AIRequest): OpenRouterMessage[] {
  const prompt = buildPrompt(input);
  const history = Array.isArray(input.history) ? input.history.filter((item) => normalizeAIText(item.content)) : [];
  const currentMessage = {
    role: "user" as const,
    content: buildOpenRouterContent(prompt, input.imageAttachments)
  };
  if (!history.length) return [currentMessage];
  return [...history, currentMessage];
}

export const openrouterProviderV2: AIProvider = {
  name: "openrouter_v2",
  async generate(input) {
    const apiKeys = getOpenRouterKeys();
    if (!apiKeys.length) throw new Error("Missing OPENROUTER_API_KEY");
    const messages = buildMessages(input);
    const model = getOpenRouterModel(input.imageAttachments);

    if (input.imageAttachments?.length) {
      console.info("openrouter_vision_request", {
        action: input.action,
        imageCount: input.imageAttachments.length,
        model
      });
    }

    const run = async () => {
      const failures: string[] = [];

      for (const [index, apiKey] of apiKeys.entries()) {
        const res = await fetchWithTimeout(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model,
              messages,
              temperature: input.action === "notes" ? 0.35 : input.action === "quiz" || input.action === "flashcards" ? 0.25 : 0.4,
              max_tokens:
                input.action === "notes"
                  ? 6500
                  : input.action === "exam"
                    ? 5200
                    : input.action === "quiz" || input.action === "flashcards"
                      ? 3200
                      : 1800,
              reasoning: { exclude: true },
              include_reasoning: false
            })
          },
          input.action === "notes" || input.action === "exam" ? 45000 : 25000
        );

        if (!res.ok) {
          const details = normalizeErrorMessage(await res.text(), `OpenRouter V2 failed: ${res.status}`);
          failures.push(`key ${index + 1}: ${details}`);
          if (index < apiKeys.length - 1 && isOpenRouterKeyLimitError(res.status, details)) {
            continue;
          }
          throw new Error(details);
        }

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const rawText = normalizeAIText(data?.choices?.[0]?.message?.content);
        return { provider: "openrouter_v2" as const, text: normalizeAIText(rawText) };
      }

      throw new Error(`OpenRouter keys failed. ${failures.join(" | ")}`);
    };

    return retries(run, 2);
  }
};
