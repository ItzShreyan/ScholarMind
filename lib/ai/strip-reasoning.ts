/**
 * Strip model chain-of-thought / planning text and extract student-facing payloads.
 */

// We only strip known reasoning preamble prefixes. The old aggressive
// structural-marker approach was stripping valid content that happened
// to contain a leading JSON-like character. Now we use simple prefix
// removal and rely on extractStructuredOutput to find the payload.
const reasoningPrefixes: RegExp[] = [
  /^Let's craft flashcards:\s*/i,
  /^Here (?:are|is) (?:the )?(?:flashcards?|quiz|notes?|summary):\s*/i,
  /^I will (?:now )?generate\s*.*?\n/i,
  /^based on uploaded sources\s*.*?\n/i,
];

export function stripReasoningPreamble(text: string): string {
  let cleaned = (text || "").trim();
  if (!cleaned) return "";

  for (const prefix of reasoningPrefixes) {
    const before = cleaned;
    cleaned = cleaned.replace(prefix, "").trim();
    if (cleaned !== before) break;
  }

  return cleaned;
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

  // For structured modes, check for actual content before flagging
  if (mode === "flashcards") {
    const hasCards = normalized.includes('"front"') || normalized.includes("front:") || normalized.includes("q:");
    if (hasCards) return false;
    // Flag as leak only when the text is suspiciously short with no card-like content
    return normalized.length < 40;
  }

  if (mode === "quiz") {
    const hasQuestions = normalized.includes('"question"') || /\bquestion\s*\d+/i.test(normalized);
    if (hasQuestions) return false;
    return normalized.length < 40;
  }

  if (mode === "notes") {
    const hasSections = normalized.includes('"sections"') || normalized.includes('"title"');
    if (hasSections) return false;
    return normalized.length < 40;
  }

  // For summary, concepts, etc. - don't flag reasoning leaks
  return false;
}
