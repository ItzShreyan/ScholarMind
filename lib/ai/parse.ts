export type FlashcardQA = {
  question: string;
  answer: string;
};

export function parseFlashcards(text: string): FlashcardQA[] {
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
