import { AIRequest } from "@/types";

function clipForModel(text: string, limit: number) {
  return text.length > limit ? `${text.slice(0, limit).trim()}\n\n[Context clipped for speed.]` : text;
}

export function buildPrompt(input: AIRequest): string {
  const clippedPrompt = clipForModel(input.prompt, 1200);
  const clippedContext = input.context ? clipForModel(input.context, 14000) : "";
  const baseContext = input.context
    ? `\nContext from user's uploaded study material:\n${clippedContext}\n`
    : "";
  const styleHints: Record<AIRequest["action"], string> = {
    summary: "Return concise bullet points and major takeaways.",
    flashcards:
      "Return 8-15 flashcards as JSON array: [{\"front\":\"...\",\"back\":\"...\"}].",
    quiz: "Return 10 MCQs as JSON array with answer and explanation.",
    chat: "Answer only from context when possible; be explicit when uncertain.",
    concepts: "Extract key concepts and definitions as bullet points.",
    eli10: "Explain in simple words like for a 10-year-old, with examples.",
    hard_mode: "Create challenging questions testing deep understanding.",
    study_plan: "Create a 7-day study plan based on weak areas and priorities.",
    insights: "Identify weak topics, recurring themes, and next study actions."
  };

  return `You are ScholarMind, an elite study copilot.
Task: ${input.action}
Instruction: ${styleHints[input.action]}
User prompt: ${clippedPrompt}${baseContext}
Output must be practical, specific, and well-structured.`;
}
