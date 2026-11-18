"use client";

import { useId, useRef, useState } from "react";
import { m } from "framer-motion";
import { useMotionTier } from "@/hooks/useMotionTier";
import { tierVariants, scaleIn } from "@/lib/motion";
import { cn } from "@/components/ui/cn";

type TooltipProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
  /** Where the bubble appears relative to the trigger. */
  side?: "top" | "bottom";
};

/**
 * Accessible tooltip.
 *
 * Shows on hover *and* on keyboard focus, and Escape dismisses it — so it is
 * never the only way to discover a control's meaning. The wrapped control keeps
 * its own accessible name; this only adds a description.
 */
export function Tooltip({ label, children, className, side = "top" }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const { tier } = useMotionTier();
  const id = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  return (
    <span
      ref={wrapperRef}
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open ? (
        <m.span
          id={id}
          role="tooltip"
          variants={tierVariants(tier, scaleIn)}
          initial={tier === "off" ? undefined : "hidden"}
          animate={tier === "off" ? undefined : "visible"}
          className={cn(
            "pointer-events-none absolute left-1/2 z-50 w-max max-w-[16rem] -translate-x-1/2 rounded-token-sm border border-[color:var(--surface-border)] bg-[color:var(--surface-3)] px-2.5 py-1.5 text-xs leading-snug text-[color:var(--text-1)] shadow-lg",
            side === "top" ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]"
          )}
        >
          {label}
        </m.span>
      ) : null}
    </span>
  );
}
