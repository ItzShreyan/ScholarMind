"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const visitorStorageKey = "scholarmind_visitor_key";
const lastPageStorageKey = "scholarmind_last_page_view";

function getVisitorKey() {
  if (typeof window === "undefined") return "server";

  const existing = window.localStorage.getItem(visitorStorageKey);
  if (existing) return existing;

  const next = `visitor_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(visitorStorageKey, next);
  return next;
}

export function TelemetryTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const visitorKey = getVisitorKey();
    const page = pathname;

    if (window.sessionStorage.getItem(lastPageStorageKey) === page) return;
    window.sessionStorage.setItem(lastPageStorageKey, page);

    void fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "page_view",
        page,
        visitorKey
      }),
      keepalive: true
    }).catch(() => {});
  }, [pathname]);

  return null;
}
