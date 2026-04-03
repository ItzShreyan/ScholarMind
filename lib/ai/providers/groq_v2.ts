import { AIProvider } from "@/lib/ai/types";
import { AIRequest } from "@/types";
import { fetchWithTimeout, retries } from "@/lib/ai/providers/shared";
import { normalizeAIText } from "@/lib/ai/util";

async function streamResponseToText(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 2);
      if (!chunk) continue;

      const lines = chunk.split(/\r?\n/);
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.replace(/^data:\s*/, "");
        if (payload === "[DONE]") return accumulated;

        try {
          const json = JSON.parse(payload);
          const fragment = (json.choices?.[0]?.delta?.content as string) || "";
          accumulated += fragment;
        } catch {
          continue;
        }
      }
    }
  }

  if (buffer) {
    const lines = buffer.split(/\r?\n/);
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.replace(/^data:\s*/, "");
      if (payload === "[DONE]") break;

      try {
        const json = JSON.parse(payload);
        const fragment = (json.choices?.[0]?.delta?.content as string) || "";
        accumulated += fragment;
      } catch {
        continue;
      }
    }
  }

  return accumulated;
}

function buildMessages(input: AIRequest) {
  if (input.history?.length) return input.history;
  const content = (input.message || input.prompt || input.content || "").trim();
  return content ? [{ role: "user", content }] : [];
}

export const groqProviderV2: AIProvider = {
  name: "groq_v2",
  async generate(input) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Missing GROQ_API_KEY");
    const messages = buildMessages(input);

    const run = async () => {
      const res = await fetchWithTimeout(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
            messages,
            temperature: 0.4,
            max_tokens: 1200,
            stream: true
          })
        },
        15000
      );

      if (!res.ok) throw new Error(`Groq V2 failed: ${res.status}`);

      const rawText = await streamResponseToText(res);
      return { provider: "groq_v2" as const, text: normalizeAIText(rawText) };
    };

    return retries(run, 2);
  }
};
