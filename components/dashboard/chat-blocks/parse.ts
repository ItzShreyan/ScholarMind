/**
 * Parsers for ScholarMind's custom chat fence blocks.
 *
 * Contract with the model lives in `lib/ai/prompts/chat-system.ts`.
 *
 * Hard rule: these must never throw and must never return a half-built block.
 * Free models produce malformed output regularly, so every parser returns
 * `null` on anything it cannot confidently read, and the caller falls back to
 * rendering the raw code block.
 */

export type StepItem = {
  /** Displayed in the number tile. Kept as a string so "1a" survives. */
  number: string;
  title: string;
  detail: string;
};

export type StepsData = { steps: StepItem[] };

export type AnswerData = { answer: string };

export type PracticeData = {
  question: string;
  hint: string;
  placeholder: string;
};

export type CheckData = {
  title: string;
  body: string;
};

export type TermItem = {
  term: string;
  meaning: string;
};

export type TermsData = { terms: TermItem[] };

/** Guard against a runaway model filling the DOM with thousands of rows. */
const MAX_ROWS = 40;

function toLines(source: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * `number | title | detail`
 *
 * Splits on the first two pipes only, so a detail containing a pipe (a table
 * cell, a conditional probability) survives intact.
 */
export function parseSteps(source: string): StepsData | null {
  try {
    const lines = toLines(source);
    if (!lines.length) return null;

    const steps: StepItem[] = [];

    for (const line of lines.slice(0, MAX_ROWS)) {
      const firstPipe = line.indexOf("|");
      if (firstPipe === -1) {
        // No pipes at all — treat the line as a bare step title.
        steps.push({ number: String(steps.length + 1), title: line, detail: "" });
        continue;
      }

      const secondPipe = line.indexOf("|", firstPipe + 1);

      const rawNumber = line.slice(0, firstPipe).trim();
      const rawTitle = secondPipe === -1 ? line.slice(firstPipe + 1).trim() : line.slice(firstPipe + 1, secondPipe).trim();
      const rawDetail = secondPipe === -1 ? "" : line.slice(secondPipe + 1).trim();

      const title = rawTitle || rawDetail;
      const detail = rawTitle ? rawDetail : "";

      if (!title) continue;

      steps.push({
        number: rawNumber || String(steps.length + 1),
        title,
        detail
      });
    }

    return steps.length ? { steps } : null;
  } catch {
    return null;
  }
}

/** A single answer value. Any surrounding quotes or "answer:" prefix is removed. */
export function parseAnswer(source: string): AnswerData | null {
  try {
    const answer = source
      .trim()
      .replace(/^(final\s+)?answer\s*[:=-]\s*/i, "")
      .replace(/^["'`]|["'`]$/g, "")
      .trim();

    return answer ? { answer } : null;
  } catch {
    return null;
  }
}

/**
 * `question: …` / `hint: …` / `placeholder: …`
 *
 * A missing `question:` key means the first line is the question.
 */
export function parsePractice(source: string): PracticeData | null {
  try {
    const lines = toLines(source);
    if (!lines.length) return null;

    let question = "";
    let hint = "";
    let placeholder = "";
    const leftovers: string[] = [];

    for (const line of lines) {
      const match = line.match(/^(question|q|hint|placeholder|answer box)\s*[:=-]\s*(.*)$/i);
      if (!match) {
        leftovers.push(line);
        continue;
      }

      const key = match[1].toLowerCase();
      const value = match[2].trim();

      if (key === "question" || key === "q") question = question || value;
      else if (key === "hint") hint = hint || value;
      else if (key === "placeholder" || key === "answer box") placeholder = placeholder || value;
    }

    if (!question) question = leftovers.shift() ?? "";
    if (!question) return null;

    return {
      question,
      hint,
      placeholder: placeholder || "Type your answer…"
    };
  } catch {
    return null;
  }
}

/** Optional `title:` first line, then markdown body. */
export function parseCheck(source: string): CheckData | null {
  try {
    const lines = toLines(source);
    if (!lines.length) return null;

    let title = "Check";
    let body = source.trim();

    const titleMatch = lines[0].match(/^title\s*[:=-]\s*(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1].trim() || title;
      // Drop the consumed title line from the raw body, preserving formatting.
      body = source.trim().replace(/^.*(?:\r?\n|$)/, "").trim();
    }

    return body ? { title, body } : null;
  } catch {
    return null;
  }
}

/** `term | meaning` */
export function parseTerms(source: string): TermsData | null {
  try {
    const lines = toLines(source);
    if (!lines.length) return null;

    const terms: TermItem[] = [];

    for (const line of lines.slice(0, MAX_ROWS)) {
      const pipe = line.indexOf("|");
      if (pipe === -1) continue;

      const term = line.slice(0, pipe).trim().replace(/\*\*/g, "");
      const meaning = line.slice(pipe + 1).trim();
      if (!term || !meaning) continue;

      terms.push({ term, meaning });
    }

    return terms.length ? { terms } : null;
  } catch {
    return null;
  }
}
