import { AIProvider } from "@/lib/ai/types";

export const groqProviderV2: AIProvider = {
  name: "groq_v2",

  async generate(input) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Missing GROQ_API_KEY");

    const systemPrompt = `
You are a high-quality AI assistant.
- Be clear and structured
- Give useful, practical answers
- Adapt to the user's level
- If coding, give full working code
- Avoid fluff
`;

    const history = input.history || [];

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: input.message }
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages,
        temperature: 0.4,
        max_tokens: 1200
      })
    });

    if (!res.ok) throw new Error(`Groq failed: ${res.status}`);

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content || "";

    return { provider: "groq_v2", text };
  }
};
