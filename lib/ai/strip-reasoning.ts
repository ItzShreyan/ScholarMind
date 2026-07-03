/**
 * Strip model chain-of-thought / planning text and extract student-facing payloads.
 */

const reasoningLeadPatterns: RegExp[] = [
  /^[\s\S]*?(?=\[\s*\{)/,
  /^[\s\S]*?(?=\{\s*"(?:title|sections|front|question)":)/i,
  /^[\s\S]*?(?=```json)/i,
  /^[\s\S]*?(?=(?:^|\n)#+\s)/m
];

const reasoningMarkers =
  /\b(we need to produce|let's craft|let us craft|i will (?:now )?generate|based on uploaded sources|however we only have|constraints:)\b/i;

export function stripReasoningPreamble(text: string): string {
  let cleaned = (text || "").trim();
  if (!cleaned) return "";

  // Try to strip reasoning preamble by finding the first structural marker
  for (const pattern of reasoningLeadPatterns) {
    const match = cleaned.match(pattern);
    if (match && match.index && match.index > 0) {
      const next = cleaned.slice(match.index).trim();
      if (next && next.length < cleaned.length) {
        cleaned = next;
        break;
      }
    }
  }

  // If reasoning markers found in first 900 chars, strip aggressively
  if (reasoningMarkers.test(cleaned.slice(0, Math.min(cleaned.length, 900)))) {
    // Look for JSON start
    const jsonStart = cleaned.search(/(\[\s*\{|\{\s*"(?:title|sections|front|question|subjects?)":)/i);
    if (jsonStart > 0 && jsonStart < cleaned.length * 0.5) {
      cleaned = cleaned.slice(jsonStart).trim();
    }

    // Look for markdown heading start
    const mdStart = cleaned.search(/^#{1,3}\s/m);
    if (mdStart > 0 && mdStart < cleaned.length * 0.5) {
      cleaned = cleaned.slice(mdStart).trim();
    }
  }

  // Clean up common preamble prefixes
  return cleaned
    .replace(/^Let's craft flashcards:\s*/i, "")
    .replace(/^Here (?:are|is) (?:the )?(?:flashcards?|quiz|notes?|summary):\s*/i, "")
    .trim();
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

/**
 * Find a balanced JSON array or object in text.
 * Handles nested structures properly by tracking brace depth.
 */
function findBalancedJson(text: string, open: "[" | "{") {
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let start = -1;
  let inString = false;
  let escapeNext = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

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

/**
 * Extract the primary structured output from model text.
 * Handles: ```json blocks, raw JSON, balanced arrays/objects, and plain markdown.
 */
export function extractStructuredOutput(text: string): string {
  const cleaned = stripReasoningPreamble(text);
  if (!cleaned) return "";

  // Try ```json fenced blocks first
  const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const parsed = tryParseJson(fenced[1].trim());
    if (parsed) return fenced[1].trim();
  }

  // Try direct JSON parse
  const direct = tryParseJson(cleaned);
  if (direct) return cleaned;

  // Try finding balanced JSON array or object
  const arrayPayload = findBalancedJson(cleaned, "[");
  if (arrayPayload) return arrayPayload;

  const objectPayload = findBalancedJson(cleaned, "{");
  if (objectPayload) return objectPayload;

  // Return the cleaned text as-is for markdown responses
  return cleaned;
}

export function looksLikeReasoningLeak(text: string, mode?: string): boolean {
  const normalized = (text || "").toLowerCase().trim();
  if (!normalized) return true;

  // Only check for reasoning markers if the text is predominantly planning rather than content
  if (mode === "flashcards") {
    const hasCards = normalized.includes('"front"') || normalized.includes("front:") || normalized.includes("q:");
    if (hasCards) return false;
    const reasoningThreshold = normalized.length > 200 || reasoningMarkers.test(normalized.slice(0, 1200));
    return reasoningThreshold;
  }

  if (mode === "quiz") {
    const hasQuestions = normalized.includes('"question"') || /\bquestion\s*\d+/i.test(normalized);
    if (hasQuestions) return false;
    return reasoningMarkers.test(normalized.slice(0, 1200));
  }

  if (mode === "notes") {
    const hasSections = normalized.includes('"sections"') || normalized.includes('"title"');
    if (hasSections) return false;
    return reasoningMarkers.test(normalized.slice(0, 1200));
  }

  // For summary, concepts, etc. - don't flag reasoning leaks unless it's pure planning gibberish
  return false;
}
