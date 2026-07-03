import { NextResponse } from "next/server";

/**
 * Proxy endpoint for the workspace browser iframe.
 * Fetches external pages server-side and serves them inline,
 * so the iframe loads from 'self' and is never blocked by CSP/X-Frame-Options.
 *
 * Works on every device because there are no origin restrictions
 * on the rendered content.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response(
      `<!doctype html>
<html><body style="font-family:sans-serif;padding:2em;color:#666">
<h2>No URL provided</h2>
<p>Pass a ?url= parameter to browse.</p>
</body></html>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-Robots-Tag": "noindex"
        }
      }
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(url);
  } catch {
    return new Response(
      `<!doctype html>
<html><body style="font-family:sans-serif;padding:2em;color:#666">
<h2>Invalid URL</h2>
<p>The provided URL could not be parsed. Check the address and try again.</p>
</body></html>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-Robots-Tag": "noindex"
        }
      }
    );
  }

  // Only allow http/https URLs for safety
  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    return new Response(
      `<!doctype html>
<html><body style="font-family:sans-serif;padding:2em;color:#666">
<h2>Blocked protocol</h2>
<p>Only http and https URLs are supported.</p>
</body></html>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-Robots-Tag": "noindex"
        }
      }
    );
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 ScholarMind/1.0"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000)
    });

    const contentType = response.headers.get("content-type") || "";

    // For non-HTML responses, try to wrap them in a simple viewer
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      const text = await response.text();
      const safeText = text
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">");

      return new Response(
        `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${targetUrl.hostname}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 1.5em; color: #1a1a2e; background: #fff; line-height: 1.6; }
    h2 { margin: 0 0 0.5em; font-size: 1.1rem; color: #666; }
    a { color: #3b82f6; }
    pre { white-space: pre-wrap; word-break: break-word; font-size: 0.85rem; background: #f8fafc; border-radius: 12px; padding: 1em; }
  </style>
</head>
<body>
  <h2>${targetUrl.hostname}</h2>
  <p>The page returned a non-HTML response. Showing raw content below.</p>
  <pre>${safeText.slice(0, 50000)}</pre>
</body>
</html>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Robots-Tag": "noindex"
          }
        }
      );
    }

    const html = await response.text();

    // Inject a base tag so relative links/paths resolve correctly
    const baseTag = `<base href="${targetUrl.origin}/">`;

    // Inject ScholarMind wrapper styles to make the page usable inside the iframe
    const wrapperStyles = `
    <style>
      /* Reset ScholarMind overrides for proxied content */
      body { background: #fff !important; color: #1a1a2e !important; }
      a { color: #1d4ed8 !important; }
      img { max-width: 100% !important; height: auto !important; }
      /* Prevent layout shift from fixed elements */
      .fixed, .sticky { position: static !important; }
    </style>
    <meta name="robots" content="noindex" />
    `;

    const modifiedHtml = html
      .replace(/<head[^>]*>/i, (match) => `${match}${baseTag}${wrapperStyles}`)
      .replace(/<base\s[^>]*>/gi, baseTag);

    return new Response(modifiedHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  } catch {
    return new Response(
      `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 2em; color: #1a1a2e; background: #f8fafc; text-align: center; line-height: 1.6; }
    .card { max-width: 28rem; margin: 2rem auto; background: #fff; border-radius: 20px; padding: 2em; box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
    h2 { margin: 0 0 0.5em; font-size: 1.2rem; }
    p { color: #64748b; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Could not load this page</h2>
    <p>
      ${targetUrl.hostname} could not be reached. 
      Try opening it in a new tab, or use "Save as note" to import
      it as a study source instead.
    </p>
  </div>
</body>
</html>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-Robots-Tag": "noindex"
        }
      }
    );
  }
}
