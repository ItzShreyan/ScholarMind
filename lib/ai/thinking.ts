/**
 * Dynamic thinking indicators.
 *
 * The tagline shown while the tutor is working is derived from the model's own
 * reasoning stream — so it genuinely reflects what the model is doing, rather
 * than cycling canned marketing copy.
 *
 *   reasoning arrives  → extractThoughtTagline() reads the first meaningful
 *                        line of the model's thoughts and shows it
 *   nothing yet        → pickWaitingPhase() advances through the real pipeline
 *                        stages (reading sources, searching, reasoning,
 *                        checking, drafting) so the wait is legible
 *
 * Pure functions only: imported by both the API route and the chat UI.
 */

/** The pipeline stages we can honestly claim to be in. */
export type ThinkingPhase =
  | "reading"
  | "searching"
  | "recalling"
  | "reasoning"
  | "calculating"
  | "checking"
  | "drafting";

export type ThinkingStage = {
  phase: ThinkingPhase;
  /** Shown next to the spinner. */
  label: string;
  /** lucide-react icon name, resolved by the client component. */
  icon: "BookOpen" | "Globe2" | "Brain" | "Sigma" | "ListChecks" | "PenLine";
};

/*
 * Ordered so the label walks through the real sequence of work as time passes.
 * We do not claim to be doing something we are not: no phase implies web
 * access unless the request actually carried imported sources.
 */
export const THINKING_STAGES: ThinkingStage[] = [
  { phase: "reading", label: "Reading your question", icon: "BookOpen" },
  { phase: "searching", label: "Searching your sources", icon: "Globe2" },
  { phase: "recalling", label: "Recalling the relevant material", icon: "Brain" },
  { phase: "calculating", label: "Working through the method", icon: "Sigma" },
  { phase: "reasoning", label: "Reasoning it through", icon: "Brain" },
  { phase: "checking", label: "Checking the working", icon: "ListChecks" },
  { phase: "drafting", label: "Writing the answer", icon: "PenLine" }
];

/** How long each stage is held before advancing, in ms. */
export const THINKING_STAGE_MS = 1500;

/** Never advance past the drafting stage — it is the last honest claim. */
export function pickWaitingStage(elapsedMs: number): ThinkingStage {
  const index = Math.min(
    Math.floor(Math.max(0, elapsedMs) / THINKING_STAGE_MS),
    THINKING_STAGES.length - 1
  );
  return THINKING_STAGES[index];
}

/** The next stage, or null when we are already at the end. */
export function nextWaitingStage(elapsedMs: number): ThinkingStage | null {
  const index = Math.floor(Math.max(0, elapsedMs) / THINKING_STAGE_MS) + 1;
  return THINKING_STAGES[index] ?? null;
}

export const THOUGHT_TAGLINE_MAX = 78;

const TAGLINE_NOISE = [
  /^```.*$/gm, // fenced code
  /`{1,3}/g, // stray backticks
  /^\s*#{1,6}\s*/, // markdown headings
  /^\s*[-*•]\s+/, // bullets
  /^\s*\d+[.)]\s+/, // numbered steps
  /^\s*\*{1,2}(.+?)\*{1,2}\s*$/, // bold-only line
  /\*\*/g
];

function cleanLine(line: string): string {
  let text = line;
  for (const pattern of TAGLINE_NOISE) {
    text = text.replace(pattern, "$1");
  }
  return text.replace(/\s+/g, " ").trim();
}

const STEP_PREFIX = /^(step\s*\d+|first|second|third|next|then|finally|so|okay|ok|alright|hmm|let me|i need to|i should|i'll|i will|we need to|the user)\b[:,]?\s*/i;

const KNOWN_STAGE_HINTS: Array<{ pattern: RegExp; phrase: string }> = [
  { pattern: /\b(maths?|equation|formula|algebra|calculus|integral|derivative|solve)\b/i, phrase: "Working through the maths" },
  { pattern: /\b(code|function|bug|compile|syntax|variable|class|api)\b/i, phrase: "Reading the code" },
  { pattern: /\b(source|notes?|document|pdf|file|uploaded)\b/i, phrase: "Checking your sources" },
  { pattern: /\b(quiz|question|answer|exam|marks?)\b/i, phrase: "Working out the answer" },
  { pattern: /\b(define|definition|means|term)\b/i, phrase: "Nailing down the definition" },
  { pattern: /\b(compare|difference|versus|vs\.?)\b/i, phrase: "Comparing the options" },
  { pattern: /\b(step|method|process|procedure)\b/i, phrase: "Ordering the steps" },
  { pattern: /\b(check|verify|confirm|make sure|double)\b/i, phrase: "Checking the working" }
];

/**
 * Turn the model's reasoning so far into a single readable line.
 *
 * Returns null while there is nothing useful yet, so the caller can fall back
 * to the waiting stages instead of showing an empty label.
 */
export function extractThoughtTagline(reasoning: string): string | null {
  if (!reasoning) return null;

  const lines = reasoning
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  if (!lines.length) return null;

  /*
   * Prefer the first line that is a real sentence rather than a fragment:
   * long enough to mean something, short enough to fit, and not pure notation.
   */
  const candidate =
    lines.find((line) => line.length >= 14 && line.length <= THOUGHT_TAGLINE_MAX) ??
    lines.find((line) => line.length > THOUGHT_TAGLINE_MAX) ??
    lines[0];

  let tagline = candidate.replace(STEP_PREFIX, "").replace(/[.;:,]+$/, "").trim();

  // A line that is mostly symbols or LaTeX is not a useful tagline.
  if (tagline.length < 8 || /^[\s\d\W]+$/.test(tagline)) {
    const hinted = KNOWN_STAGE_HINTS.find((hint) => hint.pattern.test(reasoning));
    return hinted ? hinted.phrase : "Working through it";
  }

  if (tagline.length > THOUGHT_TAGLINE_MAX) {
    const truncated = tagline.slice(0, THOUGHT_TAGLINE_MAX);
    const lastSpace = truncated.lastIndexOf(" ");
    tagline = `${truncated.slice(0, lastSpace > 40 ? lastSpace : THOUGHT_TAGLINE_MAX).trim()}…`;
  }

  return tagline.charAt(0).toUpperCase() + tagline.slice(1);
}

/**
 * One-line summary of what was actually used, shown after the answer lands.
 * Keeping this honest is the point: no invented tool calls.
 */
export function describeThinkingActivity(options: {
  usedSources: number;
  hasImages: boolean;
  tierLabel: string;
}): string {
  const parts: string[] = [];
  if (options.hasImages) parts.push("read your images");
  if (options.usedSources > 0) {
    parts.push(`read ${options.usedSources} source${options.usedSources === 1 ? "" : "s"}`);
  }
  parts.push(`answered with ${options.tierLabel}`);
  return parts.join(" · ");
}
