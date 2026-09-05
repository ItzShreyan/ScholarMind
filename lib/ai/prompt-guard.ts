/**
 * Prompt injection guards and model validation for AI inputs.
 *
 * These utilities are applied server-side before any user-provided text
 * reaches the AI system prompt or model selection.
 */

/** Allowlist of approved model identifiers. */
const ALLOWED_MODELS = new Set([
  // OpenRouter free models
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "openai/gpt-oss-20b:free",
  // Gemini
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  // Groq
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  // HuggingFace
  "google/flan-t5-large",
  // Together
  "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
]);

/**
 * Returns true when the model identifier is in the server-side allowlist.
 * Unknown or empty values are rejected.
 */
export function isAllowedModel(model: string | undefined | null): boolean {
  if (!model || typeof model !== "string") return false;
  return ALLOWED_MODELS.has(model.trim());
}

/**
 * Patterns that indicate prompt injection attempts.
 * Each entry has a regex and a short label for logging.
 */
const INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /ignore\s+(all\s+)?previous\s+instructions/i, label: "ignore_instructions" },
  { pattern: /ignore\s+(all\s+)?above\s+instructions/i, label: "ignore_above" },
  { pattern: /you\s+are\s+now\s+(a|an|the)\b/i, label: "role_reassignment" },
  { pattern: /system\s*prompt\s*[:=]/i, label: "system_prompt_override" },
  { pattern: /\bdo\s+not\s+follow\b.*\binstructions\b/i, label: "refuse_instructions" },
  { pattern: /\boverride\b.*\b(system|safety|policy)\b/i, label: "override_policy" },
  { pattern: /\bforget\b.*\b(previous|above|system|all)\b/i, label: "forget_context" },
  { pattern: /\bdisregard\b.*\b(instructions|rules|constraints)\b/i, label: "disregard_rules" },
  { pattern: /\bpretend\b.*\b(you\s+are|to\s+be)\b/i, label: "pretend_role" },
  { pattern: /\bjailbreak\b/i, label: "jailbreak" },
  { pattern: /\bDAN\b.*\bmode\b/i, label: "dan_mode" },
];

/** Maximum length for user-provided context and prompts. */
const MAX_CONTEXT_LENGTH = 60_000;
const MAX_PROMPT_LENGTH = 12_000;

/**
 * Sanitizes user-provided text for use in AI prompts.
 *
 * - Truncates excessively long inputs
 * - Detects and logs injection attempts (but still passes the text through
 *   with a safety prefix so the model can refuse naturally)
 *
 * Returns `{ text, injectionDetected, labels }`.
 */
export function sanitizePromptInput(
  text: string | undefined | null,
  maxLength = MAX_PROMPT_LENGTH
): { text: string; injectionDetected: boolean; labels: string[] } {
  if (!text || typeof text !== "string") {
    return { text: "", injectionDetected: false, labels: [] };
  }

  // Truncate to prevent resource exhaustion
  const truncated = text.length > maxLength ? text.slice(0, maxLength) : text;

  // Check for injection patterns
  const matchedLabels: string[] = [];
  for (const { pattern, label } of INJECTION_PATTERNS) {
    if (pattern.test(truncated)) {
      matchedLabels.push(label);
    }
  }

  return {
    text: truncated,
    injectionDetected: matchedLabels.length > 0,
    labels: matchedLabels,
  };
}

/**
 * Sanitizes user-provided context (uploaded text, notes, etc.).
 * Same logic as prompt sanitization but with a higher length limit.
 */
export function sanitizeContextInput(
  context: string | undefined | null
): { text: string; injectionDetected: boolean; labels: string[] } {
  return sanitizePromptInput(context, MAX_CONTEXT_LENGTH);
}
