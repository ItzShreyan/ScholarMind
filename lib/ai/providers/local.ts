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

function cleanLine(line: string) {
  return line.replace(/\|/g, "/").trim();
}

function markdownBullets(lines: string[]) {
  return lines.map((line) => `- ${cleanLine(line)}`).join("\n");
}

function markdownTable(headers: string[], rows: string[][]) {
  const header = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map((cell) => cleanLine(cell)).join(" | ")} |`).join("\n");
  return [header, divider, body].filter(Boolean).join("\n");
}

function wantsTable(prompt: string) {
  return /\btable|compare|comparison|differences|pros|cons|formula|grid\b/i.test(prompt);
}

function wantsDiagram(prompt: string) {
  return /\bdiagram|map|flow|process|timeline|relationship|connections?\b/i.test(prompt);
}

function looksLikeMaths(prompt: string, context?: string) {
  return /\bmath|maths|equation|formula|algebra|geometry|trigonometry|calculus|probability|graph|angle|triangle\b/i.test(
    `${prompt} ${context || ""}`
  );
}

function rootTopic(input: AIRequest, keywords: string[]) {
  const promptWords = normalizeText(input.prompt).split(/\s+/).filter(Boolean);
  return titleCase((keywords[0] || promptWords.slice(0, 3).join(" ") || "Topic").replace(/[^a-z0-9 -]/gi, ""));
}

function buildMermaidMap(input: AIRequest, keywords: string[]) {
  const topic = rootTopic(input, keywords);
  const nodes = keywords.slice(0, 5);

  if (!nodes.length) {
    return "";
  }

  return [
    "```mermaid",
    "graph TD",
    `  root[${topic}]`,
    ...nodes.map((keyword, index) => `  root --> node${index}[${titleCase(keyword)}]`),
    "```"
  ].join("\n");
}

function summaryResponse(input: AIRequest) {
  const lines = pickLines(input, 5);
  return ["## Fast Summary", "", markdownBullets(lines)].join("\n");
}

function flashcardResponse(input: AIRequest) {
  const lines = pickLines(input, 6);
  const keywords = keywordsFrom(input, 6);
  const cards = lines.map((line, index) => ({
    front: keywords[index] ? titleCase(keywords[index]) : `Flashcard ${index + 1}`,
    back: cleanLine(line).slice(0, 160)
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
      question: `Which idea best matches this point: "${cleanLine(line).slice(0, 120)}"?`,
      options: [answer, ...distractors].slice(0, 4).map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`),
      answer: `A. ${answer}`,
      explanation: cleanLine(line).slice(0, 140)
    };
  });

  return JSON.stringify(quiz, null, 2);
}

function chatResponse(input: AIRequest) {
  const lines = pickLines(input, 5);
  const keywords = keywordsFrom(input, 5);

  if (!input.context) {
    return [
      "## Add a source first",
      "",
      "Upload notes, PDFs, screenshots, or a verified web source so the chat can answer from real study material.",
      "",
      "## When sources are added",
      "",
      "- I can explain the topic in simpler language.",
      "- I can turn it into a revision table or a concept diagram.",
      "- I can help with maths steps, formula comparisons, and recall checks."
    ].join("\n");
  }

  if (wantsDiagram(input.prompt)) {
    return [
      "## Visual breakdown",
      "",
      buildMermaidMap(input, keywords),
      "",
      "## What to notice",
      "",
      markdownBullets(lines)
    ].join("\n");
  }

  if (wantsTable(input.prompt) || looksLikeMaths(input.prompt, input.context)) {
    const rows = lines.slice(0, 4).map((line, index) => [
      titleCase(keywords[index] || `Point ${index + 1}`),
      line,
      `Recall ${index + 1}`
    ]);

    return [
      "## Clear answer",
      "",
      lines[0] || "Use the source material to anchor the explanation.",
      "",
      "## Revision table",
      "",
      markdownTable(["Idea", "From your material", "What to check"], rows),
      "",
      "## Maths-style check",
      "",
      "1. Identify the rule, formula, or definition being tested.",
      "2. Match it to an example from the source.",
      "3. Say why the method works before moving on."
    ].join("\n");
  }

  return [
    "## Direct answer",
    "",
    lines[0] || "Use the uploaded material as the anchor for this answer.",
    "",
    "## Key points",
    "",
    markdownBullets(lines.slice(1).length ? lines.slice(1) : lines),
    keywords.length
      ? ["", "## Focus terms", "", markdownBullets(keywords.map(titleCase))].join("\n")
      : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function examResponse(input: AIRequest) {
  const keywords = keywordsFrom(input, 6);
  const lines = pickLines(input, 6);
  const title = titleCase(
    normalizeText(input.prompt).replace(/^generate\s+/i, "").split(/\s+/).slice(0, 6).join(" ") || "Study Mock Exam"
  );

  return [
    `# ${title}`,
    "",
    "## Instructions",
    "",
    "- Answer every question.",
    "- Use the uploaded material as your main evidence base.",
    "- Show method clearly where the question expects explanation or maths reasoning.",
    "",
    "## Section A",
    "",
    ...lines.slice(0, 3).map((line, index) => `${index + 1}. ${line} (4 marks)`),
    "",
    "## Section B",
    "",
    ...keywords.slice(0, 3).map((keyword, index) => `${index + 4}. Explain ${titleCase(keyword)} in depth and apply it to a fresh example. (6 marks)`),
    "",
    "## Mark Scheme Snapshot",
    "",
    markdownTable(
      ["Question", "What earns marks"],
      lines.slice(0, 4).map((line, index) => [`Q${index + 1}`, line])
    )
  ].join("\n");
}

function conceptResponse(input: AIRequest) {
  const keywords = keywordsFrom(input, 6);
  const lines = pickLines(input, Math.max(4, keywords.length || 4));

  return [
    "## Concept map",
    "",
    buildMermaidMap(input, keywords),
    "",
    "## Anchor ideas",
    "",
    markdownTable(
      ["Concept", "Why it matters"],
      lines.slice(0, 5).map((line, index) => [titleCase(keywords[index] || `Concept ${index + 1}`), line])
    )
  ].join("\n");
}

function eli10Response(input: AIRequest) {
  const lines = pickLines(input, 3);
  return [
    "## Simple explanation",
    "",
    markdownBullets(lines.map((line) => line.replace(/\butilize\b/gi, "use").replace(/\bapproximately\b/gi, "about")))
  ].join("\n");
}

function hardModeResponse(input: AIRequest) {
  const keywords = keywordsFrom(input, 5);
  const lines = pickLines(input, 5);

  return [
    "## Exam Trap Radar",
    "",
    markdownTable(
      ["Trap", "Why students fall for it", "Correct move", "Self-check"],
      lines.map((line, index) => [
        titleCase(keywords[index] || `Trap ${index + 1}`),
        line,
        `State the accurate version of ${keywords[index] || "the idea"} in your own words.`,
        `Can you justify ${keywords[index] || "it"} without copying the notes?`
      ])
    )
  ].join("\n");
}

function studyPlanResponse(input: AIRequest) {
  const keywords = keywordsFrom(input, 7);
  const fallbackTopics = keywords.length ? keywords : ["core ideas", "definitions", "examples", "practice"];

  return [
    "## Revision plan",
    "",
    markdownTable(
      ["Day", "Focus", "Task", "Check"],
      fallbackTopics.slice(0, 7).map((topic, index) => [
        `Day ${index + 1}`,
        titleCase(topic),
        `Review ${titleCase(topic)} and turn it into one spoken explanation.`,
        "Do one quick recall check."
      ])
    )
  ].join("\n");
}

function insightsResponse(input: AIRequest) {
  const keywords = keywordsFrom(input, 5);
  const lines = pickLines(input, 3);

  return [
    "## Review first",
    "",
    markdownBullets(keywords.map(titleCase)),
    "",
    "## Next actions",
    "",
    markdownBullets(lines)
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
    case "exam":
      return examResponse(input);
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
