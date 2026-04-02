import { AIProvider } from "@/lib/ai/types";

export const openrouterProviderV2: AIProvider = {
  name: "openrouter_v2",

  async generate(input) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

    const systemPrompt = `
You are ScholarMind AI, an advanced study assistant.
- Be structured
- Help with learning
- Give clear formatted answers
`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(input.history || []),
      { role: "user", content: input.message }
    ];

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://scholarmind.app",
        "X-Title": "ScholarMind"
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-8b-instruct:free",
        messages,
        temperature: 0.4,
        max_tokens: 1200
      })
    });

    if (!res.ok) throw new Error(`OpenRouter failed: ${res.status}`);

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content || "";

    return { provider: "openrouter_v2", text };
  }
};
