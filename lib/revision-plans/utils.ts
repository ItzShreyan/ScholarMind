export type RevisionPlanDay = {
  id: string;
  label: string;
  focus: string;
  task: string;
  check: string;
  completed: boolean;
  completedAt: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanCell(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseMarkdownTableRows(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));

  if (lines.length < 3) return [];

  return lines
    .map((line) => line.slice(1, -1).split("|").map((cell) => cleanCell(cell)))
    .filter((row) => row.some(Boolean));
}

export function parseRevisionPlanDays(text: string): RevisionPlanDay[] {
  const rows = parseMarkdownTableRows(text);

  if (rows.length >= 3) {
    const [header, divider, ...body] = rows;
    if (divider.every((cell) => /^:?-{3,}:?$/.test(cell))) {
      const normalizedHeader = header.map((cell) => cell.toLowerCase());
      const labelIndex = normalizedHeader.findIndex((cell) => cell.includes("day") || cell.includes("week"));
      const focusIndex = normalizedHeader.findIndex((cell) => cell.includes("focus"));
      const taskIndex = normalizedHeader.findIndex((cell) => cell.includes("task") || cell.includes("study"));
      const checkIndex = normalizedHeader.findIndex((cell) => cell.includes("check"));

      if (labelIndex >= 0 && focusIndex >= 0 && taskIndex >= 0) {
        return body.map((row, index) => {
          const label = row[labelIndex] || `Day ${index + 1}`;
          return {
            id: `${slugify(label)}-${index + 1}`,
            label,
            focus: row[focusIndex] || "Key focus",
            task: row[taskIndex] || row[focusIndex] || "",
            check: row[checkIndex] || "Close with one active-recall check.",
            completed: false,
            completedAt: null
          };
        });
      }
    }
  }

  const bulletLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^(day|week)\s*\d+[:\-\s]/i.test(line));

  return bulletLines.map((line, index) => {
    const [label, ...rest] = line.split(/:\s+/);
    return {
      id: `${slugify(label)}-${index + 1}`,
      label: cleanCell(label) || `Day ${index + 1}`,
      focus: cleanCell(rest.join(": ")) || "Revision focus",
      task: cleanCell(rest.join(": ")) || "Study the core topic for this slot.",
      check: "Summarise it aloud and self-test.",
      completed: false,
      completedAt: null
    };
  });
}

export function buildRevisionPlanPrompt({
  examName,
  examDate,
  cadence,
  goals
}: {
  examName: string;
  examDate: string;
  cadence: "daily" | "weekly";
  goals?: string;
}) {
  return [
    `Build a ${cadence} revision schedule for ${examName}.`,
    `The exam date is ${examDate}.`,
    goals?.trim()
      ? `Personal goals and weak areas: ${goals.trim()}.`
      : "Prioritise the highest-yield topics from the uploaded study sources first.",
    "Return a markdown table with the columns Day | Focus | Task | Check.",
    "Make each row specific, realistic, and directly tied to the uploaded material."
  ].join(" ");
}
