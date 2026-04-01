import { AIProvider } from "@/lib/ai/types";
import { AIRequest } from "@/types";

type SourceBlock = {
  label: string;
  text: string;
};

type EvidenceLine = {
  source: string;
  sentence: string;
  score: number;
};

type DefinitionPair = {
  term: string;
  detail: string;
  source: string;
};

const stopWords = new Set([
  "a",
  "about",
  "after",
  "again",
  "all",
  "along",
  "already",
  "also",
  "an",
  "and",
  "any",
  "are",
  "around",
  "back",
  "because",
  "been",
  "before",
  "being",
  "below",
  "between",
  "both",
  "but",
  "can",
  "chapter",
  "could",
  "definitions",
  "either",
  "example",
  "examples",
  "file",
  "files",
  "first",
  "focus",
  "for",
  "from",
  "general",
  "guide",
  "have",
  "help",
  "here",
  "important",
  "into",
  "its",
  "just",
  "like",
  "make",
  "many",
  "material",
  "means",
  "might",
  "more",
  "most",
  "name",
  "notes",
  "number",
  "onto",
  "only",
  "other",
  "our",
  "over",
  "page",
  "paper",
  "part",
  "prompt",
  "question",
  "questions",
  "same",
  "section",
  "should",
  "some",
  "source",
  "sources",
  "study",
  "summary",
  "than",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "those",
  "topic",
  "trust",
  "under",
  "uploaded",
  "url",
  "use",
  "what",
  "when",
  "where",
  "which",
  "with",
  "within",
  "would",
  "your"
]);

const genericTerms = new Set([
  "answer",
  "article",
  "concept",
  "content",
  "definition",
  "definitions",
  "example",
  "examples",
  "explanation",
  "file",
  "idea",
  "information",
  "material",
  "notes",
  "paper",
  "point",
  "question",
  "section",
  "source",
  "sources",
  "study",
  "summary",
  "text",
  "topic",
  "type",
  "types",
  "web"
]);

function normalizeText(text?: string) {
  return (text || "")
    .replace(/\u0000/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanInlineText(text: string) {
  return normalizeText(
    text
      .replace(/\|/g, " / ")
      .replace(/\s+/g, " ")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\((?:https?:\/\/|www\.)[^)]*\)/gi, " ")
      .replace(/https?:\/\/\S+/gi, " ")
  );
}

function sanitizeContext(text?: string) {
  return normalizeText(
    (text || "")
      .replace(/^source:\s*[^\n]+$/gim, " ")
      .replace(/^source title:\s*[^\n]+$/gim, " ")
      .replace(/^source url:\s*[^\n]+$/gim, " ")
      .replace(/^summary:\s*[^\n]+$/gim, " ")
      .replace(/^trust:\s*[^\n]+$/gim, " ")
      .replace(/^title:\s*[^\n]+$/gim, " ")
      .replace(/^description:\s*[^\n]+$/gim, " ")
      .replace(/^url source:\s*[^\n]+$/gim, " ")
      .replace(/^markdown content:\s*$/gim, " ")
      .replace(/\b[\w-]+\.(pdf|docx|txt|png|jpe?g|xlsx?|csv|md)\b/gi, " ")
      .replace(/https?:\/\/\S+/gi, " ")
  );
}

function splitSentences(text: string) {
  return sanitizeContext(text)
    .split(/\n+/)
    .flatMap((line) => {
      const cleaned = line.replace(/^[-*]\s+/, "").trim();
      if (!cleaned) return [];
      if (/^\|.*\|$/.test(cleaned)) return [];
      if (/^(question|q)\s*\d+/i.test(cleaned) || /^\d+[.)]/.test(cleaned)) {
        return [cleaned];
      }

      return cleaned.match(/[^.!?\n]+(?:[.!?]+|$)/g) ?? [cleaned];
    })
    .map((sentence) => cleanInlineText(sentence))
    .filter(Boolean);
}

function parseSourceBlocks(text?: string): SourceBlock[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  if (!/^Source:\s/im.test(normalized)) {
    const body = sanitizeContext(normalized);
    return body ? [{ label: "Uploaded source", text: body }] : [];
  }

  return normalized
    .split(/\n(?=Source:\s*)/g)
    .map((block) => {
      const [header, ...rest] = block.split("\n");
      const label = cleanInlineText(header.replace(/^Source:\s*/i, "")) || "Uploaded source";
      const body = sanitizeContext(rest.join("\n"));

      if (!body) {
        return null;
      }

      return {
        label,
        text: body
      };
    })
    .filter((block): block is SourceBlock => Boolean(block));
}

function queryTerms(text: string) {
  return (sanitizeContext(text).toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? []).filter((word) => !stopWords.has(word));
}

function extractQuestionRefs(text: string) {
  const refs = new Set<string>();

  for (const match of text.matchAll(/\b(?:question|q)\s*(\d{1,2}[a-z]?)\b/gi)) {
    refs.add(match[1].toLowerCase());
  }

  return [...refs];
}

function trimSentence(text: string, limit = 220) {
  const cleaned = cleanInlineText(text)
    .replace(/^answer:\s*/i, "")
    .replace(/^explanation:\s*/i, "")
    .trim();

  return cleaned.length > limit ? `${cleaned.slice(0, limit).trim()}...` : cleaned;
}

function trimTerm(term: string) {
  return cleanInlineText(term)
    .replace(/^[Tt]he\s+/, "")
    .replace(/^[Aa]n?\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulTerm(term: string) {
  const normalized = trimTerm(term);
  if (!normalized || normalized.length < 3 || normalized.length > 60) return false;
  if (/\.(pdf|docx|txt|png|jpe?g|xlsx?|csv|md)$/i.test(normalized)) return false;

  const words = normalized.toLowerCase().match(/[a-z][a-z0-9-]{1,}/g) ?? [];
  if (!words.length || words.length > 6) return false;

  const contentWords = words.filter((word) => !stopWords.has(word) && !genericTerms.has(word));
  if (!contentWords.length) return false;

  return !genericTerms.has(normalized.toLowerCase());
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .map((word) => {
      if (/^[A-Z0-9-]{2,6}$/.test(word)) return word;
      if (/^gcse$/i.test(word)) return "GCSE";
      if (/^alevel$/i.test(word)) return "A-Level";
      if (/^a-level$/i.test(word)) return "A-Level";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function cleanLine(line: string) {
  return trimSentence(line, 260);
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

function sentenceMatchesQuestionRef(sentence: string, ref: string) {
  const escaped = ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b(?:question|q)\\s*${escaped}\\b|\\b${escaped}[.)]\\b`, "i").test(sentence);
}

function scoreSentence(sentence: string, promptTerms: string[], questionRefs: string[], prompt: string) {
  const normalized = sentence.toLowerCase();
  let score = 0;

  promptTerms.forEach((term) => {
    if (normalized.includes(term)) score += 3;
    if (new RegExp(`\\b${term}\\b`, "i").test(sentence)) score += 1;
  });

  questionRefs.forEach((ref) => {
    if (sentenceMatchesQuestionRef(sentence, ref)) score += 8;
  });

  if (/\b(is|means|refers to|because|therefore|for example|for instance)\b/i.test(sentence)) score += 2;
  if (sentence.length >= 28 && sentence.length <= 240) score += 1;
  if (/[:=]/.test(sentence)) score += 1;
  if (looksLikeMaths(prompt) && /[=+\-/*^]|\d/.test(sentence)) score += 2;
  if (/^(page|chapter|section)\b/i.test(sentence)) score -= 1;

  return score;
}

function pickEvidence(input: AIRequest, limit: number) {
  const blocks = parseSourceBlocks(input.context || input.prompt);
  if (!blocks.length) return [];

  const promptTerms = queryTerms(input.prompt);
  const questionRefs = extractQuestionRefs(input.prompt);
  const seen = new Set<string>();

  const candidates = blocks.flatMap((block) =>
    splitSentences(block.text).map((sentence) => ({
      source: block.label,
      sentence,
      score: scoreSentence(sentence, promptTerms, questionRefs, input.prompt)
    }))
  );

  const prioritized = [...candidates]
    .sort((a, b) => b.score - a.score || a.sentence.length - b.sentence.length)
    .filter((item) => {
      const key = item.sentence.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const refMatches = questionRefs.length
    ? prioritized.filter((item) => questionRefs.some((ref) => sentenceMatchesQuestionRef(item.sentence, ref)))
    : [];

  const ordered = refMatches.length
    ? [...refMatches, ...prioritized.filter((item) => !refMatches.includes(item))]
    : prioritized;

  return ordered.slice(0, limit);
}

function extractDefinitionPairs(input: AIRequest, limit: number) {
  const blocks = parseSourceBlocks(input.context || input.prompt);
  const pairs: DefinitionPair[] = [];
  const seen = new Set<string>();

  const patterns = [
    /^([A-Za-z][A-Za-z0-9 ()/+,-]{2,60}?)\s*(?:is|are|means|refers to|can be defined as)\s+(.{18,240})$/i,
    /^([A-Za-z][A-Za-z0-9 ()/+,-]{2,60}?)\s*[:=-]\s+(.{18,240})$/i
  ];

  for (const block of blocks) {
    for (const sentence of splitSentences(block.text)) {
      for (const pattern of patterns) {
        const match = sentence.match(pattern);
        if (!match) continue;

        const term = trimTerm(match[1]);
        const detail = trimSentence(match[2], 220);

        if (!isUsefulTerm(term) || detail.length < 18) continue;

        const key = term.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        pairs.push({
          term: titleCase(term),
          detail,
          source: block.label
        });

        if (pairs.length >= limit) {
          return pairs;
        }
      }
    }
  }

  return pairs;
}

function keywordsFrom(input: AIRequest, limit: number) {
  const terms = extractDefinitionPairs(input, limit * 2).map((pair) => pair.term);
  const rankedTerms: string[] = [];

  terms.forEach((term) => {
    if (!rankedTerms.includes(term)) rankedTerms.push(term);
  });

  const counts = new Map<string, number>();
  const words = sanitizeContext(`${input.context || ""} ${input.prompt || ""}`)
    .toLowerCase()
    .match(/[a-z][a-z0-9-]{2,}/g) ?? [];

  words.forEach((word) => {
    if (stopWords.has(word) || genericTerms.has(word)) return;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  });

  [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([word]) => {
      const term = titleCase(word);
      if (!rankedTerms.includes(term)) {
        rankedTerms.push(term);
      }
    });

  return rankedTerms.slice(0, limit);
}

function buildMermaidMap(input: AIRequest, keywords: string[]) {
  const root = keywords[0] || titleCase(input.prompt.split(/\s+/).slice(0, 3).join(" ") || "Topic");
  const nodes = keywords.slice(1, 6);

  if (!nodes.length) {
    return "";
  }

  return [
    "```mermaid",
    "graph TD",
    `  root[${cleanLine(root)}]`,
    ...nodes.map((keyword, index) => `  root --> node${index}[${cleanLine(keyword)}]`),
    "```"
  ].join("\n");
}

function questionCountFromPrompt(prompt: string, fallback: number) {
  const match = prompt.match(/\b(\d{1,2})\s+(?:flashcards?|questions?|points?|days?)\b/i);
  if (!match) return fallback;
  return Math.max(4, Math.min(Number(match[1]), 18));
}

function examQuestionCount(prompt: string) {
  const explicit = prompt.match(/\b(\d{1,2})\s+(?:question|questions)\b/i);
  if (!explicit) return 16;
  return Math.max(12, Math.min(Number(explicit[1]), 24));
}

function buildOptions(correct: string, distractors: string[], index: number) {
  const labels = ["A", "B", "C", "D"];
  const unique = [correct, ...distractors].filter((item, itemIndex, array) => item && array.indexOf(item) === itemIndex);
  const options = unique.slice(0, 4);

  while (options.length < 4) {
    options.push(`Option ${options.length + 1}`);
  }

  const correctIndex = index % 4;
  const arranged = [...options];
  const correctPosition = arranged.indexOf(correct);

  if (correctPosition !== -1 && correctPosition !== correctIndex) {
    [arranged[correctPosition], arranged[correctIndex]] = [arranged[correctIndex], arranged[correctPosition]];
  }

  return {
    options: arranged.map((option, optionIndex) => `${labels[optionIndex]}. ${option}`),
    answer: `${labels[correctIndex]}. ${correct}`
  };
}

function buildSourceBullets(evidence: EvidenceLine[], limit: number) {
  return evidence.slice(0, limit).map((item) => `**${item.source}:** ${cleanLine(item.sentence)}`);
}

function summaryResponse(input: AIRequest) {
  const evidence = pickEvidence(input, 6);
  if (!evidence.length) {
    return [
      "## Fast Summary",
      "",
      "- Upload clearer source material first so the summary can lock onto real content."
    ].join("\n");
  }

  return ["## Fast Summary", "", markdownBullets(evidence.slice(0, 5).map((item) => item.sentence))].join("\n");
}

function flashcardResponse(input: AIRequest) {
  const count = questionCountFromPrompt(input.prompt, 8);
  const definitionPairs = extractDefinitionPairs(input, count + 4);
  const evidence = pickEvidence(input, count + 4);
  const keywords = keywordsFrom(input, count + 4);

  const cards = (definitionPairs.length
    ? definitionPairs.map((pair) => ({
        front: trimSentence(pair.term, 42),
        back: trimSentence(pair.detail, 180)
      }))
    : evidence.map((item, index) => ({
        front: trimSentence(keywords[index] || `Key idea ${index + 1}`, 42),
        back: trimSentence(item.sentence, 180)
      })))
    .filter((card) => isUsefulTerm(card.front) || /^Key idea/i.test(card.front))
    .filter((card, index, array) => array.findIndex((item) => item.front === card.front) === index)
    .slice(0, count);

  return JSON.stringify(cards.length ? cards : [{ front: "Review point", back: "Upload clearer source text, then try again." }], null, 2);
}

function quizResponse(input: AIRequest) {
  const count = questionCountFromPrompt(input.prompt, 6);
  const definitionPairs = extractDefinitionPairs(input, count + 6);
  const evidence = pickEvidence(input, count + 6);
  const keywords = keywordsFrom(input, count + 6);

  const quiz = (definitionPairs.length >= 4
    ? definitionPairs.slice(0, count).map((pair, index) => {
        const distractors = definitionPairs
          .map((item) => item.term)
          .filter((term) => term !== pair.term)
          .slice(0, 6);
        const optionSet = buildOptions(pair.term, distractors, index);

        return {
          question: `Which term from the uploaded material best matches this description? "${trimSentence(pair.detail, 150)}"`,
          options: optionSet.options,
          answer: optionSet.answer,
          explanation: `${trimSentence(pair.detail, 160)} From ${pair.source}.`
        };
      })
    : evidence.slice(0, count).map((item, index) => {
        const correct = keywords[index] || `Key idea ${index + 1}`;
        const distractors = keywords.filter((keyword) => keyword !== correct).slice(0, 6);
        const optionSet = buildOptions(correct, distractors, index);

        return {
          question: `According to the uploaded sources, which focus term best fits this point? "${trimSentence(item.sentence, 140)}"`,
          options: optionSet.options,
          answer: optionSet.answer,
          explanation: `The relevant evidence comes from ${item.source}: ${trimSentence(item.sentence, 150)}`
        };
      }))
    .filter((item) => item.question && item.options.length === 4);

  return JSON.stringify(quiz.length ? quiz : [], null, 2);
}

function chatResponse(input: AIRequest) {
  const evidence = pickEvidence(input, 6);
  const keywords = keywordsFrom(input, 6);
  const questionRefs = extractQuestionRefs(input.prompt);

  if (!input.context) {
    return [
      "## Upload a source first",
      "",
      "Upload notes, PDFs, screenshots, or a trusted web source so the chat can answer from real study material.",
      "",
      "## Once a source is added",
      "",
      "- I can explain the topic in simpler language.",
      "- I can turn the material into revision tables and quick diagrams.",
      "- I can help with maths reasoning, formula checks, and exam-style prompts."
    ].join("\n");
  }

  if (!evidence.length) {
    return [
      "## Direct answer",
      "",
      "I could not find a clean enough match in the extracted source text. Try a more specific question or reupload a clearer source."
    ].join("\n");
  }

  const directAnswer = questionRefs.length && evidence[0]
    ? `Question focus: ${trimSentence(evidence[0].sentence, 200)}`
    : trimSentence(evidence[0].sentence, 220);

  if (wantsDiagram(input.prompt)) {
    return [
      "## Visual breakdown",
      "",
      buildMermaidMap(input, keywords),
      "",
      "## Grounded points",
      "",
      markdownBullets(buildSourceBullets(evidence, 4))
    ].join("\n");
  }

  if (wantsTable(input.prompt) || looksLikeMaths(input.prompt, input.context)) {
    const rows = evidence.slice(0, 4).map((item, index) => [
      titleCase(keywords[index] || `Point ${index + 1}`),
      item.source,
      item.sentence,
      looksLikeMaths(input.prompt, input.context)
        ? "State the rule, then show the method."
        : "Turn this into a one-line recall answer."
    ]);

    return [
      "## Clear answer",
      "",
      directAnswer,
      "",
      "## Revision table",
      "",
      markdownTable(["Focus", "Source", "Evidence", "What to do next"], rows),
      "",
      looksLikeMaths(input.prompt, input.context)
        ? [
            "## Maths check",
            "",
            "1. Name the rule, formula, or theorem before you calculate.",
            "2. Show one clear line of working for each step.",
            "3. Check signs, units, rounding, and whether the final answer makes sense."
          ].join("\n")
        : [
            "## Next move",
            "",
            "- Turn the table into one spoken explanation.",
            "- Quiz yourself on the source-backed points before moving on."
          ].join("\n")
    ].join("\n");
  }

  return [
    "## Direct answer",
    "",
    directAnswer,
    "",
    "## Evidence from your sources",
    "",
    markdownBullets(buildSourceBullets(evidence, 4)),
    keywords.length
      ? ["", "## Focus terms", "", markdownBullets(keywords.slice(0, 5).map(titleCase))].join("\n")
      : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function buildExamPrompt(term: string, index: number, isMaths: boolean) {
  const verbs = isMaths
    ? ["State", "Work out", "Explain", "Show", "Compare", "Justify"]
    : ["Define", "Explain", "Describe", "Compare", "Analyse", "Evaluate"];

  return `${verbs[index % verbs.length]} ${term}.`;
}

function examResponse(input: AIRequest) {
  const keywords = keywordsFrom(input, 14);
  const evidence = pickEvidence(input, 18);
  const definitions = extractDefinitionPairs(input, 10);
  const isMaths = looksLikeMaths(input.prompt, input.context);
  const totalQuestions = examQuestionCount(input.prompt);
  const title = titleCase(
    normalizeText(input.prompt)
      .replace(/^generate\s+/i, "")
      .replace(/\bmock exam\b/i, "")
      .split(/\s+/)
      .slice(0, 7)
      .join(" ") || "Source-Based Mock Exam"
  );

  const shortQuestions = Array.from({ length: Math.min(8, totalQuestions) }, (_, index) => {
    const pair = definitions[index];
    const fallbackTerm = keywords[index] || `Core idea ${index + 1}`;
    const stem = pair ? `${index + 1}. ${buildExamPrompt(pair.term, index, isMaths)}` : `${index + 1}. ${buildExamPrompt(fallbackTerm, index, isMaths)}`;
    const marks = isMaths ? 3 : 2 + (index % 2);
    return `${stem} (${marks} marks)`;
  });

  const mediumQuestionCount = Math.min(6, Math.max(4, totalQuestions - shortQuestions.length - 2));
  const mediumQuestions = Array.from({ length: mediumQuestionCount }, (_, index) => {
    const keyword = keywords[index + 2] || `Topic ${index + 1}`;
    const evidenceLine = evidence[index + 2]?.sentence || `the most important point about ${keyword}`;
    return `${shortQuestions.length + index + 1}. Using the source material, explain why ${keyword} matters. Refer to this idea where helpful: "${trimSentence(
      evidenceLine,
      120
    )}". (${isMaths ? 6 : 5} marks)`;
  });

  const longQuestionCount = Math.max(2, totalQuestions - shortQuestions.length - mediumQuestions.length);
  const longQuestions = Array.from({ length: longQuestionCount }, (_, index) => {
    const keyword = keywords[index + 6] || `the wider topic`;
    return `${
      shortQuestions.length + mediumQuestions.length + index + 1
    }. Write an extended response on ${keyword}. Build your answer from linked evidence across the uploaded sources${
      isMaths ? ", including method and reasoning" : ""
    }. (${isMaths ? 10 : 8 + index * 2} marks)`;
  });

  const markSchemeRows = [...shortQuestions, ...mediumQuestions, ...longQuestions].map((question, index) => {
    const focus = definitions[index]?.term || keywords[index] || `Q${index + 1} focus`;
    const descriptor = isMaths
      ? "Accurate method, correct reasoning, and a checked final answer."
      : "Accurate knowledge, source-linked evidence, and a clear explanation.";
    return [`Q${index + 1}`, focus, descriptor];
  });

  return [
    `# ${title || "Source-Based Mock Exam"}`,
    "",
    "## Instructions",
    "",
    "- Answer every question.",
    "- Use only the uploaded sources as your evidence base.",
    isMaths ? "- Show full working and justify each step." : "- Support longer responses with precise source detail.",
    "",
    "## Section A: Core recall",
    "",
    ...shortQuestions,
    "",
    "## Section B: Applied understanding",
    "",
    ...mediumQuestions,
    "",
    "## Section C: Extended responses",
    "",
    ...longQuestions,
    "",
    "## Mark Scheme Snapshot",
    "",
    markdownTable(["Question", "Focus", "What earns marks"], markSchemeRows)
  ].join("\n");
}

function conceptResponse(input: AIRequest) {
  const keywords = keywordsFrom(input, 6);
  const evidence = pickEvidence(input, 5);

  return [
    "## Concept map",
    "",
    buildMermaidMap(input, keywords),
    "",
    "## Anchor ideas",
    "",
    markdownTable(
      ["Concept", "Why it matters", "Source"],
      evidence.slice(0, 5).map((item, index) => [titleCase(keywords[index] || `Concept ${index + 1}`), item.sentence, item.source])
    )
  ].join("\n");
}

function hardModeResponse(input: AIRequest) {
  const evidence = pickEvidence(input, 5);
  const keywords = keywordsFrom(input, 5);

  return [
    "## Exam Trap Radar",
    "",
    markdownTable(
      ["Trap", "Why students miss it", "Correct move", "Self-check"],
      evidence.slice(0, 5).map((item, index) => [
        titleCase(keywords[index] || `Trap ${index + 1}`),
        item.sentence,
        `Restate ${keywords[index] || "the idea"} accurately and give one clean example.`,
        `Can you explain it without copying ${item.source}?`
      ])
    )
  ].join("\n");
}

function studyPlanResponse(input: AIRequest) {
  const keywords = keywordsFrom(input, 7);
  const evidence = pickEvidence(input, 7);
  const topics = keywords.length ? keywords : evidence.map((item, index) => `Focus ${index + 1}`);

  return [
    "## Revision plan",
    "",
    markdownTable(
      ["Day", "Focus", "Task", "Check"],
      topics.slice(0, 7).map((topic, index) => [
        `Day ${index + 1}`,
        titleCase(topic),
        `Review ${titleCase(topic)}, then rewrite the key point from your source in one sentence.`,
        evidence[index] ? `Can you recall the point from ${evidence[index].source}?` : "Do one active recall check."
      ])
    )
  ].join("\n");
}

function insightsResponse(input: AIRequest) {
  const evidence = pickEvidence(input, 4);
  const keywords = keywordsFrom(input, 5);

  return [
    "## Review first",
    "",
    markdownBullets(keywords.map(titleCase).slice(0, 5)),
    "",
    "## Next actions",
    "",
    markdownBullets(
      evidence.map(
        (item, index) =>
          `Revisit ${titleCase(keywords[index] || `focus ${index + 1}`)} using ${item.source}, then test yourself on: ${item.sentence}`
      )
    )
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
