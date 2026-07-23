"use client";

import { usePathname } from "next/navigation";
import { SecurityBadge } from "@/components/common/SecurityBadge";

export function GlobalSecurityBadge() {
  const pathname = usePathname() || "";
  const hideOnStudio =
    pathname.startsWith("/studio") || pathname.startsWith("/dashboard/workspace");

  if (hideOnStudio) return null;

  return (
    <div className="fixed bottom-3 right-3 z-20 hidden sm:block">
      <SecurityBadge compact />
    </div>
  );
}
