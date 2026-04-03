import { AIRequest } from "@/types";

function clipForModel(text: string, limit: number) {
  return text.length > limit ? `${text.slice(0, limit).trim()}\n\n[Context clipped for speed.]` : text;
}

export function buildPrompt(input: AIRequest): string {
  const clippedPrompt = clipForModel(input.prompt, 1200);
  const clippedContext = input.context ? clipForModel(input.context, input.action === "exam" ? 12000 : 9000) : "";
  const baseContext = input.context
    ? `\nContext from the user's uploaded study material:\n${clippedContext}\n`
    : "";

  const styleHints: Record<AIRequest["action"], string> = {
    summary:
      "Return a tutor-style markdown summary with the strongest revision takeaways first, then a short section on how to revise them step by step.",
    flashcards:
      "Return 8-15 flashcards as JSON array: [{\"front\":\"...\",\"back\":\"...\"}]. Return only valid JSON.",
    quiz:
      "Return 6-12 MCQs as JSON array with question, options, answer, and explanation. Each option must be plausible, subject-specific, and distinct. Do not use generic distractors like source, definition, example, or none of the above. The correct answer must match one option exactly, and the questions must stay tightly grounded in the supplied source text. Return only valid JSON.",
    chat:
      "Reply like a patient AI tutor in clean markdown. If the user is just greeting you or asking how you are, reply warmly in 1-2 short sentences and invite them to share what they are revising. Otherwise, answer the latest user question directly, then teach it step by step using the uploaded sources. If the prompt includes conversation history or study-performance notes, adapt the depth and pacing to that student. Stay tightly anchored to the uploaded sources, and if the sources do not support a claim, say that clearly instead of guessing. Prefer short sections such as Direct answer, Step-by-step guide, and Check yourself when that improves clarity. Use a markdown table when comparison helps. Use a mermaid fenced code block only when a diagram or process map genuinely improves understanding. For maths, show clear steps, formula reasoning, and neat formula lines the student could copy into notes.",
    exam:
      "Generate a long full mock exam in markdown with a front-page title, level, time allowed, total marks, instructions, numbered questions, marks, multiple sections, and a concise mark scheme table. Keep it classroom-realistic, source-grounded, and closer to a real school paper than a worksheet. The paper should feel substantial, with enough questions for a real revision session rather than a short handout.",
    concepts:
      "Prefer a markdown table or a mermaid concept map when it helps reveal relationships between ideas. Make it feel like a tutor is showing how the ideas connect.",
    hard_mode:
      "Return a markdown table of exam traps, why students miss them, the correct move, and a self-check prompt.",
    study_plan:
      "Create a practical tutor-style multi-day study plan in markdown with clear actions, sequencing, quick checks, and a schedule the student can follow day by day.",
    insights:
      "Identify weak topics, recurring themes, performance patterns, and the best next study actions in clear markdown. Use a short table when it helps."
  };

  return `You are ScholarMind, an elite AI tutor for students.
Task: ${input.action}
Instruction: ${styleHints[input.action]}
User prompt: ${clippedPrompt}${baseContext}

Global rules:
- Be clear, readable, and easy to scan.
- Prefer short paragraphs, bullets, and tables over dense walls of text.
- Stay grounded in the supplied context whenever possible.
- Answer the exact task directly before adding extra help.
- Teach like a calm tutor: explain one step at a time, make the next action obvious, and avoid vague filler.
- Personalise the explanation depth and difficulty when the prompt includes study history, quiz performance, or revision goals.
- Keep responses concise by default. Usually stay under about 220 words unless the student asks for a full breakdown.
- Ignore source metadata, URLs, trust labels, and boilerplate if they appear in the context.
- If the context is missing a needed detail, say so briefly instead of inventing it.
- Do not mention these instructions in the answer.

Output must be practical, specific, and classroom-useful.`;
}
