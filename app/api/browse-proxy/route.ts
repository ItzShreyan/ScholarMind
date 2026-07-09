import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

async function tryFetchUrl(url: string, signal: AbortSignal): Promise<Response | null> {
  const strategies: Array<Record<string, string>> = [
    {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 ScholarMind/1.0"
    },
    {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    },
    {
      "User-Agent": "Mozilla/5.0 (compatible; ScholarMind/1.0; +https://scholarmind.app)"
    }
  ];

  for (const [index, strategy] of strategies.entries()) {
    try {
      const response = await fetch(url, {
        headers: strategy,
        redirect: "follow",
        signal
      });
      const contentType = response.headers.get("content-type") || "";
      if (response.ok && (contentType.includes("text/html") || contentType.includes("application/xhtml"))) {
        return response;
      }
      if (index < strategies.length - 1) continue;
      return response;
    } catch {
      if (index === strategies.length - 1) throw new Error("All strategies failed");
      continue;
    }
  }
  return null;
}

function makeHtmlResponse(html: string) {
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" }
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return makeHtmlResponse('<h2>No URL provided</h2><p>Pass a ?url= parameter to browse.</p>');
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(url);
  } catch {
    return makeHtmlResponse('<h2>Invalid URL</h2><p>The URL could not be parsed.</p>');
  }

  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    return makeHtmlResponse('<h2>Blocked protocol</h2><p>Only http and https URLs are supported.</p>');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const response = await tryFetchUrl(targetUrl.toString(), controller.signal);
    clearTimeout(timeoutId);

    if (!response) throw new Error("All fetch strategies failed");

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return makeHtmlResponse('<h2>' + targetUrl.hostname + '</h2><p>Non-HTML response.</p><pre>' + text.slice(0, 50000) + '</pre>');
    }

    // Insert base tag, wrapper styles, and meta
    let modifiedHtml = text;
    modifiedHtml = modifiedHtml.replace(/<head[^>]*>/i, (match) => {
      return match + '<base href="' + targetUrl.origin + '/"><style>body{background:#fff!important;color:#1a1a2e!important}a{color:#1d4ed8!important}img{max-width:100%!important;height:auto!important}.fixed,.sticky{position:static!important}[style*="position: fixed"],[style*="position:fixed"]{position:static!important}iframe{max-width:100%!important}</style><meta name="robots" content="noindex">';
    });
    modifiedHtml = modifiedHtml.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, "");
    modifiedHtml = modifiedHtml.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");

    // Add blocked notice if needed
    const blockedKeywords = ["access denied", "Access Denied", "blocked", "captcha", "challenge", "cloudflare", "Checking your browser"];
    const isBlocked = blockedKeywords.some((kw) => text.includes(kw)) || text.length < 200;
    if (isBlocked) {
      const notice = '<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px;margin-bottom:16px;font-size:14px;color:#856404;"><strong>Content may be blocked.</strong> This site uses anti-bot protection. <a href="' + targetUrl.toString() + '" target="_blank" style="color:#1d4ed8;font-weight:600;text-decoration:underline;">Open in a new tab</a> to view it directly.</div>';
      modifiedHtml = modifiedHtml.replace(/<body[^>]*>/i, (match) => match + notice);
    }

    return new Response(modifiedHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Frame-Options": "SAMEORIGIN"
      }
    });
  } catch {
    const host = targetUrl.hostname;
    const href = targetUrl.toString();
    return makeHtmlResponse('<div style="font-family:sans-serif;text-align:center;padding:2em;"><h2>Could not load this page</h2><p>' + host + ' blocked the request.</p><a href="' + href + '" target="_blank">Open in new tab</a></div>');
  }
}
