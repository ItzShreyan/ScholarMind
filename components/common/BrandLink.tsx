"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";

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
      <Logo size={44} variant="icon" />
      <div>
        <p className="text-sm font-semibold">ScholarMind</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-coral)]">by Mind</p>
        <p className="muted text-xs">{subtitle}</p>
      </div>
    </Link>
  );
}
