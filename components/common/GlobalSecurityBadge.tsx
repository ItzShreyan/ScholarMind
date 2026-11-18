"use client";

import { usePathname } from "next/navigation";
import { SecurityBadge } from "@/components/common/SecurityBadge";

export function GlobalSecurityBadge() {
  const pathname = usePathname() || "";
  const hideOnStudio =
    pathname.startsWith("/studio") || pathname.startsWith("/dashboard/workspace");

  // The landing page is a designed, scroll-controlled composition: a floating
  // badge lands on top of the product panels there and reads as an overlay that
  // failed to dismiss. The security story is told in the page itself (and in the
  // footer's Security link) on that route.
  const hideOnLanding = pathname === "/";

  if (hideOnStudio || hideOnLanding) return null;

  return (
    <div className="fixed bottom-3 right-3 z-20 hidden sm:block">
      <SecurityBadge compact />
    </div>
  );
}
