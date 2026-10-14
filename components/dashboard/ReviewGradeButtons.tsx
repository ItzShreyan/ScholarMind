"use client";

import { GRADE_LABEL, describeNextIntervals, type CardState, type ReviewGrade } from "@/lib/srs";

const GRADE_STYLE: Record<ReviewGrade, string> = {
  again: "border-[color:var(--danger)]/40 text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10",
  hard: "border-[color:var(--warning)]/40 text-[color:var(--warning)] hover:bg-[color:var(--warning)]/10",
  good: "border-[color:var(--accent-sky)]/40 text-[color:var(--accent-sky)] hover:bg-[color:var(--accent-sky)]/10",
  easy: "border-[color:var(--success)]/40 text-[color:var(--success)] hover:bg-[color:var(--success)]/10"
};

/** Keyboard shortcut shown on each button. */
export const GRADE_SHORTCUT: Record<ReviewGrade, string> = {
  again: "1",
  hard: "2",
  good: "3",
  easy: "4"
};

/**
 * The four outcome buttons, each showing the interval it would schedule.
 *
 * The label under each button comes from the same `lib/srs.ts` function the
 * server uses, so what the student is promised is what they get. Outcome is
 * never colour-only: every button carries its word and its shortcut.
 */
export function ReviewGradeButtons({
  state,
  disabled = false,
  onGrade
}: {
  state: CardState;
  disabled?: boolean;
  onGrade: (grade: ReviewGrade) => void;
}) {
  const intervals = describeNextIntervals(state);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="How well did you know it?">
      {(Object.keys(GRADE_LABEL) as ReviewGrade[]).map((grade) => (
        <button
          key={grade}
          type="button"
          disabled={disabled}
          onClick={() => onGrade(grade)}
          className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-token-md border bg-[color:var(--surface-2)] px-3 py-2 transition disabled:opacity-55 ${GRADE_STYLE[grade]}`}
        >
          <span className="text-sm font-semibold">{GRADE_LABEL[grade]}</span>
          <span className="text-[11px] text-[color:var(--text-3)]">
            {intervals[grade]} · press {GRADE_SHORTCUT[grade]}
          </span>
        </button>
      ))}
    </div>
  );
}
