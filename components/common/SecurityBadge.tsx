import Link from "next/link";
import { ShieldCheck } from "lucide-react";

type SecurityBadgeProps = {
  compact?: boolean;
};

export function SecurityBadge({ compact = false }: SecurityBadgeProps) {
  return (
    <Link
      href="/security"
      className={`group inline-flex items-center gap-2 rounded-full border border-white/12 bg-[rgba(9,16,31,0.72)] px-3 py-2 text-xs font-semibold text-white/85 shadow-[0_14px_40px_rgba(2,6,23,0.24)] backdrop-blur-xl transition hover:border-[rgba(121,247,199,0.35)] hover:text-white ${
        compact ? "max-w-[14rem]" : ""
      }`}
      aria-label="Secured by the Mind Security Engine"
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--accent-mint),var(--accent-sky))] text-slate-950 shadow-[0_10px_30px_rgba(57,208,255,0.2)]">
        <ShieldCheck className="h-4 w-4" />
      </span>
      <span className="leading-tight">
        <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--accent-mint)]">Secured by</span>
        <span className="block truncate">Mind Security Engine</span>
      </span>
    </Link>
  );
}
