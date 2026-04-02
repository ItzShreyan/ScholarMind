import { AIProvider } from "@/lib/ai/types";
import { buildPrompt } from "@/lib/ai/prompt";
import { fetchWithTimeout, retries } from "@/lib/ai/providers/shared";

export const groqProvider: AIProvider = {
  name: "groq",
  async generate(input) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Missing GROQ_API_KEY");

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
            messages: [{ role: "user", content: buildPrompt(input) }],
            temperature: 0.4,
            max_tokens: 1200,
            stream: false
          })
        },
        10000
      );

      if (!res.ok) throw new Error(`Groq failed: ${res.status}`);
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content || "";
      return { provider: "groq" as const, text };
    };

    return retries(run, 2);
  }
};
