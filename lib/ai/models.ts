/**
 * OpenRouter model registry for ScholarMind.
 *
 * Two chat tiers, resolved from a user choice:
 *
 *   Flash  → fastest good-quality model. Default for everyday questions.
 *   Pro    → heavier reasoning model. Used for maths, proofs, code, long or
 *            multi-part questions, and every study-tool generation.
 *   Auto   → classifies the prompt and picks one of the above, preferring
 *            Flash unless the prompt genuinely needs Pro.
 *
 * Every id below was verified against `GET https://openrouter.ai/api/v1/models`
 * and exists on the free tier. Free tiers are volatile, so each tier also has an
 * ordered fallback list; if a model is retired the request moves down the list
 * instead of failing.
 *
 * Never hardcode a model id anywhere else in the app — import from here.
 */

export type ChatModelTier = "pro" | "flash";
export type ChatModelChoice = "auto" | ChatModelTier;

export type ModelSummary = {
  /** OpenRouter model id. */
  id: string;
  /** Product name shown in the selector. */
  label: string;
  /** One line, shown under the label. */
  blurb: string;
  /** Why we picked it. Shown in the selector's detail line. */
  spec: string;
  contextLength: number;
  /** 5 = fastest. */
  speed: 1 | 2 | 3 | 4 | 5;
  /** 5 = strongest reasoning. */
  depth: 1 | 2 | 3 | 4 | 5;
  /** Whether the model can accept image input. */
  vision: boolean;
  /** Whether the model exposes extended thinking we can stream. */
  thinking: boolean;
};

/*
 * Pro — NVIDIA Nemotron 3 Ultra: 55B active of 550B total, hybrid
 * Transformer–Mamba MoE, built for frontier reasoning and orchestration.
 * 1M context, `reasoning_effort` support.
 */
const PRO_MODEL_ID =
  process.env.OPENROUTER_PRO_MODEL?.trim() || "nvidia/nemotron-3-ultra-550b-a55b:free";

/*
 * Flash — Google Gemma 4 26B A4B: 25.2B total, only 3.8B active per token, so
 * it runs close to 31B quality at a fraction of the compute. 262k context,
 * configurable thinking, native tool use, multimodal.
 */
const FLASH_MODEL_ID =
  process.env.OPENROUTER_FLASH_MODEL?.trim() || "google/gemma-4-26b-a4b-it:free";

/*
 * Vision — NVIDIA Nemotron 3 Nano Omni accepts text, image, video and audio.
 * Used whenever a request carries source images.
 */
const VISION_MODEL_ID =
  process.env.OPENROUTER_VISION_MODEL?.trim() ||
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

/*
 * Study — Google Gemma 4 31B Instruct: dense 30.7B, strong instruction
 * following and structured-output support, which is what the JSON-returning
 * study tools need.
 *
 * NOTE: this replaced `openai/gpt-oss-20b:free`, which OpenRouter no longer
 * serves — every study-tool request was failing with a 400.
 */
const STUDY_MODEL_ID =
  process.env.OPENROUTER_STUDY_MODEL?.trim() || "google/gemma-4-31b-it:free";

export const CHAT_MODELS: Record<ChatModelTier, ModelSummary> = {
  pro: {
    id: PRO_MODEL_ID,
    label: "Pro",
    blurb: "Heavier reasoning, deeper answers, slower",
    spec: "Nemotron 3 Ultra · 550B MoE (55B active) · 1M context",
    contextLength: 1_000_000,
    speed: 2,
    depth: 5,
    vision: false,
    thinking: true
  },
  flash: {
    id: FLASH_MODEL_ID,
    label: "Flash",
    blurb: "Fast, high quality, ideal for quick questions",
    spec: "Gemma 4 26B A4B · 3.8B active per token · 262k context",
    contextLength: 262_144,
    speed: 5,
    depth: 4,
    vision: true,
    thinking: true
  }
};

export const VISION_MODEL: ModelSummary = {
  id: VISION_MODEL_ID,
  label: "Vision",
  blurb: "Reads images, diagrams and screenshots",
  spec: "Nemotron 3 Nano Omni · text, image, video, audio · 256k context",
  contextLength: 256_000,
  speed: 4,
  depth: 3,
  vision: true,
  thinking: true
};

/** Fallback chains, tried in order when a model is retired or unavailable. */
export const TIER_FALLBACKS: Record<ChatModelTier | "vision" | "study", string[]> = {
  pro: [PRO_MODEL_ID, "nvidia/nemotron-3-super-120b-a12b:free", "google/gemma-4-31b-it:free"],
  flash: [FLASH_MODEL_ID, "nvidia/nemotron-3.5-lightning:free", "google/gemma-4-31b-it:free"],
  vision: [VISION_MODEL_ID, "google/gemma-4-31b-it:free"],
  study: [STUDY_MODEL_ID, "google/gemma-4-26b-a4b-it:free"]
};

/** The ordered, de-duplicated candidate list for a purpose. */
export function getModelChain(
  purpose: ChatModelTier | "vision" | "study"
): string[] {
  return Array.from(new Set(TIER_FALLBACKS[purpose].filter(Boolean)));
}

/* ==========================================================================
   AUTO ROUTING
   --------------------------------------------------------------------------
   Auto prefers Flash. It only escalates to Pro when the prompt contains real
   evidence of heavy work, so the fast path stays the common path.
   ========================================================================== */

type Signal = {
  /** Shown in the selector so the choice is never a black box. */
  label: string;
  weight: number;
  test: RegExp | ((prompt: string) => boolean);
};

const HEAVY_SIGNALS: Signal[] = [
  {
    label: "asks for a proof or derivation",
    weight: 4,
    test: /\b(prove|proof|derive|derivation|show that|hence show|deduce)\b/i
  },
  {
    label: "involves code",
    weight: 4,
    test: /```|\b(function|class|compile|debug|stack trace|exception|null pointer|refactor|algorithm|big-?o|time complexity|regex|typescript|javascript|python|java\b|c\+\+|rust\b|\bsql\b|api endpoint)\b/i
  },
  {
    label: "involves calculus or algebra",
    weight: 3,
    test: /\\(frac|int|sum|sqrt|lim|partial|nabla)|∫|∑|√|\b(integral|differentiate|derivative|eigenvalue|matrix|determinant|logarithm|simultaneous equation|quadratic)\b/i
  },
  {
    label: "involves quantitative reasoning",
    weight: 3,
    test: /\b(calculate|compute|solve|work out|find the value|ratio|probability|moles|molarity|velocity|acceleration|enthalpy|half-?life)\b/i
  },
  {
    label: "asks for an explanation or justification",
    weight: 3,
    test: /\b(explain why|why does|why is|justify|reason about|walk me through|step[- ]by[- ]step|work through|demonstrate)\b/i
  },
  {
    label: "asks for critical analysis",
    weight: 3,
    test: /\b(critically (analyse|analyze|evaluate|discuss)|compare and contrast|evaluate the|to what extent|essay|dissertation|thesis statement|literature review)\b/i
  },
  {
    label: "is a multi-part question",
    weight: 2,
    test: (prompt) => {
      const numbered = prompt.match(/(?:^|\n)\s*(?:\d+[.)]|[a-d][.)])\s+\S/g);
      return (numbered?.length ?? 0) >= 3;
    }
  },
  {
    label: "generates a long document",
    weight: 3,
    test: /\b(mock (exam|paper)|past paper|full exam|exam paper|model answer|mark scheme|study plan|revision timetable|timetable)\b/i
  },
  {
    label: "is a long prompt",
    weight: 2,
    test: (prompt) => prompt.length > 900
  }
];

const LIGHT_SIGNALS: Signal[] = [
  {
    label: "casual message",
    weight: -5,
    test: /^(hi|hey|hello|yo|hiya|good (morning|afternoon|evening)|thanks|thank you|ok|okay|cool|nice)\b[\s\S]{0,40}$/i
  },
  {
    label: "simple lookup",
    weight: -3,
    test: /^(what (is|are|does)|define|who (is|was)|when (is|was|did)|where is|list|name|translate|spell|give me an? example|summarise in one line)\b/i
  },
  {
    label: "short question",
    weight: -2,
    test: (prompt) => prompt.length < 180
  }
];

export type RouteDecision = {
  /** The tier that should actually be used. */
  tier: ChatModelTier;
  /** Net complexity score. >= 3 escalates to Pro. */
  score: number;
  /** Readable reasons, for the UI. */
  signals: string[];
  /** True when the user asked for Auto and we picked the tier ourselves. */
  auto: boolean;
};

const PRO_THRESHOLD = 3;

/**
 * Score a chat prompt and choose a tier.
 *
 * Pure and synchronous so it can run on the server (authoritative) and be
 * previewed on the client (so the selector can show what Auto would pick)
 * without duplicating any logic.
 */
export function classifyChatPrompt(prompt: string): Omit<RouteDecision, "auto"> {
  const text = (prompt || "").trim();
  if (!text) return { tier: "flash", score: 0, signals: [] };

  let score = 0;
  const signals: string[] = [];

  for (const signal of HEAVY_SIGNALS) {
    const matched = typeof signal.test === "function" ? signal.test(text) : signal.test.test(text);
    if (matched) {
      score += signal.weight;
      signals.push(signal.label);
    }
  }

  for (const signal of LIGHT_SIGNALS) {
    const matched = typeof signal.test === "function" ? signal.test(text) : signal.test.test(text);
    if (matched) {
      score += signal.weight;
      signals.push(signal.label);
    }
  }

  // Several distinct questions in one message adds up even when each is small.
  const questionMarks = (text.match(/\?/g) ?? []).length;
  if (questionMarks >= 3) {
    score += 1;
    signals.push("asks several questions");
  }

  return {
    tier: score >= PRO_THRESHOLD ? "pro" : "flash",
    score,
    signals: signals.slice(0, 3)
  };
}

/**
 * Resolve the final model for a request.
 *
 * `hasImages` forces the vision model regardless of the chosen tier — the
 * text-only Pro model cannot see an image.
 */
export function resolveChatModel(
  choice: ChatModelChoice,
  prompt: string,
  hasImages = false
): { modelId: string; tier: ChatModelTier | "vision"; decision?: RouteDecision } {
  if (hasImages) {
    return { modelId: VISION_MODEL.id, tier: "vision" };
  }

  if (choice === "pro" || choice === "flash") {
    return { modelId: CHAT_MODELS[choice].id, tier: choice };
  }

  const decision: RouteDecision = { ...classifyChatPrompt(prompt), auto: true };
  return { modelId: CHAT_MODELS[decision.tier].id, tier: decision.tier, decision };
}

/** Normalize anything arriving from the client into a valid choice. */
export function normalizeModelChoice(value: unknown): ChatModelChoice {
  if (value === "pro" || value === "flash" || value === "auto") return value;
  return "auto";
}

/**
 * Human-readable explanation of an Auto decision, for the thinking indicator
 * and the selector's tooltip.
 */
export function describeDecision(decision: RouteDecision | undefined): string {
  if (!decision) return "";
  if (!decision.auto) return "";

  const target = CHAT_MODELS[decision.tier].label;
  if (!decision.signals.length) {
    return `Auto chose ${target} — nothing here needs extra reasoning.`;
  }
  return `Auto chose ${target} — this ${decision.signals.join(", ")}.`;
}
