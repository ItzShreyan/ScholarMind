/**
 * Text handling for the studio's generated output.
 *
 * These are pure string functions with no React and no network, which is the
 * whole point of moving them out of `StudyWorkspace.tsx`: a model can return
 * an object where a string was promised, a `[object Object]` where a
 * definition was promised, or a reasoning preamble before the payload begins.
 * Every one of those shapes has to be turned into something displayable, and
 * that rule deserves to be readable and testable on its own.
 */

import { extractStructuredOutput } from "@/lib/ai/strip-reasoning";

/**
 * The model's output with reasoning traces and fences removed.
 *
 * `extractStructuredOutput` handles the reasoning preamble; this also drops the
 * "Local fallback response" marker the offline provider writes, because that is
 * an internal signal and never something a student should read.
 */
export function cleanGeneratedText(text: string): string {
  return extractStructuredOutput(text)
    .replace(/^Local fallback response\s*/i, "")
    .replace(/```(?:json)?/gi, "")
    .trim();
}

/**
 * Read a string out of whatever the provider actually sent.
 *
 * Providers differ: some return `{ error }`, some `{ message }`, some
 * `{ text }`, some an array of blocks. The empty-ish cases are the important
 * ones — `"[object Object]"` and `"{}"` are what a careless stringify produces,
 * and either would be rendered as a real answer if they were allowed through.
 */
export function normalizeAIText(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed && trimmed !== "[object Object]" && trimmed !== "{}" ? trimmed : "";
  }
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = [record.error, record.message, record.text, record.content];
    for (const item of preferred) {
      const normalized = normalizeAIText(item);
      if (normalized) return normalized;
    }
    try {
      const json = JSON.stringify(value);
      return json === "{}" ? "" : json;
    } catch {
      return "";
    }
  }
  return String(value).trim();
}

export function normalizeErrorMessage(value: unknown, fallback = "Unexpected error"): string {
  const normalized = normalizeAIText(value);
  if (!normalized || normalized === "[object Object]" || normalized === "{}") {
    return fallback;
  }
  return normalized;
}

export function sanitizeDisplayText(value: unknown, fallback: string): string {
  const normalized = normalizeErrorMessage(value, fallback);
  return normalized === "[object Object]" ? fallback : normalized;
}

/** Response text that keeps multi-block answers in order. */
export function normalizeAIResponseText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(normalizeAIResponseText).filter(Boolean).join("\n");
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const candidate = normalizeAIText(record.text ?? record.content ?? record.error ?? record.message);
    return candidate || JSON.stringify(value);
  }
  return normalizeAIText(value);
}

/** Strip a bullet or number marker so a list line can be re-titled. */
export function normalizeLine(line: string): string {
  return line
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .trim();
}

export function clipText(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

/** A one-line preview for a tool history entry. */
export function summarizeGeneratedOutput(text: string): string {
  return clipText(
    cleanGeneratedText(text)
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
    180
  );
}
