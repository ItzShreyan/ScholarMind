"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import {
  FOOTER_COLUMNS,
  FOOTER_STATEMENT,
  HERO_SUPPORT
} from "@/components/landing/experienceContent";

/**
 * The colophon.
 *
 * Near-black rather than the ivory band above it: the page has spent most of
 * its length in the dark world and the footer returns to that ink so the
 * experience closes where it opened. The ivory finale in between is the
 * product statement; this is the back cover.
 *
 * It also carries `id="about"`, because that is what the header's About link
 * means here — a short statement of what ScholarMind is, next to the routes
 * that already exist. No invented social profiles and no invented contact
 * address: only links that resolve.
 */
export function ExperienceFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      id="about"
      className="relative isolate overflow-hidden border-t border-[color:var(--surface-border)] bg-[#05090d] pt-16 text-[color:var(--text-2)]"
    >
      {/* One restrained sweep of warm light at the top edge. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(233,206,154,0.45),transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 h-80 opacity-70"
        style={{
          background:
            "radial-gradient(46rem 20rem at 50% 100%, rgba(220,165,102,0.13), transparent 70%)"
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1.4fr] lg:gap-16">
          <div>
            <Link href="/" aria-label="ScholarMind home" className="inline-flex items-center gap-2.5">
              <Logo size={34} />
              <span className="flex flex-col leading-none">
                <span className="font-display text-[17px] font-semibold tracking-[-0.02em] text-[color:var(--text-1)]">
                  ScholarMind
                </span>
                <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-gold)]">
                  The learning world
                </span>
              </span>
            </Link>

            <p className="mt-6 max-w-[30ch] font-display text-[clamp(1.35rem,2.4vw,1.75rem)] font-semibold leading-[1.15] tracking-[-0.03em] text-[color:var(--text-1)]">
              {FOOTER_STATEMENT}
            </p>

            <p className="mt-4 max-w-[38ch] text-[13px] leading-6 text-[color:var(--text-3)]">
              {HERO_SUPPORT}
            </p>

            <p className="mt-6 inline-flex items-center gap-2 rounded-pill border border-[color:var(--surface-border)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-3)]">
              <ShieldCheck className="h-3 w-3 text-[color:var(--accent-sky)]" aria-hidden="true" />
              Preview build
            </p>
          </div>

          <nav aria-label="Footer" className="grid gap-8 sm:grid-cols-3">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-3)]">
                  {column.title}
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="inline-flex min-h-6 items-center text-[13px] text-[color:var(--text-2)] transition-colors duration-150 hover:text-[color:var(--accent-gold)]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-[color:var(--surface-border)] py-7 text-[11px] text-[color:var(--text-3)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} ScholarMind. Built for students revising from their own material.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/privacy" className="transition-colors hover:text-[color:var(--text-1)]">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-[color:var(--text-1)]">
              Terms
            </Link>
            <Link href="/security" className="transition-colors hover:text-[color:var(--text-1)]">
              Security
            </Link>
            <a
              href="mailto:hello.minddevelopment@gmail.com"
              className="transition-colors hover:text-[color:var(--accent-sky)]"
            >
              hello.minddevelopment@gmail.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
