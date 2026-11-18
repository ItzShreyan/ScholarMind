"use client";

import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, m } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useToasts, toast } from "@/hooks/useToast";
import { useMotionTier } from "@/hooks/useMotionTier";
import { panelSwap, tierVariants } from "@/lib/motion";
import { cn } from "@/components/ui/cn";
import type { ToastItem, ToastVariant } from "@/lib/toast";

const VARIANT_ICON: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info
};

/*
 * Status is never communicated by colour alone: each toast carries an icon and
 * a text title, and errors are announced assertively.
 */
const VARIANT_CLASS: Record<ToastVariant, string> = {
  success: "status-success",
  error: "status-danger",
  info: "status-info"
};

const VARIANT_LABEL: Record<ToastVariant, string> = {
  success: "Success",
  error: "Error",
  info: "Information"
};

function ToastCard({ item }: { item: ToastItem }) {
  const { tier } = useMotionTier();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (item.durationMs <= 0) return;
    timerRef.current = setTimeout(() => toast.dismiss(item.id), item.durationMs);
  }, [clearTimer, item.durationMs, item.id]);

  // Auto-dismiss, paused while the pointer or focus is inside the toast.
  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [startTimer, clearTimer]);

  const Icon = VARIANT_ICON[item.variant];

  return (
    <m.li
      layout={false}
      variants={tierVariants(tier, panelSwap)}
      initial={tier === "off" ? undefined : "hidden"}
      animate={tier === "off" ? undefined : "visible"}
      exit={tier === "off" ? undefined : "exit"}
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
      onFocus={clearTimer}
      onBlur={startTimer}
      className="panel panel-border flex w-full max-w-sm items-start gap-3 rounded-token-md p-3.5 shadow-lg"
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 h-4 w-4 shrink-0", VARIANT_CLASS[item.variant])} />
      <div className="min-w-0 flex-1">
        <p className="sr-only">{VARIANT_LABEL[item.variant]}</p>
        <p className="text-sm font-medium leading-snug text-[color:var(--text-1)]">{item.title}</p>
        {item.description ? (
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--text-3)]">{item.description}</p>
        ) : null}
        {item.action ? (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              toast.dismiss(item.id);
            }}
            className="mt-2 rounded-token-sm px-2 py-1 text-xs font-semibold text-[color:var(--accent-sky)] underline-offset-2 hover:underline"
          >
            {item.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => toast.dismiss(item.id)}
        aria-label="Dismiss notification"
        className="rounded-token-sm p-1.5 text-[color:var(--text-3)] transition-colors hover:text-[color:var(--text-1)]"
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </m.li>
  );
}

/**
 * Fixed toast viewport. Mounted once, in the root layout, so any part of the
 * app can report progress or failure through `toast.*` in lib/toast.ts.
 */
export function ToastViewport() {
  const toasts = useToasts();
  const { tier } = useMotionTier();

  const errors = toasts.filter((item) => item.variant === "error");
  const rest = toasts.filter((item) => item.variant !== "error");

  return (
    <>
      {/* Errors are announced immediately; everything else politely. */}
      <div aria-live="assertive" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-3 z-[70] flex flex-col items-center gap-2 px-3">
        {errors.map((item) => (
          <ul key={item.id} className="pointer-events-auto w-full max-w-sm list-none">
            <ToastCard item={item} />
          </ul>
        ))}
      </div>
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-3 z-[60] flex flex-col items-center gap-2 px-3">
        <AnimatePresence initial={false}>
          {rest.map((item) => (
            <ul key={item.id} className="pointer-events-auto w-full max-w-sm list-none">
              <ToastCard item={item} />
            </ul>
          ))}
        </AnimatePresence>
      </div>
      {/* Screen-reader-only summary so a burst of toasts is not read out twice. */}
      <span className="sr-only">{tier === "off" ? "Notifications" : ""}</span>
    </>
  );
}
