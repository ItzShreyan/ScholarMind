"use client";

import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import {
  SPACE_ACCENT_VAR,
  WORLD_SPACES
} from "@/components/world/worldSpaces";

/**
 * The complete, non-3D version of the learning world.
 *
 * This is not a degraded error state. It is the experience everyone gets on a
 * narrow screen, a low-power device, without WebGL, with reduced motion
 * requested, or by choice — and it lists exactly the same five destinations as
 * the world, with the same copy and the same links.
 */
export function WorldFallback({
  heading = "Choose a place to study",
  description = "The same five spaces, as a list. Every one opens a real part of ScholarMind."
}: {
  heading?: string;
  description?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-[color:var(--text-1)]">{heading}</h2>
        <p className="mt-1 text-sm text-[color:var(--text-3)]">{description}</p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {WORLD_SPACES.map((space) => (
          <li key={space.id}>
            <Link
              href={space.href}
              className="world-fallback-card group flex h-full flex-col gap-2 p-4 transition-colors duration-150 hover:border-[color:var(--surface-border)] focus-visible:outline-2"
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: SPACE_ACCENT_VAR[space.accent] }}
                />
                <span className="text-sm font-semibold text-[color:var(--text-1)]">{space.label}</span>
                {space.requiresAuth ? (
                  <span
                    className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-3)]"
                    title="Requires an account"
                  >
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    Sign in
                  </span>
                ) : null}
              </span>

              <span className="text-xs leading-6 text-[color:var(--text-2)]">{space.purpose}</span>

              <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-medium text-[color:var(--accent-sky)]">
                {space.destination}
                <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
