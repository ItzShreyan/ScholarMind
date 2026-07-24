"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const ScrollShowcase = dynamic(
  () => import("@/components/landing/ScrollShowcase").then((module) => module.ScrollShowcase),
  { ssr: false, loading: () => <ScrollShowcaseSkeleton /> }
);

function ScrollShowcaseSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12 lg:px-8" aria-label="Loading study flow" role="status">
      <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-10 max-w-xl animate-pulse rounded bg-white/10" />
      <div className="mt-3 h-5 max-w-2xl animate-pulse rounded bg-white/10" />
      <div className="mt-6 min-h-[380px] animate-pulse rounded-[34px] border border-white/10 bg-white/5" />
      <span className="sr-only">Loading study flow</span>
    </section>
  );
}

/** Load the scroll-linked Framer Motion scene only as it nears the viewport. */
export function DeferredScrollShowcase() {
  const markerRef = useRef<HTMLDivElement>(null);
  const [loadShowcase, setLoadShowcase] = useState(false);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !("IntersectionObserver" in window)) {
      setLoadShowcase(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setLoadShowcase(true);
        observer.disconnect();
      },
      { rootMargin: "320px 0px" }
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, []);

  return <div ref={markerRef}>{loadShowcase ? <ScrollShowcase /> : <ScrollShowcaseSkeleton />}</div>;
}
