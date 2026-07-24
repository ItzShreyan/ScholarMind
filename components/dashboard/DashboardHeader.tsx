"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, Settings, UserCircle2, X } from "lucide-react";
import { useState } from "react";
import { BrandLink } from "@/components/common/BrandLink";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { isHostOwner } from "@/lib/host";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/studio", label: "Studio" },
  { href: "/schedule", label: "Schedule" },
  { href: "/settings", label: "Settings" }
];

export function DashboardHeader({ email }: { email?: string }) {
  const pathname = usePathname();
  const ownerHostShortcut = isHostOwner(email);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="relative z-30 px-3 pt-3 md:px-4">
      <div className="panel panel-border flex items-center justify-between rounded-[28px] px-3 py-3 sm:px-4 sm:py-3.5">
        <div className="flex items-center gap-3">
          <BrandLink href="/dashboard" subtitle="Studio and AI tutor" allowMobileHostShortcut={ownerHostShortcut} />
        </div>

        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href)) ||
              (item.href === "/dashboard" && pathname.startsWith("/dashboard"));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active ? "bg-[var(--fg)] text-[var(--bg)]" : "hover:bg-white/12"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/settings"
            className="glass smooth-hover inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2.5 sm:min-h-0 sm:min-w-0"
            aria-label="Open settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 md:flex">
            <UserCircle2 className="h-4 w-4" />
            <span className="max-w-44 truncate text-xs font-medium">{email || "Account"}</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/16 lg:hidden"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {mobileMenuOpen ? (
        <nav className="panel panel-border absolute left-3 right-3 top-[calc(100%+0.5rem)] grid gap-1 rounded-[24px] p-2 md:left-4 md:right-4 lg:hidden">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href)) ||
              (item.href === "/dashboard" && pathname.startsWith("/dashboard"));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`min-h-11 rounded-[16px] px-4 py-3 text-sm font-medium transition ${
                  active ? "bg-[var(--fg)] text-[var(--bg)]" : "hover:bg-white/12"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
