"use client";

import { useCallback, useEffect, useState } from "react";

export type WorldView = "world" | "list";

const STORAGE_KEY = "scholarmind_world_view";

/**
 * Whether the visitor wants the 3D world or the plain list of the same
 * destinations.
 *
 * The choice is remembered, because a student who has decided they prefer the
 * list should never have to opt out again on every visit.
 */
export function usePreferredView(): {
  view: WorldView;
  setView: (view: WorldView) => void;
} {
  const [view, setViewState] = useState<WorldView>("world");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "list" || stored === "world") setViewState(stored);
    } catch {
      // Storage unavailable — the default is the full experience.
    }
  }, []);

  const setView = useCallback((next: WorldView) => {
    setViewState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persistence is a convenience only.
    }
  }, []);

  return { view, setView };
}
