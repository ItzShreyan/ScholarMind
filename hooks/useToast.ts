"use client";

import { useEffect, useState } from "react";
import { getToasts, subscribeToasts, type ToastItem } from "@/lib/toast";

export { toast } from "@/lib/toast";

/**
 * Subscribe a component to the toast queue.
 *
 * `getToasts()` seeds the initial state so the server and the first client
 * render agree, then the subscription keeps it current.
 */
export function useToasts(): ToastItem[] {
  const [toasts, setToasts] = useState<ToastItem[]>(() => getToasts());

  useEffect(() => subscribeToasts(setToasts), []);

  return toasts;
}
