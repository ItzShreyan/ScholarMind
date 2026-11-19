import { AIProvider } from "@/lib/ai/types";
import { buildPrompt } from "@/lib/ai/prompt";
import { AIRequest } from "@/types";
import { fetchWithTimeout } from "@/lib/ai/providers/shared";
import { normalizeAIText, normalizeErrorMessage } from "@/lib/ai/util";
import { getOpenRouterKeys, isOpenRouterKeyLimitError } from "@/lib/ai/openrouter-keys";
import {
  buildOpenRouterContent,
  type OpenRouterContent
} from "@/lib/ai/providers/openrouter-content";
import { VISION_MODEL, getModelChain } from "@/lib/ai/models";
import { getSiteUrl } from "@/lib/site-url";

type OpenRouterMessage = {
  role: "user" | "assistant";
  content: OpenRouterContent;
};

type WorkspaceScreenshotDescriptionInput = {
  imageBase64: string;
  mimeType?: string;
  question: string;
};

export async function describeWorkspaceScreenshot({
  imageBase64,
  mimeType = "image/png",
  question
}: WorkspaceScreenshotDescriptionInput) {
  const apiKeys = getOpenRouterKeys();
  if (!apiKeys.length) throw new Error("Missing OPENROUTER_API_KEY");

  const prompt = [
    "Describe what's visible on screen relevant to answering the user's question.",
    "Focus on the currently visible workspace content, open note/page/tool, diagrams, text, tables, controls, and any visible student work.",
    "Be concise, factual, and do not answer the user's question directly; provide visual context for another tutor model.",
    `User question: ${question}`
  ].join("\n");

  const messages: OpenRouterMessage[] = [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${imageBase64}` }
        }
      ]
    }
  ];

  const failures: string[] = [];

  for (const [index, apiKey] of apiKeys.entries()) {
    const res = await fetchWithTimeout(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": getSiteUrl(),
          "X-Title": "ScholarMind"
        },
        body: JSON.stringify({
          model: VISION_MODEL.id,
          messages,
          temperature: 0.15,
          max_tokens: 700,
          reasoning: { exclude: true },
          include_reasoning: false,
          stream: false
        })
      },
      30000
    );

    if (!res.ok) {
      const details = normalizeErrorMessage(await res.text(), `OpenRouter vision failed: ${res.status}`);
      failures.push(`key ${index + 1}: ${details}`);
      if (index < apiKeys.length - 1 && isOpenRouterKeyLimitError(res.status, details)) continue;
      throw new Error(details);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const description = normalizeAIText(data?.choices?.[0]?.message?.content);
    if (!description) throw new Error("OpenRouter vision returned an empty screen description.");
    return description;
  }

  throw new Error(`OpenRouter vision keys failed. ${failures.join(" | ")}`);
}

function buildMessagesForModel(input: AIRequest, modelIsVisionCapable: boolean): OpenRouterMessage[] {
  const prompt = buildPrompt(input);
  const history = Array.isArray(input.history) ? input.history.filter((item) => normalizeAIText(item.content)) : [];
  // Only pass image attachments if the candidate model can actually read images.
  // Sending image_url to a text-only model causes OpenRouter 404: "No endpoints found that support image input"
  const imageAttachments = modelIsVisionCapable ? input.imageAttachments : undefined;
  const currentMessage = {
    role: "user" as const,
    content: buildOpenRouterContent(prompt, imageAttachments)
  };
  if (!history.length) return [currentMessage];
  return [...history, currentMessage];
}

export const openrouterProviderV2: AIProvider = {
  name: "openrouter_v2",
  async generate(input) {
    const apiKeys = getOpenRouterKeys();
    if (!apiKeys.length) throw new Error("Missing OPENROUTER_API_KEY");

    const hasImages = Boolean(input.imageAttachments?.length);
    const isStudy = input.action !== "chat";

    // For study tools, prioritize the fastest models:
    // When text-only: Flash model (baidu/ernie-5.5-flash) -> Nemotron Super VL -> Flint
    // When images present: Nemotron Super VL (multimodal, fast) -> Gemma -> Vision model
    const candidateModels: string[] = isStudy
      ? hasImages
        ? ["nvidia/nemotron-3.5-super-vl:free", "google/gemma-4-26b-a4b-it:free", VISION_MODEL.id]
        : getModelChain("study")
      : hasImages
        ? getModelChain("vision")
        : getModelChain("flash");

    // Right-sized token limits so tools generate quickly without long delays
    const maxTokens =
      input.action === "notes"
        ? 2800
        : input.action === "exam"
          ? (input.examMode === "practice" ? 1600 : 2800)
          : input.action === "quiz" || input.action === "flashcards"
            ? 1200
            : input.action === "summary"
              ? 800
              : 1200;

    const temperature =
      input.action === "notes"
        ? 0.3
        : input.action === "quiz" || input.action === "flashcards"
          ? 0.2
          : input.action === "exam"
            ? 0.25
            : 0.3;

    // Fast per-attempt timeout (12s for tools, 18s for long notes/exams)
    const timeoutMs = input.action === "notes" || input.action === "exam" ? 18000 : 12000;

    const failures: string[] = [];

    for (const model of candidateModels) {
      const isVisionModel =
        model.includes("super-vl") ||
        model.includes("nano-omni") ||
        model.includes("gemma");

      const messages = buildMessagesForModel(input, isVisionModel);

      for (const [keyIndex, apiKey] of apiKeys.entries()) {
        try {
          const res = await fetchWithTimeout(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "HTTP-Referer": getSiteUrl(),
                "X-Title": "ScholarMind"
              },
              body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens: maxTokens,
                include_reasoning: false
              })
            },
            timeoutMs
          );

          if (!res.ok) {
            const details = normalizeErrorMessage(await res.text(), `OpenRouter V2 failed: ${res.status}`);
            failures.push(`${model} key ${keyIndex + 1}: ${details}`);
            if (keyIndex < apiKeys.length - 1 && isOpenRouterKeyLimitError(res.status, details)) {
              continue;
            }
            // For rate limit (429) or model error, immediately try the next model
            break;
          }

          const data = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const rawText = normalizeAIText(data?.choices?.[0]?.message?.content);
          if (rawText) {
            return { provider: "openrouter_v2" as const, text: rawText };
          }
          failures.push(`${model}: empty content received`);
        } catch (error) {
          failures.push(`${model}: ${normalizeErrorMessage(error)}`);
        }
      }
    }

    throw new Error(`OpenRouter models failed. ${failures.join(" | ")}`);
  }
};
