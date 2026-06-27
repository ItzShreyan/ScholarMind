"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Settings, UserCircle2 } from "lucide-react";
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

  return (
    <header className="px-3 pt-3 md:px-4">
      <div className="panel panel-border flex items-center justify-between rounded-[28px] px-4 py-3.5">
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
            className="glass smooth-hover inline-flex rounded-full p-2.5"
            aria-label="Open settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 md:flex">
            <UserCircle2 className="h-4 w-4" />
            <span className="max-w-44 truncate text-xs font-medium">{email || "Account"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
