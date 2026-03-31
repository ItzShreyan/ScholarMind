import { AIProvider } from "@/lib/ai/types";
import { AIRequest } from "@/types";

const stopWords = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "being",
  "between",
  "could",
  "first",
  "from",
  "have",
  "into",
  "just",
  "make",
  "more",
  "most",
  "notes",
  "only",
  "other",
  "over",
  "should",
  "some",
  "study",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "topic",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "your"
]);

function normalizeText(text?: string) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function splitSentences(text: string) {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function pickLines(input: AIRequest, limit: number) {
  const source = normalizeText(input.context) || normalizeText(input.prompt);
  const sentences = splitSentences(source);

  if (sentences.length) {
    return sentences.slice(0, limit);
  }

  return [`Focus on the question: ${input.prompt}`];
}

function keywordsFrom(input: AIRequest, limit: number) {
  const source = `${normalizeText(input.context)} ${normalizeText(input.prompt)}`.toLowerCase();
  const words = source.match(/[a-z][a-z0-9-]{2,}/g) ?? [];
  const counts = new Map<string, number>();

  words.forEach((word) => {
    if (stopWords.has(word)) return;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function summaryResponse(input: AIRequest) {
  const lines = pickLines(input, 5);
  return `Local fallback response\n\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

function flashcardResponse(input: AIRequest) {
  const lines = pickLines(input, 6);
  const keywords = keywordsFrom(input, 6);
  const cards = lines.map((line, index) => ({
    front: keywords[index] ? `What should you remember about ${titleCase(keywords[index])}?` : `Flashcard ${index + 1}`,
    back: line
  }));

  return JSON.stringify(cards, null, 2);
}

function quizResponse(input: AIRequest) {
  const keywords = keywordsFrom(input, 8);
  const lines = pickLines(input, 5);
  const quiz = lines.map((line, index) => {
    const answer = keywords[index] ? titleCase(keywords[index]) : `Key idea ${index + 1}`;
    const distractors = keywords
      .filter((keyword) => titleCase(keyword) !== answer)
      .slice(index, index + 3)
      .map(titleCase);

    return {
      question: `Which key idea best matches this revision point: "${line}"?`,
      options: [answer, ...distractors].slice(0, 4),
      answer,
      explanation: line
    };
  });

  return JSON.stringify(quiz, null, 2);
}

function chatResponse(input: AIRequest) {
  const lines = pickLines(input, 4);
  const keywordList = keywordsFrom(input, 4);

  if (input.context) {
    return [
      "Local fallback response",
      "",
      `Question: ${input.prompt}`,
      "",
      "Most relevant points from your material:",
      ...lines.map((line) => `- ${line}`),
      keywordList.length ? `\nFocus topics: ${keywordList.map(titleCase).join(", ")}.` : ""
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "Local fallback response",
    "",
    `Question: ${input.prompt}`,
    "",
    "I do not have uploaded study material yet, so answer quality will improve once notes or PDFs are added.",
    "For now, break the topic into core ideas, definitions, examples, and likely exam questions."
  ].join("\n");
}

function conceptResponse(input: AIRequest) {
  const keywords = keywordsFrom(input, 8);
  const lines = pickLines(input, Math.max(4, keywords.length));

  return [
    "Local fallback response",
    "",
    ...keywords.map((keyword, index) => `- ${titleCase(keyword)}: ${lines[index] || "Review this concept in your material."}`)
  ].join("\n");
}

function eli10Response(input: AIRequest) {
  const lines = pickLines(input, 3);
  return [
    "Local fallback response",
    "",
    "Simple explanation:",
    ...lines.map((line) => `- ${line.replace(/\butilize\b/gi, "use").replace(/\bapproximately\b/gi, "about")}`)
  ].join("\n");
}

function hardModeResponse(input: AIRequest) {
  const keywords = keywordsFrom(input, 5);
  return [
    "Local fallback response",
    "",
    ...keywords.map(
      (keyword, index) =>
        `${index + 1}. Explain ${titleCase(keyword)} without memorized wording, then compare it with a closely related idea.`
    )
  ].join("\n");
}

function studyPlanResponse(input: AIRequest) {
  const keywords = keywordsFrom(input, 7);
  const fallbackTopics = keywords.length ? keywords : ["core ideas", "definitions", "examples", "practice"];

  return fallbackTopics
    .slice(0, 7)
    .map((topic, index) => `Day ${index + 1}: Review ${titleCase(topic)}, then do a short recall check and one written explanation.`)
    .join("\n");
}

function insightsResponse(input: AIRequest) {
  const keywords = keywordsFrom(input, 5);
  const lines = pickLines(input, 3);

  return [
    "Local fallback response",
    "",
    "Review these first:",
    ...keywords.map((keyword) => `- ${titleCase(keyword)}`),
    "",
    "Useful next steps:",
    ...lines.map((line) => `- ${line}`)
  ].join("\n");
}

function localResponse(input: AIRequest) {
  switch (input.action) {
    case "summary":
      return summaryResponse(input);
    case "flashcards":
      return flashcardResponse(input);
    case "quiz":
      return quizResponse(input);
    case "chat":
      return chatResponse(input);
    case "concepts":
      return conceptResponse(input);
    case "eli10":
      return eli10Response(input);
    case "hard_mode":
      return hardModeResponse(input);
    case "study_plan":
      return studyPlanResponse(input);
    case "insights":
      return insightsResponse(input);
    default:
      return summaryResponse(input);
  }
}

export const localProvider: AIProvider = {
  name: "local",
  async generate(input: AIRequest) {
    return {
      provider: "local",
      text: localResponse(input)
    };
  }
};
