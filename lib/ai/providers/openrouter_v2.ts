import { AIProvider } from "@/lib/ai/types";
import { AIRequest } from "@/types";
import { fetchWithTimeout, retries } from "@/lib/ai/providers/shared";
import { normalizeAIText, normalizeErrorMessage } from "@/lib/ai/util";

function buildMessages(input: AIRequest) {
  const content = (input.message || input.prompt || input.content || "").trim();
  const history = Array.isArray(input.history) ? input.history.filter((item) => normalizeAIText(item.content)) : [];
  const context = normalizeAIText(input.context || "");
  const contextMessage = context
    ? [{
        role: "system" as const,
        content: [
          "Use this uploaded/source-enabled study context as the evidence base.",
          "Do not say there is no source material unless this context is empty or irrelevant.",
          context
        ].join("\n\n")
      }]
    : [];
  if (!content) return [...contextMessage, ...history];
  if (history.length && normalizeAIText(history[history.length - 1]?.content) === content) return [...contextMessage, ...history];
  return [...contextMessage, ...history, { role: "user" as const, content }];
}

export const openrouterProviderV2: AIProvider = {
  name: "openrouter_v2",
  async generate(input) {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY;
    if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");
    const messages = buildMessages(input);

    const run = async () => {
      const res = await fetchWithTimeout(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free",
            messages,
            temperature: input.action === "notes" ? 0.35 : 0.4,
            max_tokens: input.action === "notes" ? 6500 : input.action === "exam" ? 5200 : 1400
          })
        },
        input.action === "notes" || input.action === "exam" ? 45000 : 25000
      );

      if (!res.ok) {
        const details = normalizeErrorMessage(await res.text(), `OpenRouter V2 failed: ${res.status}`);
        throw new Error(details);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rawText = normalizeAIText(data?.choices?.[0]?.message?.content);
      return { provider: "openrouter_v2" as const, text: normalizeAIText(rawText) };
    };

    return retries(run, 2);
  }
};
