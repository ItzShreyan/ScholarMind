import { AIProvider } from "@/lib/ai/types";
import { buildPrompt } from "@/lib/ai/prompt";
import { normalizeAIText } from "@/lib/ai/util";

export const togetherProvider: AIProvider = {
  name: "together",
  async generate(input) {
    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) throw new Error("Missing TOGETHER_API_KEY");
    const res = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.TOGETHER_MODEL || "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        messages: [{ role: "user", content: buildPrompt(input) }],
        temperature: 0.35
      })
    });
    if (!res.ok) throw new Error(`Together failed: ${res.status}`);
    const json = await res.json();
    const text = normalizeAIText(json.choices?.[0]?.message?.content || "");
    return { provider: "together", text };
  }
};
