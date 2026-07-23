'use client';

import { useEffect } from 'react';

export default function GlobalError({
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
    <html lang="en">
      <head>
        <title>Something went wrong — ScholarMind</title>
        <style>{`
          :root {
            --bg: #07111f;
            --fg: #eef5ff;
            --muted: #b1c2da;
            --surface-border: rgba(255,255,255,0.14);
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: "Avenir Next","Segoe UI","Trebuchet MS",sans-serif;
            background: var(--bg);
            color: var(--fg);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
          }
          .card {
            max-width: 480px;
            width: 100%;
            background: rgba(10,20,36,0.66);
            border: 1px solid var(--surface-border);
            border-radius: 20px;
            padding: 2.5rem 2rem;
            text-align: center;
            backdrop-filter: blur(24px);
          }
          .icon {
            font-size: 2.8rem;
            margin-bottom: 0.75rem;
            line-height: 1;
          }
          h1 {
            font-size: 1.25rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            margin-bottom: 0.5rem;
          }
          p {
            font-size: 0.9rem;
            color: var(--muted);
            line-height: 1.6;
            margin-bottom: 1.75rem;
          }
          button {
            font-family: inherit;
            font-size: 0.875rem;
            font-weight: 600;
            padding: 0.65rem 1.75rem;
            border-radius: 40px;
            border: 1px solid var(--surface-border);
            background: rgba(255,255,255,0.08);
            color: var(--fg);
            cursor: pointer;
            transition: background 0.2s, transform 0.15s;
          }
          button:hover {
            background: rgba(255,255,255,0.14);
            transform: translateY(-1px);
          }
          button:active {
            transform: translateY(0);
          }
          .digest {
            margin-top: 1.5rem;
            font-size: 0.7rem;
            color: rgba(177,194,218,0.4);
            word-break: break-all;
          }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="icon">⚠️</div>
          <h1>Critical error</h1>
          <p>
            ScholarMind encountered an unexpected error. The details
            have been printed to the browser console with the prefix
            <br />
            <code style={{ fontSize: '0.75rem', opacity: 0.6 }}>[ScholarMind FATAL]</code>
          </p>
          <button onClick={() => reset()} type="button">
            Reload page
          </button>
          {error.digest ? (
            <div className="digest">Error ID: {error.digest}</div>
          ) : null}
        </div>
      </body>
    </html>
  );
}
