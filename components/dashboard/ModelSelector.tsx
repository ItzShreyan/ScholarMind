"use client";

import { useCallback, useId, useMemo, useRef } from "react";
import { Info, Zap, Sparkles, Wand2 } from "lucide-react";
import {
  CHAT_MODELS,
  classifyChatPrompt,
  type ChatModelChoice
} from "@/lib/ai/models";

type Option = {
  value: ChatModelChoice;
  label: string;
  Icon: typeof Zap;
  blurb: string;
};

const OPTIONS: Option[] = [
  {
    value: "auto",
    label: "Auto",
    Icon: Wand2,
    blurb: "Picks Flash for everyday questions and Pro when the question needs real reasoning."
  },
  {
    value: "flash",
    label: "Flash",
    Icon: Zap,
    blurb: `${CHAT_MODELS.flash.spec}. Fastest good-quality answers.`
  },
  {
    value: "pro",
    label: "Pro",
    Icon: Sparkles,
    blurb: `${CHAT_MODELS.pro.spec}. Slower, but thinks harder and uses more of your daily allowance.`
  }
];

/**
 * Pro / Flash / Auto picker for the tutor.
 *
 * Auto shows what it *would* pick for the draft in the composer, so the choice
 * is never a black box. The preview is computed with the same pure function the
 * server uses, so the two can never disagree.
 *
 * Implemented as a real radiogroup with arrow-key navigation, because selecting
 * a model must be possible without a mouse.
 */
export function ModelSelector({
  value,
  onChange,
  previewPrompt = "",
  disabled = false
}: {
  value: ChatModelChoice;
  onChange: (choice: ChatModelChoice) => void;
  /** The current composer text, used only to preview the Auto decision. */
  previewPrompt?: string;
  disabled?: boolean;
}) {
  const groupId = useId();
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const autoPreview = useMemo(() => {
    if (value !== "auto" || !previewPrompt.trim()) return null;
    return classifyChatPrompt(previewPrompt);
  }, [value, previewPrompt]);

  const active = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "ArrowUp" && event.key !== "ArrowDown") {
        return;
      }
      event.preventDefault();
      const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
      const next = (index + delta + OPTIONS.length) % OPTIONS.length;
      onChange(OPTIONS[next].value);
      buttonsRef.current[next]?.focus();
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      <div
        role="radiogroup"
        aria-label="AI model"
        id={groupId}
        className="inline-flex rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-1"
      >
        {OPTIONS.map((option, index) => {
          const isActive = option.value === value;
          const { Icon } = option;

          return (
            <button
              key={option.value}
              ref={(element) => {
                buttonsRef.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              title={option.blurb}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors duration-150 disabled:opacity-55 sm:min-h-9 ${
                isActive
                  ? "bg-[color:var(--surface-3)] text-[color:var(--accent-gold)]"
                  : "text-[color:var(--text-3)] hover:text-[color:var(--text-1)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="flex items-start gap-1.5 text-[11px] leading-5 text-[color:var(--text-3)]">
        <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
        <span>
          {autoPreview
            ? `Auto will use ${CHAT_MODELS[autoPreview.tier].label}${
                autoPreview.signals.length ? ` — this ${autoPreview.signals.join(", ")}` : " — nothing here needs extra reasoning"
              }.`
            : `${active.label}: ${active.blurb}`}
        </span>
      </p>
    </div>
  );
}
