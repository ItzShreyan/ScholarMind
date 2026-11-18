/**
 * "Should the tutor look this up?" — the pure decision, kept in its own
 * dependency-free module.
 *
 * This is deliberately separate from `lib/ai/web-research.ts`, which pulls in
 * the document parsers and can only run on the server. Both the chat API route
 * and the chat UI import *this* file, so the stage the student sees
 * ("Searching the web…") is decided by exactly the same function that decides
 * whether a search happens. The label can never claim work the server skipped.
 */

/**
 * Phrases that signal the student wants information a static model cannot
 * hold: anything time-sensitive, numeric, or explicitly "current".
 */
const FRESHNESS_SIGNALS =
  /\b(latest|newest|current(ly)?|recent(ly)?|up[- ]to[- ]date|today|yesterday|this (week|month|year)|20\d\d|news|who won|who is the (current|new)|election|release[sd]?|price[sd]?|statistics|stats|figures|enrolment|enrollment|syllabus (changed|update)|spec(ification)? (changed|update))\b/i;

/**
 * Phrases that pin the answer to the student's own material. These must never
 * trigger a search — "explain my notes" is a request about a document, not a
 * look-up, and sending it to a search engine would be a silent downgrade.
 */
const LOCAL_SOURCE_SIGNALS =
  /\b(my|our|the|these|those|this)\s+(notes?|sources?|files?|documents?|pdf|uploads?|slides?|past ?paper|textbook|workspace|studio|handout|worksheet)\b/i;

/** Requests to *build* a study artefact are tool calls, not look-ups. */
const ARTEFACT_SIGNALS =
  /\b(make|build|create|generate|turn)\b[\s\S]{0,48}\b(quiz|flashcards?|exam|mock|notes|summary|plan|schedule)\b/i;

const CASUAL_SIGNALS =
  /^(hi|hey|hello|yo|hiya|thanks|thank you|ok|okay|cool|nice|how are you)\b[\s\S]{0,40}$/i;

/**
 * A question whose whole object is a pronoun — "how do I solve this?", "what
 * about that?" — cannot be researched, because the thing being asked about is
 * not in the prompt. Searching for it returns noise, so it is answered
 * conversationally instead.
 */
const DANGLING_REFERENCE_SIGNALS =
  /^(?:so\s+|ok(?:ay)?\s+|and\s+|but\s+)?(?:how|what|why|when|where|which|who)\b[^?]{0,24}\b(?:this|that|it|these|those|them|him|her|one)\b\s*\??$/i;

export type ResearchIntentOptions = {
  /** Whether the turn already carries uploaded source text. */
  hasSourceContext: boolean;
};

/**
 * Should the tutor look this question up on the web before answering?
 *
 * Deliberately narrow: a wrong "yes" costs the student a few seconds and adds
 * noise to a source-grounded answer, so every cheap reason to say no is taken
 * first.
 */
export function shouldResearchWeb(
  question: string,
  options: ResearchIntentOptions
): boolean {
  const text = question.trim();

  // Too short to contain a researchable request.
  if (text.length < 12) return false;

  // Greetings and acknowledgements are answered conversationally.
  if (CASUAL_SIGNALS.test(text)) return false;

  // Explicitly about the student's own material.
  if (LOCAL_SOURCE_SIGNALS.test(text)) return false;

  // A generation request belongs to the study tools, not to search.
  if (ARTEFACT_SIGNALS.test(text)) return false;

  if (FRESHNESS_SIGNALS.test(text)) return true;

  /*
   * With no uploaded material there is nothing to ground an answer in, so a
   * real question is looked up rather than answered from the model's memory.
   * The route only reaches this branch for source-less studios.
   */
  if (options.hasSourceContext) return false;

  // A pronoun-only question has no subject to search for.
  if (DANGLING_REFERENCE_SIGNALS.test(text)) return false;

  const looksLikeQuestion = /\?/.test(text) || text.split(/\s+/).length >= 6;
  return looksLikeQuestion;
}

/** Shown while the search is running. One source of truth for the wording. */
export const WEB_RESEARCH_STAGE_LABEL = "Searching the web";

/** Shown while the deeper, multi-source pass is running. */
export const DEEP_RESEARCH_STAGE_LABEL = "Comparing several sources";

/* -------------------------------------------------------------------------
 * How much web research the student asked for
 * -------------------------------------------------------------------------
 * The student controls this from the composer. It is deliberately a *mode*,
 * not a toggle, because "search this question" and "do a full research pass"
 * are different amounts of work and the student should be able to ask for
 * either without changing a global setting.
 */

export type WebSearchMode = "auto" | "off" | "on" | "deep";

export const WEB_SEARCH_MODES: Array<{
  id: WebSearchMode;
  label: string;
  blurb: string;
}> = [
  {
    id: "auto",
    label: "Auto",
    blurb: "Search only when the question is about something your notes cannot cover."
  },
  {
    id: "on",
    label: "Search this",
    blurb: "Look this question up on the web before answering."
  },
  {
    id: "off",
    label: "Notes only",
    blurb: "Answer from your uploaded sources and the conversation alone."
  },
  {
    id: "deep",
    label: "Deep research",
    blurb: "Several searches, cross-checked evidence, and a cited research brief."
  }
];

const MODE_IDS = new Set<string>(WEB_SEARCH_MODES.map((mode) => mode.id));

/** Anything unrecognised becomes Auto rather than failing the request. */
export function normalizeWebSearchMode(value: unknown): WebSearchMode {
  return typeof value === "string" && MODE_IDS.has(value) ? (value as WebSearchMode) : "auto";
}

export type ResearchPlan = {
  /** No search at all for this turn. */
  search: false;
  /** Why not, in the student's terms. */
  reason: string;
};

export type ResearchRun = {
  search: true;
  /** Deep mode runs several queries and cross-checks the evidence. */
  depth: "quick" | "deep";
  reason: string;
};

/**
 * Decide what to do for this turn.
 *
 * The student's explicit choice wins over the heuristic, except where a search
 * would return nothing useful — a two-word greeting sent to a search engine
 * wastes time and adds noise. In those cases the turn is simply answered
 * without research, and the reason says so.
 */
export function planWebResearch(
  mode: WebSearchMode,
  question: string,
  options: ResearchIntentOptions
): ResearchPlan | ResearchRun {
  const text = question.trim();

  if (mode === "off") {
    return { search: false, reason: "Notes only: web search is switched off for this question." };
  }

  if (text.length < 3) {
    return { search: false, reason: "There is nothing specific enough here to look up." };
  }

  if (mode === "on") {
    // "Search this" still cannot search for a greeting or a pronoun-only
    // question, because there is no subject to search for.
    if (CASUAL_SIGNALS.test(text)) {
      return { search: false, reason: "This is a greeting, so there is nothing to look up." };
    }
    return { search: true, depth: "quick", reason: "You asked for this question to be looked up." };
  }

  if (mode === "deep") {
    if (CASUAL_SIGNALS.test(text) || text.split(/\s+/).length < 3) {
      return { search: false, reason: "A short message does not give deep research anything to work with." };
    }
    return {
      search: true,
      depth: "deep",
      reason: "You asked for a multi-source research brief on this question."
    };
  }

  // Auto: the heuristic decides, and its answer is the reason.
  if (shouldResearchWeb(text, options)) {
    return {
      search: true,
      depth: "quick",
      reason: options.hasSourceContext
        ? "This asks about something your uploaded material may not cover."
        : "This studio has no sources yet, so the question is looked up instead."
    };
  }

  return {
    search: false,
    reason: options.hasSourceContext
      ? "This can be answered from your uploaded material."
      : "This does not need anything looked up."
  };
}

/** The stage label for a run, so the indicator never describes work not done. */
export function stageLabelForRun(run: ResearchRun): string {
  return run.depth === "deep" ? DEEP_RESEARCH_STAGE_LABEL : WEB_RESEARCH_STAGE_LABEL;
}
