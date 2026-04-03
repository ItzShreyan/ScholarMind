import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider } from "@/lib/ai/types";
import { buildPrompt } from "@/lib/ai/prompt";
import { normalizeAIText } from "@/lib/ai/util";

export const geminiProvider: AIProvider = {
  name: "gemini",
  async generate(input) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash"
    });
    const result = await model.generateContent(buildPrompt(input));
    const text = normalizeAIText(result.response.text());
    return { provider: "gemini", text };
  }
};
