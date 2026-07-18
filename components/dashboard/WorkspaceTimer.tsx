"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Play, Timer } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface WorkspaceTimerProps {
  showTimerPopover: boolean;
  onToggleTimerPopover: () => void;
  timerMode: "regular" | "interval";
  onSetTimerMode: (mode: "regular" | "interval") => void;
  timerMinutes: number;
  onSetTimerMinutes: (minutes: number) => void;
  breakEveryMinutes: number;
  onSetBreakEveryMinutes: (minutes: number) => void;
  breakMinutes: number;
  onSetBreakMinutes: (minutes: number) => void;
  timerRemaining: number;
  timerRunning: boolean;
  onSetTimerRunning: (value: boolean | ((prev: boolean) => boolean)) => void;
  timerPhase: "focus" | "break" | "done";
  onSetTimerPhase: (phase: "focus" | "break" | "done") => void;
  breakPopupOpen: boolean;
  onSetBreakPopupOpen: (open: boolean) => void;
  onSetTimerRemaining: (value: number | ((prev: number) => number)) => void;
  onStartStudyTimer: (minutes?: number) => void;
  fileCount: number;
}

export function WorkspaceTimer({
  showTimerPopover,
  onToggleTimerPopover,
  timerMode,
  onSetTimerMode,
  timerMinutes,
  onSetTimerMinutes,
  breakEveryMinutes,
  onSetBreakEveryMinutes,
  breakMinutes,
  onSetBreakMinutes,
  timerRemaining,
  timerRunning,
  onSetTimerRunning,
  timerPhase,
  onSetTimerPhase,
  breakPopupOpen,
  onSetBreakPopupOpen,
  onSetTimerRemaining,
  onStartStudyTimer,
  fileCount
}: WorkspaceTimerProps) {
  const timerDisplay = useMemo(() => {
    const minutes = Math.floor(timerRemaining / 60);
    const seconds = timerRemaining % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [timerRemaining]);

  const timerHasStarted = timerRemaining > 0 || timerPhase === "done";

  return (
    <>
      <button
        type="button"
        onClick={onToggleTimerPopover}
        className="glass inline-flex items-center gap-2 rounded-[24px] px-4 py-3 text-sm transition hover:-translate-y-0.5"
      >
        <Timer className="h-4 w-4 text-[var(--accent-sky)]" />
        <span className="font-semibold">{timerRemaining ? timerDisplay : "Study timer"}</span>
      </button>
      <div className="glass rounded-[24px] px-4 py-3 text-sm">
        <p className="muted text-xs">Current context</p>
        <p className="mt-2 font-semibold">{fileCount} files in view</p>
      </div>
      {showTimerPopover ? (
        <div className="panel panel-border absolute right-0 top-[calc(100%+0.7rem)] z-30 w-[min(24rem,calc(100vw-2rem))] rounded-[26px] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Study timer</p>
              <p className="muted mt-1 text-xs">
                {timerPhase === "break" ? "Break time" : timerPhase === "done" ? "Session complete" : "Focus block"}
              </p>
            </div>
            <div className="rounded-full bg-white/12 px-3 py-2 text-sm font-semibold tabular-nums">
              {timerRemaining ? timerDisplay : `${timerMinutes}m`}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-[18px] bg-white/8 p-1">
            {(["interval", "regular"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onSetTimerMode(mode)}
                className={`rounded-[14px] px-3 py-2 text-xs font-semibold transition ${
                  timerMode === mode ? "bg-white/18 text-[var(--fg)]" : "text-[var(--muted)]"
                }`}
              >
                {mode === "interval" ? "Interval" : "Regular"}
              </button>
            ))}
          </div>
          <div className={`mt-3 grid gap-2 ${timerMode === "interval" ? "grid-cols-3" : "grid-cols-1"}`}>
            <label className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              Total
              <input
                value={timerMinutes}
                onChange={(event) => {
                  const next = Math.max(1, Math.min(240, Number(event.target.value) || 1));
                  onSetTimerMinutes(next);
                  onSetBreakEveryMinutes(Math.min(breakEveryMinutes, next));
                  onSetBreakMinutes(Math.min(breakMinutes, next));
                }}
                className="mt-1 w-full rounded-[14px] border border-white/10 bg-white/10 px-2 py-2 text-xs text-[var(--fg)] outline-none"
                type="number"
                min={1}
                max={240}
              />
            </label>
            {timerMode === "interval" ? (
              <label className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                Break at
                <input
                  value={breakEveryMinutes}
                  onChange={(event) => {
                    const next = Math.max(1, Math.min(timerMinutes, Number(event.target.value) || 1));
                    onSetBreakEveryMinutes(next);
                    onSetBreakMinutes(Math.min(breakMinutes, next));
                  }}
                  className="mt-1 w-full rounded-[14px] border border-white/10 bg-white/10 px-2 py-2 text-xs text-[var(--fg)] outline-none"
                  type="number"
                  min={1}
                  max={timerMinutes}
                />
              </label>
            ) : null}
            {timerMode === "interval" ? (
              <label className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                Break
                <input
                  value={breakMinutes}
                  onChange={(event) =>
                    onSetBreakMinutes(Math.max(1, Math.min(breakEveryMinutes, Number(event.target.value) || 1)))
                  }
                  className="mt-1 w-full rounded-[14px] border border-white/10 bg-white/10 px-2 py-2 text-xs text-[var(--fg)] outline-none"
                  type="number"
                  min={1}
                  max={breakEveryMinutes}
                />
              </label>
            ) : null}
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => onStartStudyTimer(timerMinutes)} size="sm" className="flex-1 justify-center">
              <Play className="h-4 w-4" />
              {timerHasStarted ? "Restart" : "Start"}
            </Button>
            {timerHasStarted ? (
              <Button
                onClick={() => onSetTimerRunning((current) => !current)}
                variant="secondary"
                size="sm"
                className="flex-1 justify-center"
              >
                {timerRunning ? "Pause" : "Resume"}
              </Button>
            ) : null}
            {timerHasStarted ? (
              <Button
                onClick={() => {
                  onSetTimerRunning(false);
                  onSetTimerRemaining(0);
                  onSetTimerPhase("focus");
                  onSetBreakPopupOpen(false);
                }}
                variant="ghost"
                size="sm"
                className="px-3"
              >
                Reset
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      {breakPopupOpen && timerPhase === "break" ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[rgba(121,247,199,0.24)] bg-[linear-gradient(135deg,rgba(121,247,199,0.16),rgba(57,208,255,0.14))] px-4 py-3 text-sm"
        >
          <div>
            <p className="font-semibold">Break started</p>
            <p className="muted mt-1 text-xs">
              Rest your eyes, stretch, or grab water. The timer will ping softly when focus resumes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onSetTimerRunning((current) => !current)} variant="secondary" size="sm">
              {timerRunning ? "Pause break" : "Resume break"}
            </Button>
            <Button
              onClick={() => {
                onSetTimerRunning(false);
                onSetTimerRemaining(0);
                onSetTimerPhase("focus");
                onSetBreakPopupOpen(false);
              }}
              variant="ghost"
              size="sm"
            >
              Stop
            </Button>
            <Button onClick={() => onSetBreakPopupOpen(false)} variant="ghost" size="sm">
              Close
            </Button>
          </div>
        </motion.div>
      ) : null}
    </>
  );
}
