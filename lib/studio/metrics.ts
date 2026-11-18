/**
 * Study performance, computed only from things the studio actually observed.
 *
 * There is no mastery score, no predicted grade and no streak here, because
 * the studio has no evidence for any of them. What it does know is how many
 * quiz answers were checked, how many were right, how many flashcards the
 * student turned over, and which tools they ran. That is enough to tell an
 * honest story and nothing more.
 */

import type { StudyMetrics } from "@/lib/studio/types";

/** A zeroed record. Every tool starts at zero rather than being absent. */
export function createEmptyMetrics(): StudyMetrics {
  return {
    quizAnswered: 0,
    quizCorrect: 0,
    flashcardsFlipped: 0,
    toolRuns: {
      summary: 0,
      notes: 0,
      flashcards: 0,
      quiz: 0,
      exam: 0,
      insights: 0,
      hard_mode: 0,
      study_plan: 0,
      concepts: 0
    },
    recentQuizResults: []
  };
}

/**
 * The performance summary handed to the insights tool.
 *
 * Only non-zero rows are included, so the model is never told "Quiz answers
 * checked: 0" and invited to comment on a student's progress from no data.
 * The recent misses are capped at three: enough to name a weak topic, few
 * enough to keep the prompt honest about what it is summarising.
 */
export function buildPerformanceSummary(metrics: StudyMetrics): string {
  const toolSummary = Object.entries(metrics.toolRuns)
    .filter(([, count]) => count > 0)
    .map(([action, count]) => `${action.replace(/_/g, " ")}: ${count}`)
    .join(", ");

  return [
    `Quiz answers checked: ${metrics.quizAnswered}`,
    `Quiz answers correct: ${metrics.quizCorrect}`,
    `Flashcards flipped: ${metrics.flashcardsFlipped}`,
    toolSummary ? `Tool usage: ${toolSummary}` : "",
    metrics.recentQuizResults.length
      ? `Recent quiz misses: ${metrics.recentQuizResults
          .filter((item) => !item.isCorrect)
          .slice(0, 3)
          .map((item) => item.question)
          .join(" | ")}`
      : ""
  ]
    .filter(Boolean)
    .join("\n");
}
