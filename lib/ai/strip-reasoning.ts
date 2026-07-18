/**
 * Strip model chain-of-thought / planning text and extract student-facing payloads.
 * Relaxed to avoid stripping legitimate content.
 */

const reasoningPrefixes: RegExp[] = [
  /^Let's craft flashcards:\s*/i,
  /^Here (?:are|is) (?:the )?(?:flashcards?|quiz|notes?|summary):\s*/i,
  /^I will (?:now )?generate\s*.*?\n/i,
  /^based on uploaded sources\s*.*?\n/i,
  /^Here is the\s+.*?\n/i,
  /^I'll (?:create|generate|produce)\s+.*?\n/i,
  /^Let me (?:create|generate|produce|build|write)\s+.*?\n/i,
  /^Sure!?\s+Here\s+.*?\n/i,
  /^Absolutely!?\s+Here\s+.*?\n/i,
  /^Of course!?\s+Here\s+.*?\n/i,
  /^Here's\s+.*?\n/i,
];

/**
 * Recursively strip trailing commas from JSON strings.
 * AI models frequently emit trailing commas in arrays/objects (e.g. "item",] or "value",}).
 */
function stripTrailingCommas(s: string): string {
  const result = s.replace(/,\s*([\]}])/g, "$1");
  return result === s ? result : stripTrailingCommas(result);
}

export function stripReasoningPreamble(text: string): string {
  let cleaned = (text || "").trim();
  if (!cleaned) return "";

  for (const prefix of reasoningPrefixes) {
    const before = cleaned;
    cleaned = cleaned.replace(prefix, "").trim();
    if (cleaned !== before) break;
  }

  const firstSubstantive = cleaned.match(/(```(?:json)?\s*|^#|^\{|^\[|^---)/m);
  if (firstSubstantive && firstSubstantive.index !== undefined && firstSubstantive.index > 0) {
    const beforeMatch = cleaned.slice(0, firstSubstantive.index).trim();
    if (beforeMatch.length < 120 && /I\s+(?:will|shall|can|would|am|'ll)/i.test(beforeMatch)) {
      cleaned = cleaned.slice(firstSubstantive.index).trim();
    }
  }

  return cleaned;
}

function tryParseJson(value: string) {
  // Strip trailing commas before every parse attempt — AI models commonly emit them
  const cleaned = stripTrailingCommas(value);
  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    return null;
  }
}

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
 * This is intentionally lenient — never strip content that could be valid output.
 */
export function extractStructuredOutput(text: string): string {
  const cleaned = stripReasoningPreamble(text);
  if (!cleaned) return "";

  // Try ```json fenced blocks first
  const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const stripped = stripTrailingCommas(fenced[1].trim());
    const parsed = tryParseJson(stripped);
    if (parsed) return stripped;
  }

  // Try direct JSON parse (with trailing comma cleanup)
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

/**
 * Lenient check for reasoning leaks — only flag when content is truly empty.
 */
export function looksLikeReasoningLeak(text: string, _mode?: string): boolean {
  const normalized = (text || "").toLowerCase().trim();
  if (!normalized) return true;

  // If the text has any substantial content, it's not a leak
  if (normalized.length >= 10) return false;

  return false;
}
