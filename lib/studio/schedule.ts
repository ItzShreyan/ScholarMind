/**
 * Reading a revision schedule or an exam paper back out of markdown.
 *
 * Both come from a prompt that asks for a markdown table, and both have to
 * survive the model answering in prose instead. The table path is preferred
 * because it preserves the columns the student actually asked for; the prose
 * path is the fallback and produces the same shape so the UI does not need to
 * know which one it got.
 */

import type { ExamQuestion, RevisionScheduleItem } from "@/lib/studio/types";
import { parseOutputCards } from "@/lib/studio/quiz";
import { cleanGeneratedText } from "@/lib/studio/text";

/**
 * Rows of the first markdown table in a piece of text.
 *
 * Returns the raw cells including the header and the `---` divider, because
 * the two callers below need to read the header to know which column is which.
 */
export function parseMarkdownTableRows(text: string): string[][] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));

  if (lines.length < 3) return [];

  const rows = lines
    .map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));

  if (rows.length < 3) return [];
  return rows;
}

/**
 * A revision schedule from a `Day | Focus | Task | Check` table.
 *
 * Column positions are read from the header rather than assumed, because a
 * model will happily return `Week | Topic | Activity | Self-check` and the
 * previous fixed indices silently mapped the wrong column into `focus`.
 */
export function parseRevisionSchedule(text: string): RevisionScheduleItem[] {
  const rows = parseMarkdownTableRows(text);

  if (rows.length) {
    const [header, divider, ...body] = rows;
    const normalizedHeader = header.map((cell) => cell.toLowerCase());
    if (divider.every((cell) => /^:?-{3,}:?$/.test(cell))) {
      const dayIndex = normalizedHeader.findIndex((cell) => cell.includes("day") || cell.includes("week"));
      const focusIndex = normalizedHeader.findIndex((cell) => cell.includes("focus"));
      const taskIndex = normalizedHeader.findIndex((cell) => cell.includes("task") || cell.includes("study"));
      const checkIndex = normalizedHeader.findIndex((cell) => cell.includes("check"));

      if (dayIndex >= 0 && focusIndex >= 0) {
        return body.map((row, rowIndex) => ({
          day: row[dayIndex] || `Day ${rowIndex + 1}`,
          focus: row[focusIndex] || "Focus",
          task: row[taskIndex] || row[focusIndex] || "",
          check: row[checkIndex] || "Do a quick recall check."
        }));
      }
    }
  }

  return parseOutputCards(text, "study_plan").map((card, index) => ({
    day: /^day|^week/i.test(card.title) ? card.title : `Day ${index + 1}`,
    focus: card.title,
    task: card.body,
    check: "Summarise it aloud and self-test."
  }));
}

/**
 * Split an exam paper into numbered questions.
 *
 * The mark scheme is cut off first: it shares the numbering style, so leaving
 * it in would produce "questions" that are really answers. The mark allocation
 * is lifted out of the prompt body and kept alongside it rather than dropped,
 * because the student needs to know what a question is worth.
 */
export function parseExamQuestions(text: string): ExamQuestion[] {
  const cleaned = cleanGeneratedText(text);
  if (!cleaned) return [];

  const questionOnlySection = cleaned
    .split(/\n#{1,6}\s*mark scheme\b/i)[0]
    .split(/\nmark scheme\b/i)[0]
    .trim();

  const matches = Array.from(
    questionOnlySection.matchAll(
      /(?:^|\n)(?:question\s*)?(\d+[a-z]?)[.)]\s+([\s\S]*?)(?=(?:\n(?:question\s*)?\d+[a-z]?[.)]\s)|(?:\n#{1,6}\s)|$)/gim
    )
  );

  return matches
    .map((match) => {
      const prompt = match[2].trim().replace(/\n{3,}/g, "\n\n");
      const marksMatch = prompt.match(/(\d+\s*(?:marks?|pts?))/i);
      return {
        number: match[1],
        prompt: prompt.replace(/\((\d+\s*(?:marks?|pts?))\)/i, "").trim(),
        marks: marksMatch?.[1] || ""
      };
    })
    .filter((item) => item.prompt);
}
