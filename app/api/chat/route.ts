import { NextResponse } from "next/server";
import { normalizeAIText, normalizeErrorMessage } from "@/lib/ai/util";
import { extractStructuredOutputWithReasoning } from "@/lib/ai/strip-reasoning";
import { getOpenRouterKeys } from "@/lib/ai/openrouter-keys";
import {
  formatChatLimitMessage,
  releaseChatUsage,
  reserveChatUsage
} from "@/lib/ai/limits";
import { getSiteSettings } from "@/lib/site-settings";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { loadVisionAttachments } from "@/lib/ai/image-attachments";
import { buildOpenRouterContent } from "@/lib/ai/providers/openrouter-content";
import {
  CHAT_MODELS,
  getModelChain,
  normalizeModelChoice,
  resolveChatModel,
  type ChatModelChoice
} from "@/lib/ai/models";
import {
  streamChatCompletion,
  type ChatStreamEvent,
  type ProviderMessage
} from "@/lib/ai/openrouter-stream";
import { buildChatSystemPrompt } from "@/lib/ai/prompts/chat-system";
import { shouldResearchWeb } from "@/lib/ai/research-intent";
import { researchWeb, type WebCitation, type WebResearch } from "@/lib/ai/web-research";

function normalizeHistory(history: unknown): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-8)
    .flatMap((item) => {
      const record = item as { role?: string; content?: unknown };
      const content = normalizeAIText(record?.content);
      if (!content) return [];

      return [{
        role: record?.role === "assistant" || record?.role === "ai" ? "assistant" : "user",
        content
      } satisfies { role: "user" | "assistant"; content: string }];
    });
}

type ScholarMindMeta = {
  model: string;
  tier: string;
  choice: ChatModelChoice;
  auto: boolean;
  reason: string;
  /**
   * Live web sources that informed this answer. Present only when a search
   * actually ran and returned something, so the UI can list real citations
   * rather than implying research that never happened.
   */
  sources?: WebCitation[];
};

/** One SSE frame in the exact shape the client already parses. */
function sseFrame(
  delta: { content?: string; reasoning?: string },
  meta?: ScholarMindMeta
): string {
  return `data: ${JSON.stringify({
    choices: [{ delta: { content: delta.content ?? "", reasoning: delta.reasoning ?? "" } }],
    ...(meta ? { scholarMind: meta } : {})
  })}\n\n`;
}

function buildMeta(
  model: string,
  tier: string,
  choice: ChatModelChoice,
  reason: string
): ScholarMindMeta {
  return { model, tier, choice, auto: choice === "auto", reason };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to use the AI tutor." }, { status: 401 });
    }

    const { input } = await req.json();
    const apiKeys = getOpenRouterKeys();
    const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());

    if (!apiKeys.length && !geminiConfigured) {
      return NextResponse.json(
        { error: "Missing an AI provider key. Add GEMINI_API_KEY or OPENROUTER_API_KEY in .env.local, then restart npm run dev." },
        { status: 400 }
      );
    }

    const message = normalizeAIText(input?.message || input?.prompt || "");
    if (!message) {
      return NextResponse.json({ error: "No chat message was provided." }, { status: 400 });
    }

    const siteSettings = await getSiteSettings(supabase);
    const actorKey = user.id;
    const chatReservation = await reserveChatUsage({
      supabase,
      actorKey,
      userId: user.id,
      dailyLimit: siteSettings.chatDailyLimit
    });

    if (!chatReservation.allowed) {
      return NextResponse.json({ error: formatChatLimitMessage(siteSettings.chatDailyLimit) }, { status: 429 });
    }

    const releaseUsage = async () => {
      await releaseChatUsage({
        supabase,
        actorKey,
        userId: user.id,
        token: chatReservation.token,
        persisted: chatReservation.persisted
      });
    };

    const context = normalizeAIText(input?.context || "");
    const screenContext = normalizeAIText(input?.screenContext || "");
    const vision = await loadVisionAttachments(user.id, input?.sessionId);
    const history = normalizeHistory(input?.history || input?.messages);

    /*
     * Model selection.
     *
     * The client sends the student's Pro/Flash/Auto choice. The server resolves
     * it authoritatively — Auto is classified on the *latest user question*
     * only, not the whole enriched prompt, so accumulated context does not
     * drag every follow-up onto the heavy model.
     */
    const choice = normalizeModelChoice(input?.modelChoice);
    const hasImages = vision.attachments.length > 0;
    const resolved = resolveChatModel(choice, message, hasImages);
    const models = hasImages
      ? getModelChain("vision")
      : choice === "auto"
        ? Array.from(new Set([resolved.modelId, ...getModelChain(resolved.tier as "pro" | "flash")]))
        : getModelChain(choice);

    /*
     * Live web research.
     *
     * The tutor is grounded in the uploaded material, but a question about
     * something recent — or any real question in a studio that has no sources
     * yet — cannot be answered honestly from the model's memory alone.
     *
     * The decision comes from `shouldResearchWeb`, the same pure function the
     * chat UI uses to label this stage, so the label can never describe work
     * that was skipped. Failure or timeout is not an error: the answer simply
     * proceeds without web evidence.
     */
    let research: WebResearch = { used: false, summary: "", citations: [] };
    if (shouldResearchWeb(message, { hasSourceContext: Boolean(context.trim()) })) {
      research = await researchWeb(message);
    }

    const meta: ScholarMindMeta = {
      ...buildMeta(
        resolved.modelId,
        resolved.tier,
        choice,
        resolved.decision
          ? `Auto chose ${CHAT_MODELS[resolved.decision.tier].label}${
              resolved.decision.signals.length ? ` — this ${resolved.decision.signals.join(", ")}` : ""
            }`
          : `${CHAT_MODELS[choice as "pro" | "flash"]?.label ?? "Selected"} model`
      ),
      ...(research.used ? { sources: research.citations } : {})
    };

    const messages: ProviderMessage[] = [
      { role: "system", content: buildChatSystemPrompt(context, screenContext, research.summary) },
      ...history.map((item) => ({ role: item.role, content: item.content } satisfies ProviderMessage)),
      { role: "user", content: buildOpenRouterContent(message, vision.attachments) }
    ];

    if (hasImages) {
      console.info("openrouter_vision_chat_request", {
        userId: user.id,
        sessionId: input?.sessionId,
        imageCount: vision.attachments.length,
        model: resolved.modelId
      });
    }

    if (!apiKeys.length) {
      return await respondWithGeminiFallback({
        userId: user.id,
        message,
        context,
        screenContext,
        history,
        vision,
        releaseUsage
      });
    }

    /*
     * Peek the first event before committing to a streaming response.
     *
     * This is what keeps correct HTTP semantics: if every model and key fails
     * we can still return a JSON 400 and release the reserved usage, instead of
     * opening a 200 stream that immediately dies.
     */
    const iterator = streamChatCompletion({
      messages,
      models,
      apiKeys,
      tier: resolved.tier,
      temperature: 0.35,
      maxTokens: 1400,
      includeReasoning: resolved.tier !== "vision" || hasImages,
      referer: getSiteUrl()
    });

    const first = await iterator.next();

    const firstFailure = first.done
      ? "The AI stream ended before producing anything."
      : first.value.type === "error"
        ? first.value.message
        : null;

    if (firstFailure) {
      if (geminiConfigured) {
        return await respondWithGeminiFallback({
          userId: user.id,
          message,
          context,
          screenContext,
          history,
          vision,
          releaseUsage,
          priorFailure: firstFailure
        });
      }

      await releaseUsage();
      return NextResponse.json({ error: firstFailure }, { status: 400 });
    }

    /*
     * `IteratorResult` types `value` as `ChatStreamEvent | void`, so `done` has
     * to be narrowed before the event can be read off it. At this point the
     * first event is known to be a real `model` event.
     */
    const firstEvent = first.done ? undefined : (first.value as ChatStreamEvent);
    if (!firstEvent || firstEvent.type !== "model") {
      await releaseUsage();
      return NextResponse.json({ error: "The AI stream returned an unexpected first event." }, { status: 400 });
    }

    const encoder = new TextEncoder();

    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        try {
          controller.enqueue(encoder.encode(sseFrame({}, { ...meta, model: firstEvent.model })));

          for await (const event of iterator) {
            if (event.type === "model") {
              controller.enqueue(encoder.encode(sseFrame({}, { ...meta, model: event.model })));
              continue;
            }

            if (event.type === "error") {
              // Tokens already reached the student, so surface this in-band
              // rather than pretending the answer was complete.
              controller.enqueue(encoder.encode(sseFrame({ content: `\n\n_${event.message}_` })));
              continue;
            }

            controller.enqueue(
              encoder.encode(sseFrame({ content: event.content, reasoning: event.reasoning }))
            );
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              sseFrame({ content: `\n\n_${normalizeErrorMessage(error, "The answer stopped early.")}_` })
            )
          );
        } finally {
          if (!closed) {
            closed = true;
            controller.close();
          }
        }
      }
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
        // Disable proxy buffering so tokens actually arrive incrementally.
        "X-Accel-Buffering": "no"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: normalizeErrorMessage(error, "Unable to contact the AI tutor.") },
      { status: 400 }
    );
  }
}

/**
 * Gemini is the last-resort provider. Used only when every OpenRouter key and
 * model failed, and only when nothing has been streamed yet — so it can never
 * restarts an answer the student is already reading.
 */
async function respondWithGeminiFallback({
  userId,
  message,
  context,
  screenContext,
  history,
  vision,
  releaseUsage,
  priorFailure
}: {
  userId: string;
  message: string;
  context: string;
  screenContext: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  vision: Awaited<ReturnType<typeof loadVisionAttachments>>;
  releaseUsage: () => Promise<void>;
  priorFailure?: string;
}) {
  try {
    const result = await geminiProvider.generate({
      action: "chat",
      prompt: message,
      context: [context, screenContext].filter(Boolean).join("\n\n"),
      history,
      sessionId: undefined,
      imageAttachments: vision.attachments
    });

    const normalized = extractStructuredOutputWithReasoning(result.text);
    if (normalized.text.trim()) {
      console.info("chat_gemini_fallback_succeeded", {
        userId,
        imageCount: vision.attachments.length,
        priorFailure: priorFailure ? "yes" : "no"
      });

      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              sseFrame(
                {},
                buildMeta("gemini-fallback", "gemini", "auto", "OpenRouter was unavailable, so Gemini answered")
              )
            )
          );
          controller.enqueue(
            encoder.encode(sseFrame({ content: normalized.text, reasoning: normalized.reasoning }))
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      });

      return new Response(body, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Accel-Buffering": "no"
        }
      });
    }

    await releaseUsage();
    return NextResponse.json({ error: "Gemini returned an empty chat message." }, { status: 400 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown Gemini error";
    console.error("chat_gemini_fallback_failed", {
      userId,
      imageCount: vision.attachments.length,
      message: detail
    });
    await releaseUsage();
    return NextResponse.json(
      { error: priorFailure ? `${priorFailure} | gemini: ${detail}` : `gemini: ${detail}` },
      { status: 400 }
    );
  }
}
