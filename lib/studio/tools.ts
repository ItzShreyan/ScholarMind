/**
 * The studio's generation tools.
 *
 * A "tool" is one of the nine things the studio can generate from a set of
 * sources: a summary, notes, flashcards, a quiz, an exam, and so on. Each one
 * needs a different output contract, and the contract is the whole product
 * here — a quiz prompt that does not insist on JSON produces an unmarkable
 * quiz, and an exam prompt that does not ask for marks produces something a
 * student cannot practise against.
 *
 * Keeping these prompts out of the component means they can be read side by
 * side, which is the only way to notice that one of them has drifted.
 */

import type { AIAction, FileItem, ToolDraft } from "@/lib/studio/types";

/** The defaults a tool panel opens with. */
export function createToolDraft(action: AIAction): ToolDraft {
  return {
    action,
    count:
      action === "flashcards"
        ? 8
        : action === "quiz"
          ? 6
          : action === "study_plan"
            ? 7
            : action === "exam"
              ? 14
              : action === "notes"
                ? 8
                : 5,
    difficulty: action === "hard_mode" || action === "exam" ? "exam" : "foundation",
    examMode: action === "exam" ? "full" : undefined,
    focus: ""
  };
}

/**
 * The prompt for one tool run.
 *
 * The shared preface is doing real work: it names the files the answer is
 * allowed to use, forbids pasting metadata and filenames into the output, and
 * forbids placeholders. Every per-tool clause below inherits that, so a change
 * to the grounding rule only has to happen once.
 */
export function buildToolPrompt(draft: ToolDraft, files: FileItem[]): string {
  const count = Math.max(3, Math.min(draft.count, draft.action === "exam" ? 18 : 12));
  const sourceList = files.map((file) => file.file_name).join(", ");
  const focus = draft.focus.trim() || "the most important ideas across all uploaded files";
  const difficulty = draft.difficulty === "exam" ? "exam-level" : "foundation-level";
  const preface = `Use only the uploaded study sources. Base the output on these files: ${sourceList}. Focus on ${focus}. Keep the output ${difficulty}. Do not paste source metadata, filenames, URLs, AI context, or prompt instructions unless the user needs a citation. Do not output placeholders. Produce the final student-facing study material only.`;

  switch (draft.action) {
    case "quiz":
      return `${preface} Generate ${count} high-quality multiple-choice questions like a real study platform. Use the student profile in the context to match their country, curriculum stage, exam board, and tier where provided. Every question must test a specific fact, method, formula, misconception, source detail, or exam skill from the uploaded material. Avoid generic options like "source", "definition", "examples", or "types". Make distractors plausible, not silly. Keep each option short, give exactly 4 options, make the answer match one option exactly, and keep the explanation brief but useful. Return only a JSON array with this exact shape and no markdown: [{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":"A. ...","explanation":"..."}].`;
    case "flashcards":
      return `${preface} Generate ${count} strong active-recall flashcards. Each front must be a real term, question, formula, process, date, quote, rule, or recall cue from the sources, not a generic word. The back should be concise, accurate, and phrased like a student-friendly memory answer. Keep each front under 14 words and each back under 45 words. Do not paste raw source paragraphs or repeat the file name. Return only JSON with this exact shape: [{"front":"...","back":"..."}].`;
    case "exam":
      if (draft.examMode === "practice") {
        return `${preface} Generate ${Math.max(4, Math.min(12, count))} original exam-style practice questions in markdown, not a full exam. Include mark allocations, space for working, and a compact mark scheme at the end. Questions must be source-specific, realistic, and useful for quick revision. If the material is mathematical, include method-based questions and formulas where helpful. Do not copy real past-paper questions.`;
      }
      return `${preface} Generate a long original ${focus} mock exam in markdown with around ${Math.max(36, count + 22)} questions. Include a front-page title, time allowed, total marks, short instructions, clearly numbered questions, mark allocations, multiple sections, and a compact mark scheme table at the end. Aim for the feel of a real GCSE, A-Level, school, university, or international mock paper rather than a short worksheet, while creating new questions instead of copying past papers. Use source-specific wording, not generic filler. If the material is mathematical, include method-based questions, multi-step problems, formulas, diagrams or tables when helpful, and require working.`;
    case "notes":
      return `${preface} Generate long-form AI Notes as valid JSON only. Make it textbook-quality, source-grounded, curriculum-aware, and much more detailed than a summary. Teach the topic like a patient tutor: clear chapter sections, short paragraphs, definitions, formulas, worked examples, common mistakes, callouts, diagrams/tables where useful, and practice questions with hints and answers. Include enough depth that a student can revise from it without needing the original source open. Include formulaBlocks only when formulas genuinely matter. Include scienceSimulation only when the source is clearly science/STEM and an interactive simulation would actually help understanding, such as particles, waves, circuits, forces, energy transfer, rates of reaction, diffusion, osmosis, or cells. Do not include any simulation for non-science or where a simulation would feel forced. Return JSON with title, subject, level, estimatedTime, sections, callouts, formulaBlocks, workedExamples, practiceQuestions, diagrams, scienceSimulation or simulationSpec, and sourceNotes.`;
    case "summary":
      return `${preface} Return a full revision summary in markdown. Use these sections in order: ## What this topic is about, ## Key points to remember, ## Step-by-step explanation, ## What to memorise, ## Quick self-check. Keep it concise but complete, use short paragraphs or bullets where helpful, and use a table only when the source naturally contains comparisons, formulas, or dates.`;
    case "insights":
      return `${preface} Return a short performance report with weak spots, misconceptions, and next-best study actions. Use a markdown table when it helps.`;
    case "hard_mode":
      return `${preface} Return a markdown table with ${count} likely exam traps. Use the columns Trap | Why students fall for it | Correct move | Self-check.`;
    case "study_plan":
      return `${preface} Return a ${count}-step study plan as a markdown table with the columns Day | Focus | Task | Check.`;
    case "concepts":
      return `${preface} Return either a concise markdown table or a mermaid diagram when it helps explain the topic links. If neither helps, return ${count} lines in the format "Concept: why it matters".`;
    default:
      return preface;
  }
}

/**
 * Is this output worth rendering as formatted study material?
 *
 * Used to choose between the rich renderer and a plain card list. A markdown
 * table, a mermaid diagram or a heading all mean the answer has structure the
 * renderer can display; plain prose does not benefit from it.
 */
export function looksRichOutput(text: string): boolean {
  return /```mermaid/i.test(text) || /\|.+\|/.test(text) || /^#{1,3}\s/m.test(text);
}

/** Tone for a web source's trust label. Verified outranks scholar outranks trusted. */
export function trustBadgeTone(trustLabel: string): string {
  if (trustLabel === "Verified") {
    return "bg-[rgba(121,247,199,0.18)] text-[var(--accent-mint)]";
  }

  if (trustLabel === "Scholar") {
    return "bg-[rgba(57,208,255,0.18)] text-[var(--accent-sky)]";
  }

  if (trustLabel === "Trusted") {
    return "bg-[rgba(255,209,102,0.18)] text-[var(--accent-gold)]";
  }

  return "bg-white/10 text-[var(--fg)]";
}
