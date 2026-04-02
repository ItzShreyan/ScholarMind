"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type BrandLinkProps = {
  href: string;
  subtitle: string;
};

export function BrandLink({ href, subtitle }: BrandLinkProps) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onClick={(event) => {
        if (!event.shiftKey) return;
        event.preventDefault();
        router.push("/host");
      }}
      className="flex items-center gap-3"
      title="Shift + click to open the host panel"
    >
      <div className="playful-pop h-10 w-10 rounded-2xl bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-gold),var(--accent-sky))]" />
      <div>
        <p className="text-sm font-semibold">ScholarMind</p>
        <p className="muted text-xs">{subtitle}</p>
      </div>
    </Link>
  );
}
