import { AIProvider } from "@/lib/ai/types";
import { buildPrompt } from "@/lib/ai/prompt";

export const openRouterProvider: AIProvider = {
  name: "openrouter",
  async generate(input) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "ScholarMind"
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.2-3b-instruct:free",
        messages: [{ role: "user", content: buildPrompt(input) }],
        temperature: 0.4
      })
    });
    if (!res.ok) throw new Error(`OpenRouter failed: ${res.status}`);
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content || "";
    return { provider: "openrouter", text };
  }
};
