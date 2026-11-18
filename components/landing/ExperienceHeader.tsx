"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { EXPERIENCE_NAV } from "@/components/landing/experienceContent";
import { Logo } from "@/components/ui/Logo";

/**
 * The fixed header.
 *
 * Restrained on purpose: a translucent rail over the dark world, which flips to
 * an ivory-tinted rail once the page has scrolled into the editorial half. The
 * `light` prop is driven by the parent from the same background stage the
 * renderer uses, so the header can never be dark text on a dark world.
 *
 * The mobile panel is a plain disclosure — no focus trap needed because it is
 * not a modal: it pushes nothing, covers nothing important, and closes on
 * Escape, on a link, and when the viewport grows past `lg`.
 */

type ExperienceHeaderProps = {
  /** True once the page has entered the ivory part of the timeline. */
  light?: boolean;
  /** Called with a section id when an in-page link is chosen. */
  onNavigate?: (sectionId: string) => void;
};

export function ExperienceHeader({ light = false, onNavigate }: ExperienceHeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const query = window.matchMedia("(min-width: 1024px)");
    const onWide = () => {
      if (query.matches) setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    query.addEventListener("change", onWide);

    return () => {
      window.removeEventListener("keydown", onKey);
      query.removeEventListener("change", onWide);
    };
  }, [open]);

  const handleNav = (sectionId: string) => (event: React.MouseEvent) => {
    if (!onNavigate) return;
    event.preventDefault();
    onNavigate(sectionId);
    setOpen(false);
  };

  return (
    <header
      data-light={light ? "true" : "false"}
      className={`sticky top-0 z-40 transition-colors duration-500 ${
        scrolled || open ? "backdrop-blur-md" : ""
      } ${
        light
          ? // Fully opaque in the editorial half. At 88% the constellation's
            // node labels and card edges were legible *through* the header,
            // which reads as a rendering fault rather than as translucency.
            "border-b border-[color:var(--editorial-border)] bg-[color:var(--editorial-bg)] text-[color:var(--editorial-fg)]"
          : "border-b border-[color:var(--surface-border)] bg-[rgba(8,13,18,0.82)] text-[color:var(--text-1)]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0"
          aria-label="ScholarMind home"
          onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}
        >
          <span className="inline-flex items-center gap-2.5">
            <Logo size={30} />
            <span className="flex flex-col leading-none">
              <span className="font-display text-[15px] font-semibold tracking-[-0.02em]">
                ScholarMind
              </span>
              <span
                className={`mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] ${
                  light ? "text-[color:var(--editorial-accent)]" : "text-[color:var(--accent-gold)]"
                }`}
              >
                Learning world
              </span>
            </span>
          </span>
        </Link>

        {/* Centred desktop navigation. */}
        <nav aria-label="Sections" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {EXPERIENCE_NAV.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  onClick={handleNav(link.sectionId)}
                  className={`text-[13px] font-medium transition-colors duration-150 ${
                    light
                      ? "text-[color:var(--editorial-fg-soft)] hover:text-[color:var(--editorial-accent)]"
                      : "text-[color:var(--text-2)] hover:text-[color:var(--text-1)]"
                  }`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/auth"
            className={`hidden min-h-10 items-center rounded-pill px-3.5 text-[13px] font-medium transition-colors duration-150 sm:inline-flex ${
              light
                ? "text-[color:var(--editorial-fg-soft)] hover:text-[color:var(--editorial-fg)]"
                : "text-[color:var(--text-2)] hover:text-[color:var(--text-1)]"
            }`}
          >
            Log in
          </Link>

          <Link
            href="/auth"
            className="inline-flex min-h-10 items-center rounded-pill bg-[linear-gradient(135deg,var(--accent-gold),var(--accent-coral))] px-4 text-[13px] font-semibold text-[#1a1208] transition-transform duration-150 hover:scale-[1.02]"
          >
            Get started
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="experience-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-pill transition-colors duration-150 lg:hidden ${
              light
                ? "text-[color:var(--editorial-fg)] hover:bg-[rgba(24,33,42,0.06)]"
                : "text-[color:var(--text-1)] hover:bg-[rgba(243,240,233,0.08)]"
            }`}
          >
            {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="experience-mobile-nav"
          className={`border-t lg:hidden ${
            light
              ? "border-[color:var(--editorial-border)] bg-[color:var(--editorial-bg)]"
              : "border-[color:var(--surface-border)] bg-[rgba(8,13,18,0.96)]"
          }`}
        >
          <ul className="mx-auto max-w-7xl px-5 py-3 sm:px-6">
            {EXPERIENCE_NAV.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  onClick={handleNav(link.sectionId)}
                  className={`flex min-h-11 items-center text-sm font-medium ${
                    light ? "text-[color:var(--editorial-fg)]" : "text-[color:var(--text-1)]"
                  }`}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li className="sm:hidden">
              <Link
                href="/auth"
                className={`flex min-h-11 items-center text-sm font-medium ${
                  light ? "text-[color:var(--editorial-fg)]" : "text-[color:var(--text-1)]"
                }`}
              >
                Log in
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </header>
  );
}
