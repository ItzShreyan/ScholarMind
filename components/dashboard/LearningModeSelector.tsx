"use client";

import { useId, useMemo } from "react";
import { GraduationCap } from "lucide-react";
import { LEARNING_MODES, getLearningMode, type LearningModeId } from "@/lib/ai/learning-modes";

/** Every value the `<select>` can produce, as plain strings for the guard. */
const MODE_IDS: ReadonlySet<string> = new Set(LEARNING_MODES.map((mode) => mode.id));

/**
 * How the tutor should teach this answer.
 *
 * A native `<select>` rather than a custom popover: there are seven modes, the
 * control sits inside a composer the student is already typing into, and the
 * platform menu gives keyboard navigation, type-ahead and touch behaviour for
 * free. The one trade-off — styling — is handled by keeping the visible control
 * small and putting the explanation beside it.
 */
export function LearningModeSelector({
  value,
  onChange,
  disabled = false
}: {
  value: LearningModeId;
  onChange: (mode: LearningModeId) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const active = useMemo(() => getLearningMode(value), [value]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        htmlFor={id}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-3)]"
      >
        <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
        Mode
      </label>

      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            // The `<select>` can only produce values rendered below, but a
            // restored preference could be anything, so validate anyway.
            if (MODE_IDS.has(event.target.value)) {
              onChange(event.target.value as LearningModeId);
            }
          }}
          className="min-h-9 appearance-none rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] py-1 pl-3 pr-7 text-xs font-semibold text-[color:var(--text-1)] outline-none transition-colors hover:border-[color:var(--accent-sky)] focus:border-[color:var(--accent-sky)] disabled:opacity-55"
        >
          {LEARNING_MODES.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {mode.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-3)]"
        >
          ▾
        </span>
      </div>

      <p className="min-w-0 flex-1 text-[11px] leading-5 text-[color:var(--text-3)]">
        {active.blurb}
      </p>
    </div>
  );
}
