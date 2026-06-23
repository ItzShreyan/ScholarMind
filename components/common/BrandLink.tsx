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
        <span className="relative font-serif text-lg font-black text-slate-950">S</span>
      </div>
      <div>
        <p className="text-sm font-semibold">ScholarMind</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-coral)]">by Mind</p>
        <p className="muted text-xs">{subtitle}</p>
      </div>
    </Link>
  );
}
