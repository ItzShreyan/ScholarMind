import type { AIImageAttachment } from "@/types";
import { CHAT_MODELS, resolveChatModel, type ChatModelChoice } from "@/lib/ai/models";

export type OpenRouterContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type OpenRouterContent = string | OpenRouterContentPart[];

/**
 * OpenRouter accepts private images as data URLs in multi-part user content.
 * Keeping this conversion server-side prevents source images from reaching the
 * browser while allowing a vision-capable model to receive the original bytes.
 */
export function buildOpenRouterContent(
  text: string,
  imageAttachments?: AIImageAttachment[]
): OpenRouterContent {
  if (!imageAttachments?.length) return text;

  return [
    { type: "text", text },
    ...imageAttachments.map((image) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${image.mimeType};base64,${image.data}`
      }
    }))
  ];
}

/**
 * Resolve the model for a request.
 *
 * The registry in `lib/ai/models.ts` owns every id. This wrapper exists so the
 * provider layer keeps its original, simple call shape.
 *
 * - Any request carrying images goes to the vision model: the Pro model is
 *   text-only and cannot see an image.
 * - Study-tool generation (JSON quizzes, flashcards, notes, exams) always uses
 *   the study model, which is chosen for reliable structured output.
 * - Chat honours the caller's Pro/Flash/Auto choice.
 */
export function getOpenRouterModel(
  imageAttachments?: AIImageAttachment[],
  purpose: "chat" | "study" = "study",
  options?: { choice?: ChatModelChoice; prompt?: string }
): string {
  const hasImages = Boolean(imageAttachments?.length);

  if (hasImages) {
    return resolveChatModel("auto", "", true).modelId;
  }

  if (purpose === "study") {
    // Study generation (notes, exams, quizzes, flashcards) is genuinely heavy
    // work with structured output, so it always uses the stronger model.
    return CHAT_MODELS.pro.id;
  }

  return resolveChatModel(
    options?.choice ?? "auto",
    options?.prompt ?? "",
    false
  ).modelId;
}
