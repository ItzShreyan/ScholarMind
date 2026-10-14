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
