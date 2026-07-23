'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log with a greppable prefix so errors are easy to find in devtools
    console.error('[ScholarMind FATAL]', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-[--bg] p-6">
      <div className="w-full max-w-md rounded-[20px] border border-[--surface-border] bg-surface/80 p-10 text-center backdrop-blur-2xl">
        <div className="mb-3 text-[2.8rem] leading-none">⚠️</div>
        <h1 className="mb-2 text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
          Something went wrong
        </h1>
        <p className="mb-7 text-sm leading-relaxed text-[--muted]">
          ScholarMind ran into an unexpected error. Check the browser
          console for details (look for <code className="text-[0.7rem] opacity-60">[ScholarMind FATAL]</code>).
        </p>
        <button
          onClick={() => reset()}
          type="button"
          className="cursor-pointer rounded-[40px] border border-[--surface-border] bg-white/8 px-7 py-2.5 text-sm font-semibold text-[--fg] transition-all hover:bg-white/14 hover:-translate-y-0.5 active:translate-y-0"
        >
          Try again
        </button>
        {error.digest && (
          <p className="mt-6 break-all text-[0.7rem] text-[--muted]/40">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
