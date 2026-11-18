/**
 * Reading what the studio's own API routes send back.
 *
 * Three different wire formats meet here and each fails differently:
 *
 *   - a JSON tool result, which models routinely wrap in a fence, decorate
 *     with a reasoning preamble, or leave a trailing comma in
 *   - an SSE chat stream, whose first frame carries the model metadata rather
 *     than any text
 *   - a plain JSON error body, which may be HTML if a proxy intervened
 *
 * None of these are allowed to throw into a render path, so each returns a
 * usable value and lets the caller decide what to tell the student.
 */

import { extractStructuredOutput } from "@/lib/ai/strip-reasoning";
import type { ChatModelMeta } from "@/lib/studio/types";
import { normalizeAIText } from "@/lib/studio/text";

/**
 * Parse JSON out of a model response.
 *
 * Models are not strict JSON writers: this tolerates a BOM, a reasoning
 * preamble, a fenced block, an unbalanced wrapper around the payload, and
 * trailing commas in arrays and objects. Anything that survives none of those
 * attempts returns `null`, which the callers already treat as "fall back to
 * the prose parser".
 */
export function parseJsonBlock<T>(text: string): T | null {
  let cleaned = extractStructuredOutput(text).replace(/^\uFEFF/, "").trim();
  if (!cleaned) return null;

  // Recursively strip trailing commas: keep going until no more matches
  const stripTrailingCommas = (s: string): string => {
    const result = s.replace(/,\s*([\]}])/g, "$1");
    return result === s ? result : stripTrailingCommas(result);
  };
  cleaned = stripTrailingCommas(cleaned);

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // fall through
  }

  // Try extracting from code fences
  const fencedMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    const jsonStr = stripTrailingCommas(fencedMatch[1].trim());
    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      // fall through
    }
  }

  // Try extracting balanced array or object from the raw text
  const bracketMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (bracketMatch) {
    const jsonStr = stripTrailingCommas(bracketMatch[1]);
    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      // fall through
    }
  }

  return null;
}

/**
 * One SSE chunk → text plus, on the first frame, the model metadata.
 *
 * The server sends the answering model on its opening frame and nowhere else,
 * so a chunk without `scholarMind` must leave `meta` null rather than
 * overwriting what an earlier chunk already reported.
 */
export function parseSSEChunk(chunk: string): {
  content: string;
  reasoning: string;
  meta: ChatModelMeta | null;
} {
  const lines = chunk.split(/\r?\n/);
  let content = "";
  let reasoning = "";
  let meta: ChatModelMeta | null = null;

  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    const payload = line.replace(/^data:\s*/, "").trim();
    if (payload === "[DONE]") continue;
    try {
      const data = JSON.parse(payload);
      const delta = data?.choices?.[0]?.delta;
      content += normalizeAIText(delta?.content);
      reasoning += normalizeAIText(delta?.reasoning);

      // The server labels the answer on its first frame so the UI can name the
      // model that actually replied, including which tier Auto settled on.
      const reported = data?.scholarMind as ChatModelMeta | undefined;
      if (reported?.model) meta = reported;
    } catch {
      // not JSON: ignore
    }
  }

  return { content, reasoning, meta };
}

/**
 * The body of a studio API reply.
 *
 * Route bodies are untyped JSON on the wire, and every caller narrows the
 * fields it actually uses at the point of use (`typeof json.error === "string"`,
 * `Array.isArray(json.files)`, …). Re-declaring a full schema per route here
 * would duplicate the server contract for no additional safety, so this is the
 * one place in the app where a deliberately loose record is the honest type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
export type StudioJsonResponse = Record<string, any>;

/**
 * Read a JSON response without giving the student a parse error.
 *
 * A dev-server restart, a proxy timeout or a crashed route can all return
 * something that is not JSON. The student needs to know which of those
 * happened, so the status code is kept in the message.
 */
export async function readJsonResponse<T = StudioJsonResponse>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    const statusMessage = response.status ? ` (${response.status})` : "";
    throw new Error(
      response.ok
        ? `The server returned an unreadable response${statusMessage}. Restart the dev server and try again.`
        : `The server returned an unexpected response${statusMessage}.`
    );
  }
}
