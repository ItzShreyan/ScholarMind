import { AIProvider } from "@/lib/ai/types";
import { buildPrompt } from "@/lib/ai/prompt";
import { normalizeAIText } from "@/lib/ai/util";

export const huggingFaceProvider: AIProvider = {
  name: "huggingface",
  async generate(input) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) throw new Error("Missing HUGGINGFACE_API_KEY");
    const model = process.env.HUGGINGFACE_MODEL || "google/flan-t5-large";
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ inputs: buildPrompt(input) })
    });
    if (!res.ok) throw new Error(`HuggingFace failed: ${res.status}`);
    const data = await res.json();
    const rawText =
      data?.[0]?.generated_text ||
      data?.generated_text ||
      JSON.stringify(data).slice(0, 4000);
    return { provider: "huggingface", text: normalizeAIText(rawText) };
  }
};
