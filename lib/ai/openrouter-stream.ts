import { normalizeAIText, normalizeErrorMessage } from "@/lib/ai/util";
import { isOpenRouterKeyLimitError } from "@/lib/ai/openrouter-keys";
import type { OpenRouterContent } from "@/lib/ai/providers/openrouter-content";

export type ProviderMessage = {
  role: "system" | "user" | "assistant";
  content: OpenRouterContent;
};

export type ChatStreamEvent =
  /** Emitted once, before any token, so the UI can label the answer. */
  | { type: "model"; model: string; tier: string }
  | { type: "delta"; content: string; reasoning: string }
  | { type: "error"; message: string };

export type StreamChatOptions = {
  messages: ProviderMessage[];
  /** Model ids in preference order. The first that responds wins. */
  models: string[];
  apiKeys: string[];
  /** The tier label forwarded to the UI (`pro`, `flash` or `vision`). */
  tier: string;
  temperature: number;
  maxTokens: number;
  /**
   * Whether to ask the provider for its reasoning trace. Enabling this is what
   * lets the UI show a tagline derived from what the model is actually
   * thinking about, rather than a decorative animation.
   */
  includeReasoning: boolean;
  referer: string;
  /** Aborts a stalled stream that has produced nothing for this long. */
  idleTimeoutMs?: number;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_IDLE_TIMEOUT_MS = 45_000;

/**
 * Pull `content` and `reasoning` out of one upstream SSE line.
 *
 * Providers differ: most send `delta.reasoning`, some send
 * `delta.reasoning_details[].text`. Both are handled.
 */
function readDelta(payload: unknown): { content: string; reasoning: string } {
  const choice = (payload as { choices?: Array<{ delta?: Record<string, unknown> }> })?.choices?.[0];
  const delta = choice?.delta;
  if (!delta) return { content: "", reasoning: "" };

  const content = normalizeAIText(delta.content);
  let reasoning = normalizeAIText(delta.reasoning);

  if (!reasoning && Array.isArray(delta.reasoning_details)) {
    reasoning = (delta.reasoning_details as Array<{ text?: unknown }>)
      .map((detail) => normalizeAIText(detail?.text))
      .filter(Boolean)
      .join("");
  }

  return { content, reasoning };
}

/**
 * Stream a chat completion, walking down the model chain and the key pool.
 *
 * Fallback only happens *before the first token*. Once tokens have been sent to
 * the client we can no longer change models without visibly restarting the
 * answer, so a mid-stream failure surfaces as an error event instead.
 */
export async function* streamChatCompletion(
  options: StreamChatOptions
): AsyncGenerator<ChatStreamEvent, void, unknown> {
  const failures: string[] = [];
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;

  for (const model of options.models) {
    for (const [keyIndex, apiKey] of options.apiKeys.entries()) {
      const controller = new AbortController();
      let idleTimer: ReturnType<typeof setTimeout> | undefined;

      const resetIdleTimer = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => controller.abort(), idleTimeoutMs);
      };

      let response: Response;
      try {
        resetIdleTimer();
        response = await fetch(OPENROUTER_URL, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": options.referer,
            "X-Title": "ScholarMind"
          },
          body: JSON.stringify({
            model,
            messages: options.messages,
            temperature: options.temperature,
            max_tokens: options.maxTokens,
            stream: true,
            include_reasoning: options.includeReasoning,
            reasoning: { exclude: !options.includeReasoning }
          })
        });
      } catch (error) {
        if (idleTimer) clearTimeout(idleTimer);
        failures.push(`${model} key ${keyIndex + 1}: ${normalizeErrorMessage(error, "request failed")}`);
        continue;
      }

      if (!response.ok) {
        if (idleTimer) clearTimeout(idleTimer);
        const detail = normalizeErrorMessage(
          await response.text(),
          `OpenRouter failed with status ${response.status}.`
        );
        failures.push(`${model} key ${keyIndex + 1}: ${detail}`);

        // A limit/auth problem on this key is worth retrying with the next key;
        // anything else means this model itself is unusable, so move on.
        if (keyIndex < options.apiKeys.length - 1 && isOpenRouterKeyLimitError(response.status, detail)) {
          continue;
        }
        break;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        if (idleTimer) clearTimeout(idleTimer);
        failures.push(`${model}: no response body`);
        break;
      }

      yield { type: "model", model, tier: options.tier };

      const decoder = new TextDecoder();
      let buffer = "";
      let sentAnyToken = false;
      let sawError = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          resetIdleTimer();
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split(/\r?\n\r?\n/);
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            for (const line of part.split(/\r?\n/)) {
              if (!line.startsWith("data:")) continue;
              const payload = line.replace(/^data:\s*/, "").trim();
              if (!payload || payload === "[DONE]") continue;

              let parsed: unknown;
              try {
                parsed = JSON.parse(payload);
              } catch {
                continue;
              }

              const upstreamError = (parsed as { error?: { message?: unknown } })?.error;
              if (upstreamError) {
                sawError = true;
                failures.push(`${model}: ${normalizeErrorMessage(upstreamError, "provider error")}`);
                continue;
              }

              const delta = readDelta(parsed);
              if (!delta.content && !delta.reasoning) continue;

              sentAnyToken = true;
              yield { type: "delta", content: delta.content, reasoning: delta.reasoning };
            }
          }
        }
      } catch (error) {
        // An abort here is the idle guard firing, not a user cancellation.
        if (!sentAnyToken) {
          failures.push(`${model}: ${normalizeErrorMessage(error, "stream failed")}`);
        }
      } finally {
        if (idleTimer) clearTimeout(idleTimer);
        reader.cancel().catch(() => undefined);
      }

      if (sawError && !sentAnyToken) {
        break;
      }

      // Either we streamed a real answer, or we produced nothing at all.
      if (sentAnyToken) return;

      failures.push(`${model}: no tokens received`);
      break;
    }
  }

  yield {
    type: "error",
    message: failures.length
      ? `Every AI model failed. ${failures.join(" | ")}`
      : "No AI model was available for this request."
  };
}
