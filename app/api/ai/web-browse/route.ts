import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

async function fetchWithTimeout(url: string, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 ScholarMind/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      redirect: "follow",
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<button[\s\S]*?<\/button>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&/gi, "&")
    .replace(/</gi, "<")
    .replace(/>/gi, ">")
    .replace(/"/gi, '"')
    .replace(/'/gi, "'")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clipText(text: string, maxChars = 12000): string {
  return text.length > maxChars ? text.slice(0, maxChars).trim() + "..." : text;
}

function extractTitle(html: string, url: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (match) return stripHtml(match[1]).trim() || url;
  return url;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { url?: string };
    const targetUrl = body?.url?.trim();

    if (!targetUrl) {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json({ error: "Only http and https URLs are supported." }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL provided." }, { status: 400 });
    }

    // Try to fetch with readability first, fallback to Jina reader, then bare HTML strip
    let content = "";
    let title = parsed.hostname;
    let contentType = "";
    let success = false;

    // Strategy 1: Direct fetch + Readability (if jsdom is available)
    try {
      const response = await fetchWithTimeout(parsed.toString());
      if (response.ok) {
        contentType = response.headers.get("content-type") || "";
        const html = await response.text();
        title = extractTitle(html, parsed.toString());

        // Try using JSDOM + Readability for article extraction
        try {
          const [{ Readability }, { JSDOM }] = await Promise.all([
            import("@mozilla/readability"),
            import("jsdom")
          ]);
          const dom = new JSDOM(html, { url: parsed.toString() });
          const article = new Readability(dom.window.document).parse();
          if (article?.textContent && article.textContent.length > 200) {
            content = article.textContent
              .replace(/\s+/g, " ")
              .trim();
            success = true;
          }
        } catch {
          // Readability failed, fall through to strip
        }

        if (!success) {
          content = stripHtml(html);
          if (content.length > 100) success = true;
        }
      }
    } catch {
      // First strategy failed
    }

    // Strategy 2: Jina AI reader
    if (!success || content.length < 100) {
      try {
        const readerUrl = `https://r.jina.ai/http://${parsed.hostname}${parsed.pathname}${parsed.search}`;
        const response = await fetchWithTimeout(readerUrl, 10000);
        if (response.ok) {
          const text = await response.text();
          const clean = text
            .replace(/\s+/g, " ")
            .trim();
          if (clean.length > 100) {
            content = clean;
            success = true;
          }
        }
      } catch {
        // Reader fallback failed
      }
    }

    if (!success || content.length < 50) {
      return NextResponse.json({
        title,
        url: parsed.toString(),
        content: "",
        warning: "Could not extract content from this page. It may be blocked or require JavaScript."
      });
    }

    return NextResponse.json({
      title,
      url: parsed.toString(),
      content_type: contentType,
      content: clipText(content, 15000)
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to browse URL." },
      { status: 500 }
    );
  }
}
