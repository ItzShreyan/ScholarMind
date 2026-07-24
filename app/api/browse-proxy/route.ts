import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 15_000;

const BROWSER_HEADERS: Array<Record<string, string>> = [
  {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 ScholarMind/1.0"
  },
  {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  }
];

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;"
  };
  return value.replace(/[&<>'\"]/g, (character) => entities[character] || character);
}

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) {
    const [first, second] = address.split(".").map(Number);
    return (
      first === 10 ||
      first === 127 ||
      first === 0 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 192 && second === 0) ||
      (first === 198 && (second === 18 || second === 19 || second === 51)) ||
      (first === 203 && second === 0) ||
      first >= 224
    );
  }

  const normalized = address.toLowerCase();
  if (normalized === "::" || normalized === "::1" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("ff")) {
    return true;
  }

  const [left, right = ""] = normalized.split("::");
  const leftGroups = left ? left.split(":") : [];
  const rightGroups = right ? right.split(":") : [];
  const groups = normalized.includes("::")
    ? [...leftGroups, ...Array(8 - leftGroups.length - rightGroups.length).fill("0"), ...rightGroups]
    : leftGroups;

  // IPv4-mapped IPv6 addresses can otherwise bypass the IPv4 local-network check.
  if (groups.length === 8 && groups.slice(0, 5).every((group) => group === "0") && groups[5] === "ffff") {
    const high = Number.parseInt(groups[6], 16);
    const low = Number.parseInt(groups[7], 16);
    if (Number.isFinite(high) && Number.isFinite(low)) {
      return isPrivateAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
    }
  }

  return false;
}

async function assertSafeTarget(url: URL) {
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Only public http and https URLs are supported.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Local addresses cannot be opened in the workspace browser.");
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("Private network addresses cannot be opened in the workspace browser.");
    return;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private network addresses cannot be opened in the workspace browser.");
  }
}

async function fetchPage(initialUrl: URL, signal: AbortSignal): Promise<{ response: Response; pageUrl: URL }> {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    await assertSafeTarget(currentUrl);
    let response: Response | null = null;

    for (const headers of BROWSER_HEADERS) {
      try {
        response = await fetch(currentUrl, { headers, redirect: "manual", signal });
        break;
      } catch {
        // Try the next browser profile before reporting the fetch failure.
      }
    }

    if (!response) throw new Error("The website could not be reached.");

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { response, pageUrl: currentUrl };
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    return { response, pageUrl: currentUrl };
  }

  throw new Error("The website redirected too many times.");
}

function makeHtmlResponse(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex",
      "Cache-Control": "no-store"
    }
  });
}

function browserDocumentCsp() {
  // The document is intentionally placed in an iframe without allow-same-origin.
  // This permissive resource policy lets the target retain its own assets and app
  // behavior while the iframe sandbox keeps it isolated from ScholarMind.
  return [
    "default-src * data: blob:",
    "script-src * 'unsafe-inline' 'unsafe-eval' data: blob:",
    "style-src * 'unsafe-inline' data: blob:",
    "img-src * data: blob:",
    "font-src * data: blob:",
    "connect-src * data: blob:",
    "media-src * data: blob:",
    "frame-src * data: blob:",
    "form-action *",
    "base-uri *",
    "frame-ancestors 'self'"
  ].join("; ");
}

function browserNavigationScript() {
  // Keep ordinary links and GET forms inside the proxy. This prevents a click from
  // leaving the proxy and being rejected by a site's X-Frame-Options policy.
  return `<script>(function(){
    var proxy = function(url) {
      var target = new URL(url, document.baseURI);
      if (target.protocol !== "http:" && target.protocol !== "https:") return;
      window.location.assign("/api/browse-proxy?url=" + encodeURIComponent(target.href));
    };
    document.addEventListener("click", function(event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var element = event.target;
      var link = element && element.closest ? element.closest("a[href]") : null;
      if (!link || link.target && link.target !== "_self") return;
      var target = new URL(link.href, document.baseURI);
      if (target.protocol !== "http:" && target.protocol !== "https:" || target.hash && target.pathname === location.pathname && target.search === location.search) return;
      event.preventDefault();
      proxy(target.href);
    }, true);
    document.addEventListener("submit", function(event) {
      var form = event.target;
      if (!form || form.method.toLowerCase() !== "get" || form.target && form.target !== "_self") return;
      var action = new URL(form.action || document.baseURI, document.baseURI);
      if (action.protocol !== "http:" && action.protocol !== "https:") return;
      event.preventDefault();
      var params = new URLSearchParams(new FormData(form));
      params.forEach(function(value, key) { action.searchParams.append(key, value); });
      proxy(action.href);
    }, true);
  })();</script>`;
}

function rewriteRootRelativeUrls(html: string, pageUrl: string) {
  const origin = new URL(pageUrl).origin;
  const absoluteUrl = (path: string) => `${origin}/${path}`;

  // A <base> element handles relative paths such as "assets/app.css", but not
  // root-relative paths such as "/assets/app.css". Those are common in modern
  // sites and would otherwise resolve to ScholarMind instead of the target site.
  return html
    .replace(/\b(src|href|poster|action)=(["'])\/(?!\/)([^"']*)\2/gi, (_match, attribute, quote, path) => {
      return `${attribute}=${quote}${absoluteUrl(path)}${quote}`;
    })
    .replace(/\b(src|href|poster|action)=\/(?!\/)([^\s>"']*)/gi, (_match, attribute, path) => {
      return `${attribute}=${absoluteUrl(path)}`;
    })
    .replace(/\bsrcset=(["'])([^"']*)\1/gi, (_match, quote, sources) => {
      const rewrittenSources = sources.replace(/(^|,\s*)\/(?!\/)/g, (_source: string, prefix: string) => `${prefix}${origin}/`);
      return `srcset=${quote}${rewrittenSources}${quote}`;
    })
    .replace(/url\(\s*(["']?)\/(?!\/)([^)'"\s]+)\1\s*\)/gi, (match, quote, path) => {
      // Keep inline style blocks and style attributes consistent with rewritten
      // HTML attributes. The unmatched form is returned unchanged.
      return path ? `url(${quote}${absoluteUrl(path)}${quote})` : match;
    });
}

function prepareDocument(html: string, pageUrl: string) {
  const injectedHead = `<base href="${escapeHtml(pageUrl)}">${browserNavigationScript()}<meta name="robots" content="noindex">`;
  const document = rewriteRootRelativeUrls(html, pageUrl)
    // The response is served from ScholarMind, so a CSP authored for the target
    // origin would otherwise reject all of the target's assets.
    .replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "")
    .replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, "");

  if (/<head[^>]*>/i.test(document)) {
    return document.replace(/<head[^>]*>/i, (head) => head + injectedHead);
  }

  if (/<html[^>]*>/i.test(document)) {
    return document.replace(/<html[^>]*>/i, (htmlTag) => `${htmlTag}<head>${injectedHead}</head>`);
  }

  return `<!doctype html><html><head>${injectedHead}</head><body>${document}</body></html>`;
}

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) {
    return makeHtmlResponse("<h2>No URL provided</h2><p>Pass a ?url= parameter to browse.</p>", 400);
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(url);
  } catch {
    return makeHtmlResponse("<h2>Invalid URL</h2><p>The URL could not be parsed.</p>", 400);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let page;
    try {
      page = await fetchPage(targetUrl, controller.signal);
    } finally {
      clearTimeout(timeoutId);
    }

    const contentType = page.response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return makeHtmlResponse(`<h2>${escapeHtml(targetUrl.hostname)}</h2><p>This link is not an HTML page. <a href="${escapeHtml(targetUrl.href)}" target="_blank" rel="noreferrer">Open it in a new tab</a>.</p>`);
    }

    const html = await page.response.text();
    const pageUrl = page.pageUrl.href;
    return new Response(prepareDocument(html, pageUrl), {
      status: page.response.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": browserDocumentCsp(),
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "X-Robots-Tag": "noindex",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The page could not be loaded.";
    console.error("browse_proxy_failed", {
      targetUrl: targetUrl?.href ?? null,
      message
    });
    return makeHtmlResponse(`<div style="font-family:sans-serif;text-align:center;padding:2em;"><h2>Could not load this page</h2><p>${escapeHtml(message)}</p><a href="${escapeHtml(targetUrl.href)}" target="_blank" rel="noreferrer">Open in a new tab</a></div>`);
  }
}
