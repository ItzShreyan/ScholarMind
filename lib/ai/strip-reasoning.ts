/**
 * Strip model chain-of-thought / planning text and extract student-facing payloads.
 */

const reasoningLeadPatterns = [
  /^[\s\S]*?(?=\[\s*\{)/,
  /^[\s\S]*?(?=\{\s*"(?:title|sections|front|question)":)/i,
  /^[\s\S]*?(?=```json)/i,
  /^[\s\S]*?(?=(?:^|\n)#+\s)/m
];

const reasoningMarkers =
  /\b(we need to produce|let's craft|let us craft|i will (?:now )?generate|based on uploaded sources|however we only have|constraints:|return only json)\b/i;

export function stripReasoningPreamble(text: string): string {
  let cleaned = (text || "").trim();
  if (!cleaned) return "";

  for (const pattern of reasoningLeadPatterns) {
    const next = cleaned.replace(pattern, "").trim();
    if (next && next.length < cleaned.length) {
      cleaned = next;
      break;
    }
  }

  if (reasoningMarkers.test(cleaned.slice(0, Math.min(cleaned.length, 900)))) {
    const jsonStart = cleaned.search(/(\[\s*\{|\{\s*"(?:title|sections|front|question)":)/i);
    if (jsonStart > 0) {
      cleaned = cleaned.slice(jsonStart).trim();
    }

    const markdownStart = cleaned.search(/^#{1,3}\s/m);
    if (markdownStart > 0 && !cleaned.trimStart().startsWith("#")) {
      cleaned = cleaned.slice(markdownStart).trim();
    }
  }

  return cleaned
    .replace(/^Let's craft flashcards:\s*/i, "")
    .replace(/^Here (?:are|is) (?:the )?(?:flashcards?|quiz|notes?):\s*/i, "")
    .trim();
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function findBalancedJson(text: string, open: "[" | "{") {
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let start = -1;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === open) {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const candidate = text.slice(start, index + 1);
        if (tryParseJson(candidate)) return candidate;
      }
    }
  }

  return null;
}

export function extractStructuredOutput(text: string): string {
  const cleaned = stripReasoningPreamble(text);
  if (!cleaned) return "";

  const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const parsed = tryParseJson(fenced[1].trim());
    if (parsed) return fenced[1].trim();
  }

  const direct = tryParseJson(cleaned);
  if (direct) return cleaned;

  const arrayPayload = findBalancedJson(cleaned, "[");
  if (arrayPayload) return arrayPayload;

  const objectPayload = findBalancedJson(cleaned, "{");
  if (objectPayload) return objectPayload;

  return cleaned;
}

export function looksLikeReasoningLeak(text: string, mode?: string): boolean {
  const normalized = (text || "").toLowerCase();
  if (!normalized.trim()) return true;

  if (mode === "flashcards") {
    const hasCards = normalized.includes('"front"') || normalized.includes("front:");
    return reasoningMarkers.test(normalized.slice(0, 1200)) && !hasCards;
  }

  if (mode === "quiz") {
    const hasQuestions = normalized.includes('"question"') || /\bquestion\s*\d+/i.test(normalized);
    return reasoningMarkers.test(normalized.slice(0, 1200)) && !hasQuestions;
  }

  if (mode === "notes") {
    const hasSections = normalized.includes('"sections"') || normalized.includes('"title"');
    return reasoningMarkers.test(normalized.slice(0, 1200)) && !hasSections;
  }

  return false;
}
