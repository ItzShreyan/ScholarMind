import type { AIImageAttachment } from "@/types";

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

export function getOpenRouterModel(
  imageAttachments?: AIImageAttachment[],
  purpose: "chat" | "study" = "study"
) {
  if (imageAttachments?.length) {
    // This model can read image, video, and audio inputs. Deployments can
    // override it with another OpenRouter vision model when needed.
    return (
      process.env.OPENROUTER_VISION_MODEL?.trim() ||
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
    );
  }

  if (purpose === "chat") {
    return (
      process.env.OPENROUTER_CHAT_MODEL?.trim() ||
      process.env.OPENROUTER_MODEL?.trim() ||
      "nvidia/nemotron-3-ultra-550b-a55b:free"
    );
  }

  return (
    process.env.OPENROUTER_STUDY_MODEL?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    "openai/gpt-oss-20b:free"
  );
}
