/**
 * Tutor modes.
 *
 * A mode is a *shape* for the answer, not a different model and not a separate
 * AI system: the same grounded tutor, asked to teach in a particular way. Keeping
 * them as prompt fragments means one request pipeline, one safety story and one
 * place to fix a bug.
 *
 * The rules that differ between modes are deliberately few. Mode changes how an
 * answer is *conducted*; it never changes what counts as evidence, and it never
 * licenses inventing something that is not in the sources.
 */

export type LearningModeId =
  | "explain"
  | "socratic"
  | "quiz"
  | "exam"
  | "simplify"
  | "steps"
  | "research";

export type LearningMode = {
  id: LearningModeId;
  /** Compact label for the segmented control. */
  label: string;
  /** One line explaining what changes, shown on hover and in the picker. */
  blurb: string;
  /** Appended to the system prompt when this mode is selected. */
  instruction: string;
};

export const LEARNING_MODES: LearningMode[] = [
  {
    id: "explain",
    label: "Explain",
    blurb: "Teach it clearly, with an example where an example helps.",
    instruction:
      "## Mode: Explain\nTeach the idea directly and in order. Define what is new before you use it, then show one worked example. Close with a single line the student can repeat from memory."
  },
  {
    id: "socratic",
    label: "Socratic",
    blurb: "Guide with questions and hints instead of handing over the answer.",
    instruction:
      "## Mode: Socratic\nDo not state the final answer. Ask one focused question at a time, respond to the student's attempt, and give the smallest hint that unblocks them. Reveal the answer only when they ask for it directly or have clearly got it."
  },
  {
    id: "quiz",
    label: "Quiz",
    blurb: "Test recall with short questions and wait for an attempt.",
    instruction:
      "## Mode: Quiz\nAsk short recall questions, one at a time, drawn only from the sources. Wait for an attempt before marking it. When you mark, say what was right, what was missing, and why."
  },
  {
    id: "exam",
    label: "Exam",
    blurb: "Answer like a mark scheme: method, marks, and where they are earned.",
    instruction:
      "## Mode: Exam\nAnswer in exam register. Show the method a marker would look for, name the marks available for each step, and state the final answer on its own line. Do not add revision chatter."
  },
  {
    id: "simplify",
    label: "Simplify",
    blurb: "Plain language first, jargon only once it has been defined.",
    instruction:
      "## Mode: Simplify\nUse short sentences and everyday words. Introduce one idea at a time and define any technical term the moment it appears. No analogies that introduce new unknowns."
  },
  {
    id: "steps",
    label: "Step by step",
    blurb: "Every stage of the working, nothing skipped.",
    instruction:
      "## Mode: Step by step\nShow every stage of the working, including the algebra that is usually assumed. Use the steps block for the method and display maths for the manipulation. State what changed between consecutive lines."
  },
  {
    id: "research",
    label: "Research",
    blurb: "Weigh external evidence, cite it, and separate fact from uncertainty.",
    instruction:
      "## Mode: Research\nAnswer from the cited web sources where they exist, and from the uploaded material otherwise. Attribute each substantive claim to a numbered source, describe any disagreement between sources, and state clearly what remains uncertain or unverified. Never present an unsourced claim as settled."
  }
];

const MODE_IDS = new Set<string>(LEARNING_MODES.map((mode) => mode.id));

/** Anything unrecognised falls back to the default teaching mode. */
export const DEFAULT_LEARNING_MODE: LearningModeId = "explain";

export function normalizeLearningMode(value: unknown): LearningModeId {
  return typeof value === "string" && MODE_IDS.has(value) ? (value as LearningModeId) : DEFAULT_LEARNING_MODE;
}

export function getLearningMode(id: LearningModeId): LearningMode {
  return LEARNING_MODES.find((mode) => mode.id === id) ?? LEARNING_MODES[0];
}

/** The prompt fragment for a mode, or an empty string for the default. */
export function learningModeInstruction(id: LearningModeId): string {
  if (id === DEFAULT_LEARNING_MODE) return "";
  return getLearningMode(id).instruction;
}
