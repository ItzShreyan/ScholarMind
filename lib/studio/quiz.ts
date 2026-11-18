/**
 * Turning a model's quiz or flashcard output into something markable.
 *
 * Two parsers exist for each, deliberately. The JSON path is the contract the
 * prompt asks for; the prose path is the reality when a model ignores the
 * contract. Both are kept because a quiz that renders as raw JSON is worse
 * than a quiz recovered from `Front:` / `Back:` lines.
 *
 * The normalisers matter more than the parsers: a quiz is only usable if the
 * stored answer matches one of the options exactly, because that is what the
 * marking code compares. `normalizeQuizAnswer` exists to guarantee it.
 */

import type { FlashcardItem, QuizItem } from "@/lib/studio/types";
import { cleanGeneratedText, clipText, normalizeLine } from "@/lib/studio/text";

/**
 * Strip source metadata a model sometimes pastes into a card.
 *
 * A flashcard reading "Source URL: https://…" teaches nothing, and the trust
 * label is an internal concept the student never asked to memorise.
 */
export function cleanCardText(text: string): string {
  return cleanGeneratedText(text)
    .replace(/^question:\s*/i, "")
    .replace(/^source:\s*[^\n]+/gim, "")
    .replace(/^source title:\s*[^\n]+/gim, "")
    .replace(/^source url:\s*[^\n]+/gim, "")
    .replace(/^summary:\s*[^\n]+/gim, "")
    .replace(/^trust:\s*[^\n]+/gim, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clip every card to a size that actually fits on a card. */
export function normalizeFlashcards(items: FlashcardItem[] | null): FlashcardItem[] | null {
  if (!items?.length) return null;

  const normalized = items
    .map((item, index) => {
      const front = clipText(cleanCardText(item.front || `Flashcard ${index + 1}`), 96);
      const back = clipText(cleanCardText(item.back || ""), 220);
      return {
        front: front || `Flashcard ${index + 1}`,
        back: back || "Review the uploaded sources and try generating this flashcard again."
      };
    })
    .filter((item) => item.front || item.back);

  return normalized.length ? normalized : null;
}

/** Recover flashcards from `Front:` / `Back:` prose. */
export function parseFlashcardsFallback(text: string): FlashcardItem[] | null {
  const cleaned = cleanGeneratedText(text);
  const matches = Array.from(
    cleaned.matchAll(/(?:Flashcard\s*\d+)?\s*Front:\s*([\s\S]+?)\s*Back:\s*([\s\S]+?)(?=(?:Flashcard\s*\d+)?\s*Front:|$)/gi)
  );

  if (!matches.length) return null;

  return matches.map((match) => ({
    front: cleanCardText(match[1]),
    back: cleanCardText(match[2])
  }));
}

/**
 * Make the answer match an option exactly.
 *
 * Models usually answer "A" or "A. Mitochondria" while storing the full option
 * text. Marking compares strings, so the letter has to be resolved to the
 * option it names — otherwise a correct answer is scored wrong.
 */
export function normalizeQuizAnswer(answer: string | undefined, options: string[]): string {
  const rawAnswer = cleanCardText(answer || "");
  if (!rawAnswer) return "";

  const letterMatch = rawAnswer.match(/^[A-D]/i)?.[0]?.toUpperCase();
  if (!letterMatch) return rawAnswer;

  return options.find((option) => option.trim().toUpperCase().startsWith(letterMatch)) || rawAnswer;
}

export function normalizeQuizItems(items: QuizItem[] | null): QuizItem[] | null {
  if (!items?.length) return null;

  const normalized = items
    .map((item) => {
      const options = (item.options ?? []).map((option) => cleanCardText(option)).filter(Boolean).slice(0, 4);
      return {
        question: clipText(cleanCardText(item.question || ""), 220),
        options,
        answer: normalizeQuizAnswer(item.answer, options),
        explanation: clipText(cleanCardText(item.explanation || ""), 220)
      };
    })
    .filter((item) => item.question);

  return normalized.length ? normalized : null;
}

/**
 * Recover a quiz from numbered prose.
 *
 * Blocks are split on blank lines because that is how every model separates
 * questions when it ignores the JSON instruction. Each line is then classified
 * by its marker, and anything unclassified becomes the question or its
 * explanation — never a dropped line.
 */
export function parseQuizFallback(text: string): QuizItem[] | null {
  const cleaned = cleanGeneratedText(text);
  const blocks = cleaned
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  const questions: QuizItem[] = [];
  let current: QuizItem | null = null;

  const pushCurrent = () => {
    if (!current?.question) return;
    questions.push({
      question: current.question,
      options: current.options?.filter(Boolean) ?? [],
      answer: current.answer,
      explanation: current.explanation
    });
  };

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const hasQuestion = lines.some((line) => /^(question\s*\d+|q\d+|\d+[.)])/i.test(line));
    if (hasQuestion) {
      pushCurrent();
      current = { question: "", options: [] };
    }

    for (const line of lines) {
      if (!current) {
        current = { question: "", options: [] };
      }

      if (/^(question\s*\d+|q\d+|\d+[.)])/i.test(line)) {
        current.question = cleanCardText(line.replace(/^(question\s*\d+|q\d+|\d+[.)])[:.)-\s]*/i, ""));
        continue;
      }

      if (/^[A-D][.)-]/i.test(line)) {
        current.options = [...(current.options ?? []), cleanCardText(line)];
        continue;
      }

      if (/^answer:/i.test(line)) {
        current.answer = cleanCardText(line.replace(/^answer:/i, ""));
        continue;
      }

      if (/^explanation:/i.test(line)) {
        current.explanation = cleanCardText(line.replace(/^explanation:/i, ""));
        continue;
      }

      if (!current.question) {
        current.question = cleanCardText(line);
      } else if (!current.explanation) {
        current.explanation = cleanCardText(line);
      }
    }
  }

  pushCurrent();
  return questions.length ? questions : null;
}

/**
 * Break a generated answer into titled cards.
 *
 * A study plan is keyed from `Day …` lines; everything else is keyed from
 * whatever precedes the first colon, and falls back to a numbered title when
 * the model wrote plain sentences. `normalizeLine` is imported so a bullet or
 * number marker never becomes part of the title.
 */
export function parseOutputCards(
  text: string,
  action: "summary" | "notes" | "hard_mode" | "study_plan" | "concepts" | "insights" | "quiz" | "flashcards" | "exam"
): Array<{ title: string; body: string }> {
  const cleaned = cleanGeneratedText(text);
  if (!cleaned) return [];

  const lines = cleaned
    .split(/\n+/)
    .map(normalizeLine)
    .filter(Boolean);

  if (!lines.length) return [];

  if (action === "study_plan") {
    return lines.map((line, index) => {
      const [title, ...rest] = line.split(/:\s+/);
      if (/^day\b/i.test(title) && rest.length) {
        return { title, body: rest.join(": ") };
      }
      return { title: `Step ${index + 1}`, body: line };
    });
  }

  return lines.map((line, index) => {
    const [title, ...rest] = line.split(/:\s+/);
    if (rest.length && title.length < 42) {
      return { title, body: rest.join(": ") };
    }

    return {
      title:
        action === "hard_mode"
          ? `Challenge ${index + 1}`
          : action === "concepts"
            ? `Concept ${index + 1}`
            : action === "summary"
              ? `Key Point ${index + 1}`
              : `Study Note ${index + 1}`,
      body: line
    };
  });
}
