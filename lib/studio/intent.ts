/**
 * Reading intent out of what the student typed.
 *
 * These run before a request goes out, so they decide whether a chat turn
 * becomes a tool run, whether a URL is worth fetching, and whether the
 * selected text is a canvas request. Being conservative matters more than
 * being clever: a wrong "yes" spends a tool credit the student did not ask to
 * spend.
 */

import type { AIAction } from "@/lib/studio/types";

/** "hi", "thanks", "how are you" — not a study question. */
export function isTutorSmallTalk(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return (
    /^(hi|hey|hello|yo|hiya|good morning|good afternoon|good evening)\b/.test(normalized) ||
    /how are you( doing)?/i.test(normalized) ||
    /what'?s up/i.test(normalized)
  );
}

/**
 * Does this message ask for a generated artefact rather than an explanation?
 *
 * The verb check comes first so "what is a flashcard?" stays a chat question;
 * only an explicit make/build/generate turns it into a tool run.
 */
export function detectChatToolRequest(text: string): AIAction | null {
  const normalized = text.toLowerCase();
  if (!/\b(make|build|create|generate|turn|give me)\b/.test(normalized)) return null;
  if (/\bflashcards?\b/.test(normalized)) return "flashcards";
  if (/\bquiz\b|\bmcq\b|\bmultiple[- ]choice\b/.test(normalized)) return "quiz";
  if (/\bexam\b|\bmock paper\b|\btest paper\b/.test(normalized)) return "exam";
  if (/\b(ai notes|long notes|textbook notes|study notes|detailed notes)\b/.test(normalized)) return "notes";
  if (/\bsummary\b|\bsummarise\b|\bsummarize\b/.test(normalized)) return "summary";
  return null;
}

export function extractUrlFromText(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s)]+/i);
  return match?.[0]?.replace(/[.,;]+$/, "") || null;
}

/**
 * The URL of an imported source.
 *
 * Imported web sources carry a `Source URL:` label, which is more reliable
 * than finding the first URL in the text — the snippet may quote one that is
 * not the source itself.
 */
export function extractWebUrlFromSourceText(text: string): string | null {
  const labeled = text.match(/Source URL:\s*(https?:\/\/[^\s]+)/i);
  if (labeled?.[1]) return labeled[1].trim();
  return extractUrlFromText(text);
}

/** Did the student ask for the selected passage to be marked up? */
export function detectCanvasAssistRequest(text: string): "highlight" | "text" | null {
  const lower = text.toLowerCase();
  if (!/\b(highlight|annotate|annotation|mark up|markup|text box|add a note|mark this)\b/.test(lower)) {
    return null;
  }
  if (/\bhighlight\b/.test(lower)) return "highlight";
  return "text";
}
