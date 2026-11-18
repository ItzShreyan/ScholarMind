"use client";

import { STAGE_LABELS, STAGE_ORDER, type StageId } from "@/components/landing/experienceContent";

/**
 * The journey rail.
 *
 * A fixed vertical marker list on the right edge, one entry per stage. It is
 * the answer to "where am I and how much is left" for a page that is otherwise
 * one continuous camera move, and it doubles as real navigation: every marker
 * is a button that scrolls to its section.
 *
 * It is hidden below `lg` — on a phone it would sit on top of the text — and
 * hidden from assistive technology entirely, because every destination it
 * offers is also a link in the header and the footer.
 */

type ScrollProgressProps = {
  activeStage: StageId;
  onSelect: (stage: StageId) => void;
  /** 0–5, for the continuous fill behind the markers. */
  progress: number;
};

export function ScrollProgress({ activeStage, onSelect, progress }: ScrollProgressProps) {
  const fill = Math.max(0, Math.min(1, progress / 5));

  return (
    <nav
      aria-hidden="true"
      className="pointer-events-none fixed right-5 top-1/2 z-30 hidden -translate-y-1/2 lg:block"
    >
      <div className="pointer-events-auto relative flex flex-col items-end gap-3">
        {/* Spine + fill. Purely decorative: the labels carry the meaning. */}
        <span className="absolute right-[3px] top-2 h-[calc(100%-16px)] w-px bg-[color:var(--surface-border)]" />
        <span
          className="absolute right-[3px] top-2 w-px bg-[linear-gradient(180deg,var(--accent-gold),var(--accent-coral))] transition-[height] duration-300 ease-out"
          style={{ height: `calc((100% - 16px) * ${fill})` }}
        />

        {STAGE_ORDER.map((stage) => {
          const active = stage === activeStage;
          return (
            <button
              key={stage}
              type="button"
              onClick={() => onSelect(stage)}
              tabIndex={-1}
              className="group flex items-center gap-2.5"
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.16em] transition-all duration-200 ${
                  active
                    ? "text-[color:var(--accent-gold)] opacity-100"
                    : "text-[color:var(--text-3)] opacity-0 group-hover:opacity-100"
                }`}
              >
                {STAGE_LABELS[stage]}
              </span>
              <span
                className={`relative z-10 h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                  active
                    ? "scale-150 bg-[color:var(--accent-gold)]"
                    : "bg-[color:var(--text-3)] group-hover:bg-[color:var(--text-1)]"
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
