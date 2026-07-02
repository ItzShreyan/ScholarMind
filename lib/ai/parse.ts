export type FlashcardQA = {
  question: string;
  answer: string;
};

export function parseFlashcards(text: string): FlashcardQA[] {
  // First, attempt to parse as JSON (which is the modern format from the prompt)
  try {
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0 && ("front" in parsed[0] || "question" in parsed[0])) {
        return parsed.map((card: any) => ({
          question: card.front || card.question || "",
          answer: card.back || card.answer || ""
        })).filter(c => c.question && c.answer);
      }
    }
  } catch {
    // Ignore JSON parsing errors and fall back to manual parsing
  }

  // Fallback to legacy Q: and A: manual parsing
  const cards: FlashcardQA[] = [];
  const lines = text.split("\n");

  let question = "";
  let answer = "";

  for (const line of lines) {
    if (line.trim().startsWith("Q:")) {
      question = line.replace(/^Q:/i, "").trim();
    }
    if (line.trim().startsWith("A:")) {
      answer = line.replace(/^A:/i, "").trim();
      if (question && answer) {
        cards.push({ question, answer });
      }
      question = "";
      answer = "";
    }
  }

  return cards;
}
