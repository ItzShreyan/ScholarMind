import { AIProvider } from "@/lib/ai/types";
import { buildPrompt } from "@/lib/ai/prompt";

export const groqProvider: AIProvider = {
  name: "groq",
  async generate(input) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Missing GROQ_API_KEY");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        messages: [{ role: "user", content: buildPrompt(input) }],
        temperature: 0.3,
        max_tokens: input.action === "chat" ? 360 : 1100
      })
    });
    if (!res.ok) throw new Error(`Groq failed: ${res.status}`);
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content || "";
    return { provider: "groq", text };
  }
};
