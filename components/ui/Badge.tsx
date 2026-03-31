"use client";

import * as React from "react";
import { cn } from "@/components/ui/cn";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/30 px-3 py-1 text-xs font-medium text-[color:var(--fg)] shadow-[0_10px_24px_rgba(255,255,255,0.14)] backdrop-blur-xl",
        className
      )}
      {...props}
    />
  );
}

