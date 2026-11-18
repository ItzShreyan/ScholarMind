/**
 * OpenRouter model registry for ScholarMind.
 *
 * Three ways a request can be routed:
 *
 *   Flash  → the fast tier. Everyday definitions, short explanations, simple
 *            lookups, quick follow-ups, translations, ordinary revision.
 *   Pro    → the reasoning tier. Proofs, derivations, multi-step maths and
 *            physics, real programming, critical analysis, long documents.
 *   Auto   → classifies the *current question* and picks one of the above,
 *            preferring Flash. The decision is shown in the composer before
 *            the question is sent, and the server re-decides independently.
 *
 * Vision is a separate route, never a tier: a text-only model must never be
 * handed an image.
 *
 * ---------------------------------------------------------------------------
 * Every id below was checked against `GET https://openrouter.ai/api/v1/models`
 * at implementation time, including its live pricing and input modalities.
 * Free tiers are volatile — a model can be retired without notice — so each
 * purpose has an ordered fallback chain and the UI reports the id that actually
 * answered rather than the id we asked for.
 *
 * Verified on 13/11/2026:
 *   nvidia/nemotron-3-ultra-550b-a55b:free         1.0M ctx  free  text
 *   baidu/ernie-5.5-flash-preview:free             1.0M ctx  free  text
 *   nvidia/nemotron-3.5-super-vl:free              1.0M ctx  free  text+image
 *   nvidia/nemotron-3.5-lightning:free             1.0M ctx  free  text
 *   google/gemma-4-26b-a4b-it:free                 262k ctx  free  text+image
 *   google/gemma-4-31b-it:free                     262k ctx  free  text+image
 *   nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free  256k  free  text+image+audio
 *
 * `nvidia/nemotron-3-super-120b-a12b:free` was in the old Pro chain and no
 * longer exists — it has been removed rather than left to fail at runtime.
 *
 * Never hardcode a model id anywhere else in the app. Import from here.
 * ---------------------------------------------------------------------------
 */

export type ChatModelTier = "pro" | "flash";
export type ChatModelChoice = "auto" | ChatModelTier;
/** What a request is actually for. Vision/study are routes, not user choices. */
export type ModelPurpose = ChatModelTier | "vision" | "study";

export type ModelSummary = {
  /** OpenRouter model id. */
  id: string;
  /** Product name shown in the selector. */
  label: string;
  /** One line, shown under the label in the selector. */
  blurb: string;
  /** Technical spec line, shown in tooltips and the landing page. */
  spec: string;
  contextLength: number;
  /** 5 = fastest. */
  speed: 1 | 2 | 3 | 4 | 5;
  /** 5 = strongest reasoning. */
  depth: 1 | 2 | 3 | 4 | 5;
  /** Whether the model accepts image input. */
  vision: boolean;
  /** Whether the model exposes a reasoning trace we can stream. */
  thinking: boolean;
};

/* -------------------------------------------------------------------------
 * Environment overrides
 * -------------------------------------------------------------------------
 * Hosts can swap any tier without a code change. An override replaces the
 * primary id only — the fallback chain below it still applies, so a bad
 * override degrades to a working model instead of failing.
 */

function envModel(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value || fallback;
}

/* -------------------------------------------------------------------------
 * The registry
 * ------------------------------------------------------------------------- */

/**
 * Pro — Nemotron 3 Ultra: 550B MoE with 55B active, hybrid Transformer–Mamba,
 * built for frontier reasoning. Text only, 1M context.
 */
const PRO_MODEL: ModelSummary = {
  id: envModel("OPENROUTER_PRO_MODEL", "nvidia/nemotron-3-ultra-550b-a55b:free"),
  label: "Pro",
  blurb: "Heavier reasoning, deeper answers, slower",
  spec: "Nemotron 3 Ultra · 550B MoE (55B active) · 1M context",
  contextLength: 1_000_000,
  speed: 2,
  depth: 5,
  vision: false,
  thinking: true
};

/**
 * Flash — ERNIE 5.5 Flash: 1M context, free tier, tuned for fast turnaround on
 * ordinary questions. Text only, which is why vision never routes here.
 */
const FLASH_MODEL: ModelSummary = {
  id: envModel("OPENROUTER_FLASH_MODEL", "baidu/ernie-5.5-flash-preview:free"),
  label: "Flash",
  blurb: "Fast model for everyday questions and quick, high-quality answers",
  spec: "ERNIE 5.5 Flash · 1M context · tuned for latency",
  contextLength: 1_024_000,
  speed: 5,
  depth: 4,
  vision: false,
  thinking: true
};

/**
 * Vision — Nemotron 3 Nano Omni reads text, images, video and audio in one
 * multimodal pass. Only used when a request actually carries an image.
 */
const VISION_MODEL_SUMMARY: ModelSummary = {
  id: envModel(
    "OPENROUTER_VISION_MODEL",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
  ),
  label: "Vision",
  blurb: "Reads images, diagrams and screenshots",
  spec: "Nemotron 3 Nano Omni · text, image, video, audio · 256k context",
  contextLength: 256_000,
  speed: 4,
  depth: 3,
  vision: true,
  thinking: true
};

/**
 * Study — used by the JSON-returning study tools (quiz, flashcards, exam,
 * notes). Strong instruction following is the requirement here, not raw speed
 * or frontier reasoning.
 */
const STUDY_MODEL_SUMMARY: ModelSummary = {
  id: envModel("OPENROUTER_STUDY_MODEL", "google/gemma-4-31b-it:free"),
  label: "Study",
  blurb: "Structured output for quizzes, flashcards and exam papers",
  spec: "Gemma 4 31B Instruct · 262k context · structured output",
  contextLength: 262_144,
  speed: 3,
  depth: 4,
  vision: true,
  thinking: true
};

/** User-facing tiers. `CHAT_MODELS.pro` / `.flash` are the only ones a student
 *  can choose by name. */
export const CHAT_MODELS: Record<ChatModelTier, ModelSummary> = {
  pro: PRO_MODEL,
  flash: FLASH_MODEL
};

/** Kept for existing call sites that only need the vision id. */
export const VISION_MODEL: ModelSummary = VISION_MODEL_SUMMARY;

/** Every purpose → ordered candidate list, primary first. De-duplicated on read. */
export const TIER_FALLBACKS: Record<ModelPurpose, string[]> = {
  pro: [
    PRO_MODEL.id,
    // 1M-context multimodal model; a genuine step down in reasoning depth, but
    // a working model rather than a dead id.
    "nvidia/nemotron-3.5-super-vl:free",
    "google/gemma-4-31b-it:free"
  ],
  flash: [
    FLASH_MODEL.id,
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-3.5-lightning:free"
  ],
  vision: [
    VISION_MODEL_SUMMARY.id,
    "nvidia/nemotron-3.5-super-vl:free",
    "google/gemma-4-26b-a4b-it:free"
  ],
  study: [STUDY_MODEL_SUMMARY.id, "google/gemma-4-26b-a4b-it:free"]
};

/** The ordered, de-duplicated candidate list for a purpose. */
export function getModelChain(purpose: ModelPurpose): string[] {
  return Array.from(new Set(TIER_FALLBACKS[purpose].filter(Boolean)));
}

/** Display name for a purpose. */
export function getPurposeLabel(purpose: ModelPurpose): string {
  if (purpose === "vision") return VISION_MODEL_SUMMARY.label;
  if (purpose === "study") return STUDY_MODEL_SUMMARY.label;
  return CHAT_MODELS[purpose].label;
}

/**
 * Describe the model that actually answered.
 *
 * A fallback must never be presented as the tier the student asked for. When
 * the answering id differs from the tier's primary id, `isFallback` is true and
 * `label` names the real model, so the answer footer cannot overstate itself.
 */
export function describeRespondingModel(
  answeredModelId: string,
  purpose: ModelPurpose
): { label: string; isFallback: boolean; primaryId: string } {
  const primaryId =
    purpose === "vision"
      ? VISION_MODEL_SUMMARY.id
      : purpose === "study"
        ? STUDY_MODEL_SUMMARY.id
        : CHAT_MODELS[purpose].id;

  if (!answeredModelId || answeredModelId === primaryId) {
    return { label: getPurposeLabel(purpose), isFallback: false, primaryId };
  }

  // Gemini is the last-resort provider and is labelled as such by the route.
  if (answeredModelId === "gemini-fallback") {
    return { label: "Gemini (fallback)", isFallback: true, primaryId };
  }

  const shortId = answeredModelId.replace(/:free$/, "").split("/").pop() ?? answeredModelId;

  return {
    label: `${getPurposeLabel(purpose)} · ${shortId}`,
    isFallback: true,
    primaryId
  };
}

/* =========================================================================
 * AUTO ROUTING
 * -------------------------------------------------------------------------
 * A deterministic keyword/structure classifier. Deliberately simple, fully
 * testable, and readable: every rule that fires is named so the composer can
 * say *why* Auto picked a tier.
 *
 * The governing rule is that Auto prefers Flash. Pro has to be earned.
 * ========================================================================= */

type Signal = {
  /** Shown in the composer, so `this <label>` reads as English. */
  label: string;
  weight: number;
  test: RegExp | ((prompt: string) => boolean);
};

/** Signals that argue for the reasoning tier. */
const HEAVY_SIGNALS: Signal[] = [
  {
    label: "asks for a proof or derivation",
    weight: 5,
    test: /\b(prove|proof|derive|derivation|show that|hence show|deduce that|by induction)\b/i
  },
  {
    label: "involves programming",
    weight: 4,
    test: /```|\b(function|class|compile|debug|stack trace|exception|refactor|algorithm|big-?o|time complexity|regex|typescript|javascript|python|java\b|c\+\+|rust\b|\bsql\b|api endpoint|recursion|pointer|compiler)\b/i
  },
  {
    label: "involves advanced mathematics",
    weight: 4,
    test: /\\(frac|int|sum|sqrt|lim|partial|nabla)|∫|∑|√|\b[a-z]\s*\^\s*[2-9]|\b(integral|differentiate|derivative|eigenvalue|matrix|determinant|simultaneous equation|quadratic|logarithm|binomial|trigonometric)\b/i
  },
  {
    label: "asks for a worked method",
    weight: 4,
    test: /\b(show (your|all|each) (working|step)|step[- ]by[- ]step|worked (example|solution)|hence (find|show|deduce)|full (method|derivation)|marks? for (method|working))\b/i
  },
  {
    label: "requires calculation",
    weight: 2,
    test: /\b(calculate|compute|solve for|work out|find the value|moles|molarity|enthalpy|half-?life|acceleration|momentum)\b/i
  },
  {
    label: "asks for critical analysis",
    weight: 4,
    test: /\b(critically (analyse|analyze|evaluate|discuss)|evaluate the extent|to what extent|essay|dissertation|thesis statement|literature review|mark scheme)\b/i
  },
  {
    label: "asks for a comparison",
    weight: 3,
    test: /\b(compare and contrast|compare the|differences? between .+ and|versus|vs\.?)\b/i
  },
  {
    label: "generates a long document",
    weight: 4,
    test: /\b(mock (exam|paper)|past paper|full exam|exam paper|model answer|study plan|revision timetable|revision plan)\b/i
  },
  {
    label: "is a multi-part question",
    weight: 3,
    test: (prompt) => {
      const numbered = prompt.match(/(?:^|\n)\s*(?:\d+[.)]|[a-d][.)])\s+\S/gi);
      return (numbered?.length ?? 0) >= 3;
    }
  },
  {
    label: "asks several questions",
    weight: 2,
    test: (prompt) => (prompt.match(/\?/g) ?? []).length >= 3
  },
  {
    label: "is a very long prompt",
    weight: 1,
    test: (prompt) => prompt.length > 1200
  }
];

/** Signals that argue for the fast tier. */
const LIGHT_SIGNALS: Signal[] = [
  {
    label: "casual message",
    weight: -6,
    test: /^(hi|hey|hello|yo|hiya|good (morning|afternoon|evening)|thanks|thank you|ok|okay|cool|nice)\b[\s\S]{0,40}$/i
  },
  {
    label: "simple lookup",
    weight: -4,
    test: /^(what (is|are|does)|define|who (is|was)|when (is|was|did)|where is|list|name|translate|spell|summarise in one line|summarize in one line)\b/i
  },
  {
    label: "translation or spelling",
    weight: -3,
    test: /\b(translate|how do you spell|what does .+ mean in (french|spanish|german|italian|japanese|mandarin))\b/i
  },
  {
    label: "short question",
    weight: -2,
    test: (prompt) => prompt.length < 160
  }
];

export type RouteDecision = {
  /** The tier that should actually be used. */
  tier: ChatModelTier;
  /** Net complexity score. At or above the threshold, Pro is used. */
  score: number;
  /** Readable reasons, most significant first. */
  signals: string[];
  /** True when the student left it on Auto and we picked the tier. */
  auto: boolean;
};

/** Pro has to be earned. Flash is the default for everything else. */
const PRO_THRESHOLD = 4;

/**
 * Score a chat prompt and choose a tier.
 *
 * Pure and synchronous, so the server (authoritative) and the composer
 * (preview) run the identical logic and can never disagree.
 */
export function classifyChatPrompt(prompt: string): Omit<RouteDecision, "auto"> {
  const text = (prompt || "").trim();
  if (!text) return { tier: "flash", score: 0, signals: [] };

  const heavyMatched: string[] = [];
  let heavyScore = 0;

  for (const signal of HEAVY_SIGNALS) {
    const matched = typeof signal.test === "function" ? signal.test(text) : signal.test.test(text);
    if (!matched) continue;
    heavyScore += signal.weight;
    heavyMatched.push(signal.label);
  }

  /*
   * Positive evidence decides on its own. The light signals exist to explain
   * why a prompt stayed on Flash, not to cancel real evidence — without this
   * separation a one-line proof was routed to Flash purely for being short,
   * which is the opposite of what the student asked for.
   */
  if (heavyScore > 0) {
    return {
      tier: heavyScore >= PRO_THRESHOLD ? "pro" : "flash",
      score: heavyScore,
      signals: heavyMatched.slice(0, 3)
    };
  }

  // No positive evidence: the light signals decide, and can only ever confirm
  // Flash. They are still reported so the explanation is complete.
  const lightMatched: string[] = [];
  let lightScore = 0;

  for (const signal of LIGHT_SIGNALS) {
    const matched = typeof signal.test === "function" ? signal.test(text) : signal.test.test(text);
    if (!matched) continue;
    lightScore += signal.weight;
    lightMatched.push(signal.label);
  }

  return { tier: "flash", score: lightScore, signals: lightMatched.slice(0, 3) };
}

/**
 * Resolve the final model for a request.
 *
 * `hasImages` forces the vision route regardless of the chosen tier — neither
 * Pro nor Flash can see an image.
 */
export function resolveChatModel(
  choice: ChatModelChoice,
  prompt: string,
  hasImages = false
): { modelId: string; tier: ModelPurpose; decision?: RouteDecision } {
  if (hasImages) {
    return { modelId: VISION_MODEL_SUMMARY.id, tier: "vision" };
  }

  if (choice === "pro" || choice === "flash") {
    return { modelId: CHAT_MODELS[choice].id, tier: choice };
  }

  const decision: RouteDecision = { ...classifyChatPrompt(prompt), auto: true };
  return { modelId: CHAT_MODELS[decision.tier].id, tier: decision.tier, decision };
}

/** Normalise anything arriving from the client into a valid choice. */
export function normalizeModelChoice(value: unknown): ChatModelChoice {
  if (value === "pro" || value === "flash" || value === "auto") return value;
  return "auto";
}

/**
 * Human-readable explanation of an Auto decision, shown under the picker and
 * on the answer itself.
 */
export function describeDecision(decision: RouteDecision | undefined): string {
  if (!decision || !decision.auto) return "";

  const target = CHAT_MODELS[decision.tier].label;
  const reasons = decision.signals.filter(Boolean);

  if (!reasons.length) {
    return `Auto selected ${target}: nothing here needs extra reasoning.`;
  }

  // Pro is an escalation, so it gets a sentence. Flash is the default, so the
  // reasons are listed plainly — no need to justify staying fast.
  if (decision.tier === "pro") {
    return `Auto selected ${target} because this ${reasons.join(" and ")}.`;
  }

  return `Auto selected ${target}: ${reasons.join(", ")}.`;
}

/** One-line summary of the tier for the composer, when Auto is off. */
export function describeChoice(choice: ChatModelChoice): string {
  if (choice === "auto") return "Auto picks the fastest model that can answer well.";
  return `${CHAT_MODELS[choice].label}: ${CHAT_MODELS[choice].blurb}.`;
}
