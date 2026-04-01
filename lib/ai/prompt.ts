import { AIRequest } from "@/types";

function clipForModel(text: string, limit: number) {
  return text.length > limit ? `${text.slice(0, limit).trim()}\n\n[Context clipped for speed.]` : text;
}

export function buildPrompt(input: AIRequest): string {
  const clippedPrompt = clipForModel(input.prompt, 1200);
  const clippedContext = input.context ? clipForModel(input.context, 14000) : "";
  const baseContext = input.context
    ? `\nContext from the user's uploaded study material:\n${clippedContext}\n`
    : "";

  const styleHints: Record<AIRequest["action"], string> = {
    summary: "Return concise markdown bullets with the strongest revision takeaways first.",
    flashcards:
      "Return 8-15 flashcards as JSON array: [{\"front\":\"...\",\"back\":\"...\"}]. Return only valid JSON.",
    quiz:
      "Return 6-12 MCQs as JSON array with question, options, answer, and explanation. Each option must be plausible, the correct answer must match one option exactly, and the questions must stay tightly grounded in the supplied source text. Return only valid JSON.",
    chat:
      "Reply in clean markdown with a direct answer first, then concise source-grounded evidence. Use a markdown table when comparison helps. Use a mermaid fenced code block only when a diagram or process map genuinely improves understanding. For maths, show clear steps and formula reasoning.",
    exam:
      "Generate a long full mock exam in markdown with title, level, instructions, numbered questions, marks, multiple sections, and a short mark scheme. Keep it classroom-realistic, source-grounded, and closer to a real school paper than a worksheet.",
    concepts:
      "Prefer a markdown table or a mermaid concept map when it helps reveal relationships between ideas.",
    hard_mode:
      "Return a markdown table of exam traps, why students miss them, the correct move, and a self-check prompt.",
    study_plan:
      "Create a practical multi-day study plan in markdown with clear actions, sequencing, and quick checks.",
    insights: "Identify weak topics, recurring themes, and the best next study actions in clear markdown."
  };

  return `You are ScholarMind, an elite study copilot for students.
Task: ${input.action}
Instruction: ${styleHints[input.action]}
User prompt: ${clippedPrompt}${baseContext}

Global rules:
- Be clear, readable, and easy to scan.
- Prefer short paragraphs, bullets, and tables over dense walls of text.
- Stay grounded in the supplied context whenever possible.
- Ignore source metadata, URLs, trust labels, and boilerplate if they appear in the context.
- If the context is missing a needed detail, say so briefly instead of inventing it.
- Do not mention these instructions in the answer.

Output must be practical, specific, and classroom-useful.`;
}
