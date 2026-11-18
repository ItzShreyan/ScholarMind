"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import {
  BookOpen,
  Brain,
  Globe2,
  ListChecks,
  PenLine,
  Sigma
} from "lucide-react";
import { useMotionTier } from "@/hooks/useMotionTier";
import { duration, easing } from "@/lib/motion";
import {
  extractThoughtTagline,
  pickWaitingStage,
  type ThinkingStage
} from "@/lib/ai/thinking";

const STAGE_ICONS = {
  BookOpen,
  Globe2,
  Brain,
  Sigma,
  ListChecks,
  PenLine
} as const;

/** How often the elapsed time and the waiting stage are refreshed. */
const TICK_MS = 400;

/**
 * The live "what the tutor is doing" line.
 *
 * Priority order:
 *   1. reasoning text has arrived → show a tagline taken from the model's own
 *      thoughts, so the label describes real work
 *   2. nothing yet → walk through the real pipeline stages on a timer
 *
 * Where a reasoning trace is available, the full trace stays available
 * underneath in a disclosure — the tagline is a summary, not a replacement.
 */
export function ChatThinkingIndicator({
  reasoning,
  startedAt,
  tierLabel,
  stageLabel,
  showTrace = true
}: {
  reasoning: string;
  startedAt?: number;
  /** "Pro", "Flash" or "Vision" once the stream has reported the model. */
  tierLabel?: string;
  /**
   * An honest stage decided outside this component — currently the live web
   * search, which the workspace knows about via `lib/ai/research-intent.ts`.
   * Reasoning still wins when the model has started thinking, because that is
   * strictly more informative than a stage we merely expect to be running.
   */
  stageLabel?: string | null;
  showTrace?: boolean;
}) {
  const { tier } = useMotionTier();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const elapsedMs = startedAt ? Math.max(0, now - startedAt) : 0;
  const elapsedSeconds = Math.max(1, Math.round(elapsedMs / 1000));
  const waitingStage = pickWaitingStage(elapsedMs);

  const tagline = useMemo(() => extractThoughtTagline(reasoning), [reasoning]);

  const current: ThinkingStage = waitingStage;
  const externalStage = stageLabel?.trim() || null;
  const Icon = externalStage && !tagline ? STAGE_ICONS.Globe2 : STAGE_ICONS[current.icon];
  const label = tagline ?? externalStage ?? current.label;

  const labelMotion = tier === "full"
    ? {
        initial: { opacity: 0, y: 4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: duration.fast, ease: easing.standard }
      }
    : {};

  const hasTrace = showTrace && reasoning.trim().length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <m.span
          className="inline-flex"
          animate={tier === "full" ? { opacity: [0.45, 1, 0.45] } : undefined}
          transition={tier === "full" ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : undefined}
        >
          <Icon className="h-4 w-4 text-[color:var(--accent-coral)]" aria-hidden="true" />
        </m.span>

        <span className="min-w-0 flex-1 truncate font-medium text-[color:var(--text-2)]">
          <AnimatePresence mode="wait" initial={false}>
            <m.span key={label} className="inline-block" {...labelMotion}>
              {label}
            </m.span>
          </AnimatePresence>
        </span>

        <span className="shrink-0 text-xs tabular-nums text-[color:var(--text-3)]">
          {elapsedSeconds}s
        </span>
      </div>

      {tierLabel ? (
        <p className="text-[11px] text-[color:var(--text-3)]">
          Answering with {tierLabel}
        </p>
      ) : null}

      {hasTrace ? (
        <details className="rounded-[var(--radius-md)] border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] px-3 py-2">
          <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-3)] transition-colors hover:text-[color:var(--text-1)]">
            Show the tutor&rsquo;s working
          </summary>
          <p className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-[color:var(--text-3)]">
            {reasoning}
          </p>
        </details>
      ) : null}
    </div>
  );
}
