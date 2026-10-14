/**
 * Live web research for the tutor.
 *
 * ScholarMind's tutor is grounded in the student's uploaded sources. That is
 * the right default, but it leaves two honest gaps:
 *
 *   1. a question about something recent ("what changed in the 2026 spec?")
 *      cannot be answered from notes the student uploaded last term, and
 *   2. a studio with no source-enabled files yet gives the tutor nothing at
 *      all to reason from.
 *
 * This module closes both, conservatively. It decides when a search is
 * genuinely warranted, runs the existing source search with a hard deadline,
 * and returns a compact prompt block plus structured citations the UI can
 * show. It never throws and never blocks an answer: if research fails or runs
 * out of time the chat simply proceeds the way it did before.
 */

import { searchWebSources } from "@/lib/sources/web";

export type WebCitation = {
  title: string;
  url: string;
  source: string;
  trustLabel: string;
};

export type WebResearch = {
  /** True only when a search actually ran and returned usable material. */
  used: boolean;
  /** Compact, prompt-ready findings. Empty when unused. */
  summary: string;
  citations: WebCitation[];
};

const EMPTY_RESEARCH: WebResearch = { used: false, summary: "", citations: [] };

/** Hard ceiling on the whole research step, so chat latency stays bounded. */
export const WEB_RESEARCH_DEADLINE_MS = 9000;

const MAX_SNIPPET_CHARS = 420;
const MAX_SUMMARY_CHARS = 5200;
const DEFAULT_MAX_RESULTS = 5;

/*
 * The decision itself — "is this question worth a search?" — lives in
 * `lib/ai/research-intent.ts`, a dependency-free module the chat UI imports
 * too, so the stage label the student sees is produced by the same function
 * that decides whether a search runs. This module only executes the search.
 */

function cleanLine(value: string | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function clip(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
}

/**
 * Run the research step. Returns an empty result on any failure, timeout or
 * empty search — the caller never has to handle an error case.
 */
export async function researchWeb(
  question: string,
  options?: { maxResults?: number; deadlineMs?: number }
): Promise<WebResearch> {
  const maxResults = Math.max(1, Math.min(options?.maxResults ?? DEFAULT_MAX_RESULTS, 8));
  const deadlineMs = Math.max(1500, options?.deadlineMs ?? WEB_RESEARCH_DEADLINE_MS);

  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeout = new Promise<null>((resolve) => {
      deadlineTimer = setTimeout(() => resolve(null), deadlineMs);
    });

    const settled = await Promise.race([
      searchWebSources(question, "scholar").catch(() => null),
      timeout
    ]);

    if (!settled || !Array.isArray(settled.results) || !settled.results.length) {
      return EMPTY_RESEARCH;
    }

    const results = settled.results.slice(0, maxResults);

    const citations: WebCitation[] = results.map((result) => ({
      title: cleanLine(result.title),
      url: result.url,
      source: cleanLine(result.source),
      trustLabel: result.trustLabel
    }));

    const blocks = results.map((result, index) =>
      [
        `[${index + 1}] ${cleanLine(result.title)}`,
        `Source: ${cleanLine(result.source)} (${result.trustLabel}) — ${result.url}`,
        clip(cleanLine(result.snippet), MAX_SNIPPET_CHARS)
      ]
        .filter(Boolean)
        .join("\n")
    );

    const summary = clip(
      [
        "## Live web sources",
        "These were fetched for this specific question. Treat them as supplementary evidence: the student's uploaded material still wins where the two disagree, and you must say so plainly when they conflict.",
        "Cite them inline by their bracketed number, e.g. [1]. Never invent a citation that is not in this list. If they do not answer the question, say what is still missing.",
        "",
        ...blocks
      ].join("\n\n"),
      MAX_SUMMARY_CHARS
    );

    return { used: true, summary, citations };
  } catch {
    return EMPTY_RESEARCH;
  } finally {
    if (deadlineTimer) clearTimeout(deadlineTimer);
  }
}
