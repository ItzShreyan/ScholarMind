"use client";

import * as React from "react";
import { cn } from "@/components/ui/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

export function buttonVariants({
  className,
  variant = "primary",
  size = "md"
}: {
  className?: string;
  variant?: Variant;
  size?: Size;
}) {
  const base =
    "inline-flex cursor-pointer select-none touch-manipulation items-center justify-center gap-2 rounded-2xl font-medium transition-all duration-200 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]";
  const variants: Record<Variant, string> = {
    primary:
      "bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-gold)_42%,var(--accent-sky))] text-slate-950 shadow-[0_18px_40px_rgba(255,125,89,0.28)] hover:-translate-y-0.5 hover:brightness-105",
    secondary:
      "glass border border-white/20 text-[color:var(--fg)] hover:border-white/35 hover:bg-white/12",
    ghost: "text-[color:var(--fg)] hover:bg-white/10"
  };
  const sizes: Record<Size, string> = {
    sm: "px-3.5 py-2 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base"
  };

  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return <button className={buttonVariants({ className, variant, size })} {...props} />;
}

