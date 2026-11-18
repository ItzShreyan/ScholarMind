/**
 * Markdown and LaTeX → readable plain text.
 *
 * Used by "Read aloud" and "Share". Screen readers and the Web Speech API both
 * choke on raw markup, so the student should hear (and share) what the answer
 * means, not `\underbrace{12 \times 5}_{LCM}`.
 *
 * Pure and dependency-free so it can be unit-tested from a script.
 */

const LATEX_SIMPLE: Array<[RegExp, string]> = [
  // \boxed{x} and friends — keep what is inside.
  [/\\(?:boxed|text|mathrm|mathbf|mathit|operatorname)\{([^{}]*)\}/g, "$1"],
  // \underbrace{x}_{label} → x (label)
  [/\\underbrace\{([^{}]*)\}_\{([^{}]*)\}/g, "$1 ($2)"],
  // \frac{a}{b} → a over b
  [/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1 over $2"],
  // \sqrt{x} → the square root of x
  [/\\sqrt\{([^{}]*)\}/g, "the square root of $1"],
  // Operators and symbols that would otherwise be read as punctuation noise.
  [/\\times/g, " times "],
  [/\\cdot/g, " times "],
  [/\\div/g, " divided by "],
  [/\\pm/g, " plus or minus "],
  [/\\leq?\b/g, " is less than or equal to "],
  [/\\geq?\b/g, " is greater than or equal to "],
  [/\\neq\b/g, " is not equal to "],
  [/\\approx\b/g, " is approximately "],
  [/\\rightarrow|\\to\b/g, " which gives "],
  [/\\infty/g, " infinity "],
  [/\\pi\b/g, " pi "],
  [/\\theta\b/g, " theta "],
  [/\\alpha\b/g, " alpha "],
  [/\\beta\b/g, " beta "],
  [/\\int\b/g, " the integral of "],
  [/\\sum\b/g, " the sum of "],
  [/\\left|\\right/g, ""],
  [/\\quad|\\qquad|\\\\/g, " "]
];

function stripLatex(input: string): string {
  let text = input;

  // Display and inline maths delimiters.
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, " $1 ");
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, " $1 ");
  text = text.replace(/\$([^$\n]+)\$/g, " $1 ");
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, " $1 ");

  for (const [pattern, replacement] of LATEX_SIMPLE) {
    text = text.replace(pattern, replacement);
  }

  // Any remaining command or stray brace is noise when spoken.
  text = text.replace(/\\[a-zA-Z]+/g, " ");
  text = text.replace(/[{}]/g, "");

  return text;
}

function stripMarkdown(input: string): string {
  let text = input;

  // Fenced code: keep the code, drop the fence and the language tag. Mermaid is
  // a diagram source, not prose, so it is removed entirely.
  text = text.replace(/```mermaid[\s\S]*?```/gi, " (diagram) ");
  text = text.replace(/```[a-zA-Z0-9]*\n?([\s\S]*?)```/g, "$1");

  // Headings, blockquotes, list markers, horizontal rules.
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  text = text.replace(/^\s{0,3}>\s?/gm, "");
  text = text.replace(/^\s{0,3}[-*+]\s+/gm, "");
  text = text.replace(/^\s{0,3}\d+[.)]\s+/gm, "");
  text = text.replace(/^\s{0,3}([-*_])\s*\1\s*\1[\s\S]*?$/gm, "");

  // Markdown tables → "cell. cell." lines so the reader pauses between cells.
  text = text.replace(/^\s*\|(.+)\|\s*$/gm, (_match, row: string) =>
    row
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell && !/^:?-{2,}:?$/.test(cell))
      .join(", ")
  );

  // Images and links keep their readable text only.
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

  // Emphasis, inline code, strikethrough.
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/~~(.*?)~~/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");

  return text;
}

/** Convert one markdown answer into clean, speakable plain text. */
export function markdownToPlainText(input: string): string {
  if (!input) return "";

  const text = stripMarkdown(stripLatex(input));

  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*\n\s*/g, ". ")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\.\s*\./g, ".")
    .trim();
}

/**
 * Split text into speech-sized chunks on sentence boundaries.
 *
 * Some engines truncate or garble long utterances, and chunking also lets the
 * answer start playing immediately instead of after the whole string is
 * prepared.
 */
export function chunkForSpeech(input: string, maxLength = 220): string[] {
  const text = input.trim();
  if (!text) return [];
  if (text.length <= maxLength) return [text];

  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current && current.length + sentence.length > maxLength) {
      chunks.push(current.trim());
      current = "";
    }

    // A single sentence longer than the cap is split on the last space.
    if (sentence.length > maxLength) {
      let rest = sentence.trim();
      while (rest.length > maxLength) {
        const cut = rest.lastIndexOf(" ", maxLength);
        const index = cut > maxLength / 2 ? cut : maxLength;
        chunks.push(rest.slice(0, index).trim());
        rest = rest.slice(index).trim();
      }
      current = rest ? `${rest} ` : "";
      continue;
    }

    current += sentence;
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

/** A short, shareable extract — used when sharing has no room for the whole answer. */
export function summarizeForShare(input: string, limit = 400): string {
  const text = markdownToPlainText(input);
  if (text.length <= limit) return text;
  const cut = text.lastIndexOf(" ", limit);
  return `${text.slice(0, cut > limit / 2 ? cut : limit).trim()}…`;
}
