/**
 * Markdown + mathematics normalisation for tutor answers.
 *
 * Models write maths in at least four different notations, often in the same
 * answer. This module converts them to the single form remark-math understands
 * (`$…$` inline, `$$…$$` display) without touching anything that is not
 * actually maths.
 *
 * The previous implementation wrapped any parenthesised group containing `=`
 * or `^` in `$…$`, which turned ordinary prose — "(the rate = distance ÷
 * time)" and "(see Figure 3^)" — into broken equations. The rules here are
 * deliberately conservative: wrapping happens only when the *whole* group is
 * plausibly mathematical, and fenced/inline code is never touched.
 */

/** LaTeX commands that only ever appear inside real maths. */
const LATEX_COMMAND =
  /\\(?:frac|dfrac|tfrac|sqrt|sum|prod|int|oint|lim|partial|nabla|infty|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|lambda|mu|nu|xi|rho|sigma|tau|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Sigma|Phi|Psi|Omega|times|cdot|div|pm|mp|leq|geq|neq|approx|equiv|propto|sim|simeq|ll|gg|subset|supset|cup|cap|in|notin|forall|exists|rightarrow|leftarrow|leftrightarrow|Rightarrow|Leftarrow|Leftrightarrow|to|mapsto|text|mathrm|mathbf|mathit|mathcal|mathbb|overline|underline|vec|hat|bar|dot|ddot|left|right|begin|end|quad|qquad|log|ln|exp|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|sinh|cosh|tanh|deg|circ|angle|triangle|perp|parallel)\b/;

/** A relation or operator that makes a fragment look like an equation. */
const MATH_OPERATOR = /[=<>±×÷≤≥≠≈√∑∫]/;

/** A letter/number with an exponent or subscript, e.g. `x^2`, `v_0`, `10^-3`. */
const SUPERSCRIPT = /\b[A-Za-z0-9)\]]\s*[\^_]\s*[{A-Za-z0-9+\-]/;

/** Scientific / chemical notation, e.g. `H2SO4`, `2H2 + O2`. */
const CHEMICAL = /(?:\b\d*[A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*)*\s*\+?){2,}/;

/** Any ordinary English word of four or more letters. */
const PROSE_WORD = /\b[A-Za-z]{4,}\b/g;

/** Words that are legitimate inside short maths but are not prose. */
const MATH_WORDS = new Set([
  "where",
  "and",
  "then",
  "for",
  "with",
  "let",
  "given",
  "since",
  "if",
  "sin",
  "cos",
  "tan",
  "log",
  "ln",
  "exp",
  "lim",
  "max",
  "min",
  "mod",
  "mol",
  "rms",
  "approx"
]);

/**
 * Does this fragment read as mathematics rather than a sentence?
 *
 * Two independent tests:
 *   1. it contains a LaTeX command (unambiguous)
 *   2. it is short, contains a maths operator or superscript, and its words are
 *      mostly symbols rather than prose
 */
export function looksLikeMath(fragment: string): boolean {
  const text = fragment.trim();
  if (!text) return false;
  if (LATEX_COMMAND.test(text)) return true;

  // A diagram reference or a full sentence is not maths, however it is punctuated.
  if (/^\s*(?:see|figure|fig\.|table|chapter|page|equation|eq\.|section|note)\b/i.test(text)) {
    return false;
  }

  if (!MATH_OPERATOR.test(text) && !SUPERSCRIPT.test(text) && !CHEMICAL.test(text)) return false;
  if (text.length > 120) return false;

  const words = text.match(PROSE_WORD) ?? [];
  const proseWords = words.filter((word) => !MATH_WORDS.has(word.toLowerCase()));

  // More than two real words means it is a sentence about maths, not maths.
  return proseWords.length <= 2;
}

/**
 * Split a document into code and non-code segments so normalisation can skip
 * fenced blocks, inline code and existing maths spans.
 */
function splitProtectedSegments(content: string): Array<{ text: string; protected: boolean }> {
  const segments: Array<{ text: string; protected: boolean }> = [];
  const pattern = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`|\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: content.slice(lastIndex, match.index), protected: false });
    }
    segments.push({ text: match[0], protected: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ text: content.slice(lastIndex), protected: false });
  }

  return segments;
}

/**
 * Normalise the maths in a tutor answer.
 *
 *   \( … \)   → $…$          (inline, ChatGPT/Gemini style)
 *   \[ … \]   → $$…$$        (display)
 *   ( … )     → $…$          only when the group is unambiguously maths
 *   [ … ]     → $$…$$        only when the group is an unambiguously a formula
 */
export function normalizeMathMarkup(content: string): string {
  if (!content) return "";

  return splitProtectedSegments(content)
    .map((segment) => {
      if (segment.protected) return segment.text;

      let text = segment.text;

      // Explicit delimiters first: these are the model telling us it is maths.
      text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_match, math: string) => `$$${math.trim()}$$`);
      text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_match, math: string) => `$${math.trim()}$`);

      // Bare parenthesised maths, conservatively.
      text = text.replace(/\(([^()\n]{1,100})\)/g, (match, inner: string) => {
        if (!looksLikeMath(inner)) return match;
        // Never produce an empty or delimiter-colliding span.
        const trimmed = inner.trim();
        if (!trimmed || trimmed.includes("$")) return match;
        return `$${trimmed}$`;
      });

      // Bare bracketed display maths: much stricter, must look like a formula.
      text = text.replace(/\[([^[\]\n]{3,120})\]/g, (match, inner: string) => {
        const trimmed = inner.trim();
        if (!trimmed || trimmed.includes("$")) return match;
        if (!MATH_OPERATOR.test(trimmed)) return match;
        if (!looksLikeMath(trimmed)) return match;
        return `$$${trimmed}$$`;
      });

      return text;
    })
    .join("");
}

/**
 * Clean up an answer before rendering.
 *
 * Handles the failure modes actually seen from the models: a stray "Local
 * fallback response" prefix, serialised objects, and JSON that arrived where
 * prose was expected. An empty result becomes a readable apology rather than a
 * blank panel.
 */
export function prepareStudyContent(content: string): string {
  if (typeof content !== "string") return "Something went wrong generating that reply. Please try again.";

  const normalized = content.replace(/^\s*Local fallback response\s*/i, "").trim();
  if (!normalized || normalized === "[object Object]" || normalized === "{}") {
    return "Something went wrong generating that reply. Please try again.";
  }

  return normalizeMathMarkup(normalized);
}
