"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type BrandLinkProps = {
  href: string;
  subtitle: string;
  allowMobileHostShortcut?: boolean;
};

export function BrandLink({ href, subtitle, allowMobileHostShortcut = false }: BrandLinkProps) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onClick={(event) => {
        const mobileHostShortcut =
          allowMobileHostShortcut &&
          typeof window !== "undefined" &&
          window.matchMedia("(max-width: 767px)").matches;
        if (!event.shiftKey && !mobileHostShortcut) return;
        event.preventDefault();
        router.push("/host");
      }}
      className="flex items-center gap-3"
      title={allowMobileHostShortcut ? "Shift + click, or tap on mobile, to open the host panel" : "Shift + click to open the host panel"}
    >
      <div className="playful-pop relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_30%_20%,#fff7d6,transparent_28%),linear-gradient(135deg,var(--accent-coral),var(--accent-gold),var(--accent-sky))] shadow-[0_14px_40px_rgba(57,208,255,0.22)]">
        <div className="absolute inset-1 rounded-[1rem] border border-white/35" />
        <svg viewBox="0 0 64 64" className="relative h-8 w-8 drop-shadow-sm" aria-hidden="true">
          <path
            d="M19 35c-6-2-7-11-1-15 1-7 10-9 15-4 6-5 16-1 16 8 6 4 4 14-3 16-2 8-12 10-18 5-6 4-15-1-9-10Z"
            fill="rgba(15,23,42,0.88)"
          />
          <path
            d="M22 28c5-5 10-4 13 1M28 18c-1 8 2 13 8 15M42 25c-5 2-8 6-8 13M23 39c5-2 10-1 14 4"
            fill="none"
            stroke="#fff7d6"
            strokeLinecap="round"
            strokeWidth="3.2"
          />
          <path
            d="M9 46c11 7 34 7 46-3"
            fill="none"
            stroke="#0f172a"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <path
            d="M9 46c11 7 34 7 46-3"
            fill="none"
            stroke="#67e8f9"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold">ScholarMind</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-coral)]">by Mind</p>
        <p className="muted text-xs">{subtitle}</p>
      </div>
    </Link>
  );
}
