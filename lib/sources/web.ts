type WebSourceResult = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  trustLabel: string;
};

function normalizeWhitespace(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function clipText(text: string, limit: number) {
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function stripHtml(text: string) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function hostnameFrom(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function trustLabelFor(url: string, source?: string) {
  const host = hostnameFrom(url);

  if (
    host.endsWith(".edu") ||
    host.endsWith(".gov") ||
    host.includes("wikipedia.org") ||
    host.includes("nih.gov") ||
    host.includes("ncbi.nlm.nih.gov") ||
    host.includes("openstax.org") ||
    host.includes("khanacademy.org")
  ) {
    return "Verified";
  }

  if ((source || "").toLowerCase().includes("wikipedia") || host.endsWith(".org")) {
    return "Trusted";
  }

  return "Web";
}

function makeId(value: string) {
  return Buffer.from(value).toString("base64url").slice(0, 32);
}

function uniqueResults(results: WebSourceResult[]) {
  const seen = new Set<string>();

  return results.filter((result) => {
    const key = result.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function flattenDuckTopics(items: unknown[]): Array<{ Text?: string; FirstURL?: string }> {
  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    if ("Topics" in item && Array.isArray(item.Topics)) {
      return flattenDuckTopics(item.Topics);
    }

    return [item as { Text?: string; FirstURL?: string }];
  });
}

async function fetchDuckDuckGoResults(query: string): Promise<WebSourceResult[]> {
  const response = await fetch(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`,
    {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 30 }
    }
  );

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    AbstractSource?: string;
    RelatedTopics?: unknown[];
  };

  const results: WebSourceResult[] = [];

  if (data.AbstractText && data.AbstractURL) {
    results.push({
      id: makeId(data.AbstractURL),
      title: hostnameFrom(data.AbstractURL),
      url: data.AbstractURL,
      snippet: clipText(normalizeWhitespace(data.AbstractText), 280),
      source: data.AbstractSource || hostnameFrom(data.AbstractURL),
      trustLabel: trustLabelFor(data.AbstractURL, data.AbstractSource)
    });
  }

  const topicResults = flattenDuckTopics(data.RelatedTopics ?? [])
    .filter((item) => item.FirstURL && item.Text)
    .slice(0, 6)
    .map((item) => ({
      id: makeId(item.FirstURL || item.Text || ""),
      title: (item.Text || "").split(" - ")[0] || hostnameFrom(item.FirstURL || ""),
      url: item.FirstURL || "",
      snippet: clipText(normalizeWhitespace(item.Text || ""), 280),
      source: hostnameFrom(item.FirstURL || ""),
      trustLabel: trustLabelFor(item.FirstURL || "")
    }));

  return uniqueResults([...results, ...topicResults]);
}

async function fetchWikipediaResults(query: string): Promise<WebSourceResult[]> {
  const response = await fetch(
    `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json`,
    {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 30 }
    }
  );

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as [string, string[], string[], string[]];
  const titles = Array.isArray(data[1]) ? data[1] : [];
  const urls = Array.isArray(data[3]) ? data[3] : [];

  const summaries = await Promise.all(
    titles.slice(0, 5).map(async (title) => {
      try {
        const summaryResponse = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          {
            headers: { Accept: "application/json" },
            next: { revalidate: 60 * 30 }
          }
        );

        if (!summaryResponse.ok) {
          return "";
        }

        const summary = (await summaryResponse.json()) as { extract?: string };
        return normalizeWhitespace(summary.extract || "");
      } catch {
        return "";
      }
    })
  );

  return urls.slice(0, 5).map((url, index) => ({
    id: makeId(url),
    title: titles[index] || hostnameFrom(url),
    url,
    snippet: clipText(summaries[index] || `Wikipedia article for ${titles[index] || query}.`, 280),
    source: "Wikipedia",
    trustLabel: trustLabelFor(url, "Wikipedia")
  }));
}

export async function searchWebSources(query: string) {
  const [duckResults, wikipediaResults] = await Promise.all([
    fetchDuckDuckGoResults(query),
    fetchWikipediaResults(query)
  ]);

  return uniqueResults([...duckResults, ...wikipediaResults]).slice(0, 8);
}

export async function extractWebSourceText({
  title,
  url,
  snippet
}: {
  title: string;
  url: string;
  snippet?: string;
}) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.8",
        "User-Agent": "ScholarMind/1.0 (+https://scholarmind.app)"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      throw new Error(`Unable to open ${hostnameFrom(url)} right now.`);
    }

    const contentType = response.headers.get("content-type") || "";
    let body = "";

    if (contentType.includes("application/json")) {
      body = JSON.stringify(await response.json(), null, 2);
    } else {
      body = await response.text();
    }

    const normalizedBody = normalizeWhitespace(
      contentType.includes("text/html") || /<html|<body|<article/i.test(body) ? stripHtml(body) : body
    );

    const combined = normalizeWhitespace(
      [`Source title: ${title}`, `Source URL: ${url}`, snippet ? `Summary: ${snippet}` : "", normalizedBody]
        .filter(Boolean)
        .join("\n\n")
    );

    if (combined.length >= 120) {
      return clipText(combined, 24000);
    }
  } catch {
    // Fall back to the search snippet below.
  }

  const fallback = normalizeWhitespace(
    [`Source title: ${title}`, `Source URL: ${url}`, snippet ? `Summary: ${snippet}` : ""].filter(Boolean).join("\n\n")
  );

  if (fallback.length < 80) {
    throw new Error("This web source could not be read clearly enough. Try another result or upload a file.");
  }

  return clipText(fallback, 4000);
}
