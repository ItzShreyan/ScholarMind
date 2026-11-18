/**
 * Deep research for the tutor.
 *
 * `lib/ai/web-research.ts` runs one search and hands back a handful of
 * snippets. That is right for "what changed in the 2026 spec?", but it is not
 * enough for a question that deserves a research brief: one query finds one
 * phrasing of the topic, and a single result list gives the model no way to
 * notice that two sources disagree.
 *
 * This module runs a small, bounded set of *different* queries about the same
 * question, merges what comes back, and builds an evidence set the model must
 * reason over:
 *
 *   - every query is on a hard deadline, and the whole pass has a ceiling
 *   - results are de-duplicated by URL and ranked by how many independent
 *     queries surfaced them, which is the cheapest honest signal of
 *     corroboration available without a second model call
 *   - sources are grouped by domain so the brief can say how much independent
 *     corroboration exists rather than implying consensus from one host
 *   - pairs of excerpts that discuss the same terms but diverge on a number or
 *     a negation are quoted to the model as a possible conflict. The quotes are
 *     real text from the sources; the judgement is left to the answer, which is
 *     told to say plainly what is disputed.
 *
 * It never throws and never blocks an answer. A failed pass returns `used:
 * false` and the tutor answers exactly as it would have without research.
 */

import { searchWebSources } from "@/lib/sources/web";

export type DeepResearchCitation = {
  title: string;
  url: string;
  source: string;
  trustLabel: string;
  /** How many of the queries surfaced this result. 1 means unconfirmed. */
  corroborations: number;
  /** The excerpt that will be quoted to the model, for the UI to display. */
  excerpt: string;
};

export type DeepResearchFinding = {
  /** The query that produced this cluster of evidence. */
  query: string;
  /** Sources that answered it, most corroborated first. */
  citations: DeepResearchCitation[];
};

export type SourceTension = {
  /** Both sides are verbatim excerpts from the sources below. */
  left: { url: string; title: string; quote: string };
  right: { url: string; title: string; quote: string };
  /** The shared terms that made this pair worth comparing. */
  sharedTerms: string[];
  /** What differs — a figure, or a negated claim. */
  difference: "figure" | "negation";
};

export type DeepResearch = {
  /** True only when at least one search actually returned usable material. */
  used: boolean;
  /** Prompt-ready evidence brief. Empty when unused. */
  summary: string;
  citations: DeepResearchCitation[];
  findings: DeepResearchFinding[];
  /** Genuinely independent domains that contributed evidence. */
  domains: string[];
  /** Queries that were actually run, in order, for the UI to list. */
  queries: string[];
  /** Possible disagreements, each backed by quoted source text. */
  tensions: SourceTension[];
  /** Set when the pass was cut short or partly failed, for honest reporting. */
  degraded?: string;
};

const EMPTY_RESEARCH: DeepResearch = {
  used: false,
  summary: "",
  citations: [],
  findings: [],
  domains: [],
  queries: [],
  tensions: []
};

/** Ceiling on the whole deep pass. Long enough for three searches, short
 *  enough that the student is not left waiting without a word. */
export const DEEP_RESEARCH_DEADLINE_MS = 14_000;

const MAX_QUERIES = 3;
const MAX_SOURCES = 8;
const MAX_EXCERPT_CHARS = 520;
const MAX_SUMMARY_CHARS = 9_000;
const MIN_EXCERPT_CHARS = 40;

/** Words that carry no topic — dropped before building facet queries. */
const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "you", "are",
  "was", "were", "what", "when", "where", "which", "who", "why", "how", "does",
  "did", "can", "could", "should", "would", "will", "have", "has", "had", "not",
  "but", "about", "into", "over", "under", "between", "explain", "describe",
  "tell", "give", "show", "help", "please", "need", "want", "know", "there",
  "their", "they", "them", "then", "than", "also", "just", "some", "any"
]);

/** Facet suffixes, chosen so each query asks a genuinely different thing. */
const FACETS: Array<{ suffix: string; weight: number }> = [
  { suffix: "", weight: 3 },
  { suffix: "explanation and examples", weight: 2 },
  { suffix: "evidence and current research", weight: 1 }
];

function cleanLine(value: string | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function clip(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** The topic terms of a question, in order, longest first so the most
 *  specific word survives any length cap. */
function topicTerms(question: string): string[] {
  return Array.from(
    new Set(
      question
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
        .split(/\s+/)
        .filter((term) => term.length >= 3 && !STOP_WORDS.has(term))
    )
  ).sort((a, b) => b.length - a.length);
}

/**
 * Build the queries for this question.
 *
 * The first is the question as asked, because that is what the student means.
 * The rest narrow it to the topic terms plus a facet, so the second search
 * finds a textbook explanation rather than another copy of the first list.
 */
export function buildResearchQueries(question: string): string[] {
  const base = cleanLine(question).replace(/\s+/g, " ").slice(0, 160);
  if (!base) return [];

  const terms = topicTerms(base);
  const topic = terms.slice(0, 6).join(" ");
  if (!topic) return [base];

  const queries = [base];
  for (const facet of FACETS) {
    if (queries.length >= MAX_QUERIES) break;
    const query = cleanLine(`${topic} ${facet.suffix}`);
    if (query && !queries.some((existing) => existing.toLowerCase() === query.toLowerCase())) {
      queries.push(query);
    }
  }

  return queries.slice(0, MAX_QUERIES);
}

/* -------------------------------------------------------------------------
 * Evidence assembly
 * ------------------------------------------------------------------------- */

type RawResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  trustLabel: string;
  queries: Set<string>;
};

function mergeResults(
  perQuery: Array<{ query: string; results: Array<{ title: string; url: string; snippet: string; source: string; trustLabel: string }> }>
): RawResult[] {
  const byUrl = new Map<string, RawResult>();

  for (const batch of perQuery) {
    for (const result of batch.results) {
      if (!result.url) continue;

      const existing = byUrl.get(result.url);
      if (existing) {
        // Keep the longest snippet seen for this URL: the same page can be
        // summarised differently by different queries and the longer text is
        // the more useful evidence.
        if (result.snippet.length > existing.snippet.length) {
          existing.snippet = result.snippet;
        }
        existing.queries.add(batch.query);
        continue;
      }

      byUrl.set(result.url, {
        title: cleanLine(result.title) || hostOf(result.url),
        url: result.url,
        snippet: cleanLine(result.snippet),
        source: cleanLine(result.source) || hostOf(result.url),
        trustLabel: result.trustLabel,
        queries: new Set([batch.query])
      });
    }
  }

  const trustRank: Record<string, number> = { Verified: 3, Scholar: 2, Trusted: 1, Web: 0 };

  return Array.from(byUrl.values()).sort((a, b) => {
    // Corroboration first: a page two different queries both found is more
    // likely to be about the question than one that only a narrow query hit.
    if (b.queries.size !== a.queries.size) return b.queries.size - a.queries.size;
    const trustDelta = (trustRank[b.trustLabel] ?? 0) - (trustRank[a.trustLabel] ?? 0);
    if (trustDelta !== 0) return trustDelta;
    return b.snippet.length - a.snippet.length;
  });
}

/** Terms shared by two excerpts, used only to decide whether they are talking
 *  about the same thing before comparing what they say. */
function sharedTopicTerms(left: string, right: string): string[] {
  const leftTerms = new Set(
    left.toLowerCase().replace(/[^\p{L}\p{N}\s-]+/gu, " ").split(/\s+/).filter((term) => term.length >= 4)
  );
  const rightTerms = new Set(
    right.toLowerCase().replace(/[^\p{L}\p{N}\s-]+/gu, " ").split(/\s+/).filter((term) => term.length >= 4)
  );

  return Array.from(leftTerms).filter((term) => rightTerms.has(term) && !STOP_WORDS.has(term));
}

const NUMERIC_TOKEN = /\b\d+(?:[.,]\d+)?%?\b/g;
const NEGATION = /\b(not|no|never|cannot|can't|isn't|aren't|doesn't|don't|without|unlike|contrary|false|myth)\b/i;

/**
 * Find pairs of excerpts from *different* sources that discuss the same terms
 * but disagree on a figure or on polarity.
 *
 * This is intentionally conservative. It only reports a pair when the excerpts
 * share at least two substantive terms, and it only quotes real text — the
 * brief tells the model these are possible conflicts, not detected ones, so an
 * answer can never claim a source said something it did not.
 */
export function findSourceTensions(citations: DeepResearchCitation[]): SourceTension[] {
  const tensions: SourceTension[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < citations.length; i += 1) {
    for (let j = i + 1; j < citations.length; j += 1) {
      const left = citations[i];
      const right = citations[j];

      // Same host is the same editorial voice, not an independent check.
      if (hostOf(left.url) === hostOf(right.url)) continue;

      const shared = sharedTopicTerms(left.excerpt, right.excerpt).slice(0, 4);
      if (shared.length < 2) continue;

      const leftNumbers = (left.excerpt.match(NUMERIC_TOKEN) ?? []).slice(0, 4);
      const rightNumbers = (right.excerpt.match(NUMERIC_TOKEN) ?? []).slice(0, 4);
      const numberDisagrees =
        leftNumbers.length > 0 &&
        rightNumbers.length > 0 &&
        leftNumbers.some((value) => !rightNumbers.includes(value));

      const leftNegated = NEGATION.test(left.excerpt);
      const rightNegated = NEGATION.test(right.excerpt);
      const negationDisagrees = leftNegated !== rightNegated;

      if (!numberDisagrees && !negationDisagrees) continue;

      const key = [left.url, right.url].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      tensions.push({
        left: { url: left.url, title: left.title, quote: clip(left.excerpt, 220) },
        right: { url: right.url, title: right.title, quote: clip(right.excerpt, 220) },
        sharedTerms: shared,
        difference: numberDisagrees ? "figure" : "negation"
      });

      // Three is enough to make the point; more turns the brief into noise.
      if (tensions.length >= 3) return tensions;
    }
  }

  return tensions;
}

/** The prompt block. Written as instructions plus evidence, never as a
 *  conclusion — the answer has to do the reasoning. */
function buildSummary(
  question: string,
  findings: DeepResearchFinding[],
  tensions: SourceTension[],
  domains: string[]
): string {
  const sections: string[] = [];

  sections.push(
    [
      "## Deep research brief",
      `Ran ${findings.length} searches for this question and kept ${findings.reduce((total, finding) => total + finding.citations.length, 0)} sources across ${domains.length} independent ${
        domains.length === 1 ? "domain" : "domains"
      }.`,
      "How to use this: treat these as evidence to weigh, not as an answer to copy. Your own uploaded material still wins where the two conflict, and you must say so plainly when they do.",
      "Cite inline by the bracketed number that appears against each source below. Never cite a URL that is not in this brief, and never invent a figure, date or quotation.",
      "Where the evidence does not settle the question, say that it is unsettled rather than filling the gap with something plausible."
    ].join("\n")
  );

  let index = 0;
  for (const finding of findings) {
    const lines = [`### Search: ${finding.query}`];
    for (const citation of finding.citations) {
      index += 1;
      lines.push(
        [
          `[${index}] ${citation.title}`,
          `Source: ${citation.source} (${citation.trustLabel}) — ${citation.url}`,
          citation.corroborations > 1
            ? `Found by ${citation.corroborations} of the searches.`
            : "Found by one search only — not corroborated.",
          citation.excerpt
        ]
          .filter(Boolean)
          .join("\n")
      );
    }
    sections.push(lines.join("\n\n"));
  }

  if (tensions.length) {
    sections.push(
      [
        "### Possible disagreements between sources",
        "These pairs share subject matter but differ on a figure or on polarity. Both quotations are verbatim. Decide from the surrounding evidence which is right, or report the disagreement honestly if the evidence does not settle it.",
        ...tensions.map((tension, position) =>
          [
            `Conflict ${position + 1} (${tension.difference === "figure" ? "different figures" : "opposite claims"}), sharing: ${tension.sharedTerms.join(", ")}`,
            `— ${tension.left.title}: "${tension.left.quote}"`,
            `— ${tension.right.title}: "${tension.right.quote}"`
          ].join("\n")
        )
      ].join("\n\n")
    );
  } else if (domains.length > 1) {
    sections.push(
      "### Agreement\nNo two sources in this brief contradict each other on the material retrieved. That is absence of disagreement, not proof: say what was checked rather than claiming the question is settled."
    );
  }

  if (domains.length === 1) {
    sections.push(
      "### Corroboration warning\nEvery source here is from the same domain, so nothing in this brief is independently corroborated. Say so rather than presenting it as established."
    );
  }

  return clip(sections.join("\n\n"), MAX_SUMMARY_CHARS);
}

/* -------------------------------------------------------------------------
 * The pass
 * ------------------------------------------------------------------------- */

/**
 * Run the deep research pass.
 *
 * Every failure path returns `used: false` or a `degraded` note; the caller
 * never has to handle an exception. If at least one query returns evidence the
 * brief is still produced, with `degraded` explaining what was lost.
 */
export async function researchWebDeep(
  question: string,
  options?: { deadlineMs?: number; maxSources?: number }
): Promise<DeepResearch> {
  const deadlineMs = Math.max(2_000, options?.deadlineMs ?? DEEP_RESEARCH_DEADLINE_MS);
  const maxSources = Math.max(1, Math.min(options?.maxSources ?? MAX_SOURCES, 12));
  const queries = buildResearchQueries(question);

  if (!queries.length) return EMPTY_RESEARCH;

  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;

  try {
    /*
     * A single deadline for the whole pass, not per query: three searches that
     * each take their full timeout would leave the student waiting far longer
     * than any one of them is worth.
     */
    const deadline = new Promise<null>((resolve) => {
      deadlineTimer = setTimeout(() => resolve(null), deadlineMs);
    });

    const searches = Promise.all(
      queries.map(async (query) => {
        try {
          const response = await searchWebSources(query, "scholar");
          return { query, results: response.results ?? [] };
        } catch {
          return { query, results: [] as Array<{ title: string; url: string; snippet: string; source: string; trustLabel: string }> };
        }
      })
    );

    const settled = await Promise.race([searches, deadline]);

    // Deadline won: report honestly rather than pretending nothing was found.
    if (!settled) {
      return { ...EMPTY_RESEARCH, queries, degraded: "The research pass ran out of time before any source came back." };
    }

    const batches = settled.filter((batch) => batch.results.length > 0);
    if (!batches.length) {
      return { ...EMPTY_RESEARCH, queries };
    }

    const merged = mergeResults(batches).filter(
      (result) => result.snippet.length >= MIN_EXCERPT_CHARS
    );

    if (!merged.length) {
      return { ...EMPTY_RESEARCH, queries };
    }

    const selected = merged.slice(0, maxSources);

    const citations: DeepResearchCitation[] = selected.map((result) => ({
      title: result.title,
      url: result.url,
      source: result.source,
      trustLabel: result.trustLabel,
      corroborations: result.queries.size,
      excerpt: clip(result.snippet, MAX_EXCERPT_CHARS)
    }));

    /*
     * Group by the query the student's question most resembles, so the brief
     * reads as an investigation rather than one flat list. The first query is
     * the question verbatim, so anything it found is the primary evidence.
     */
    const findings: DeepResearchFinding[] = batches
      .map((batch) => ({
        query: batch.query,
        citations: citations.filter((citation) => {
          const original = selected.find((result) => result.url === citation.url);
          return original ? original.queries.has(batch.query) : false;
        })
      }))
      .filter((finding) => finding.citations.length > 0);

    if (!findings.length) {
      // Every result survived ranking but lost its query attribution — show
      // them together rather than losing the evidence.
      findings.push({ query: queries[0], citations });
    }

    const domains = Array.from(new Set(citations.map((citation) => hostOf(citation.url)).filter(Boolean)));
    const tensions = findSourceTensions(citations);
    const summary = buildSummary(question, findings, tensions, domains);

    const failedQueries = queries.length - batches.length;
    const degraded =
      failedQueries > 0
        ? `${failedQueries} of ${queries.length} searches returned nothing, so this brief is narrower than requested.`
        : undefined;

    return {
      used: true,
      summary,
      citations,
      findings,
      domains,
      queries,
      tensions,
      ...(degraded ? { degraded } : {})
    };
  } catch {
    return { ...EMPTY_RESEARCH, queries };
  } finally {
    if (deadlineTimer) clearTimeout(deadlineTimer);
  }
}
