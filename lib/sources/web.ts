export type SourceSearchEngine = "scholar" | "google" | "duckduckgo";

type WebSourceResult = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  trustLabel: string;
};

type SearchWebSourcesResult = {
  results: WebSourceResult[];
  warning?: string;
};

const trustedLearningHosts = [
  "openstax.org",
  "khanacademy.org",
  "bbc.co.uk",
  "bbc.com",
  "ck12.org",
  "mathsisfun.com",
  "physicsclassroom.com"
];

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

function stripJats(text?: string) {
  return normalizeWhitespace(stripHtml(text || ""));
}

function hostnameFrom(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function hostMatchesTrustedList(host: string) {
  return trustedLearningHosts.some((trustedHost) => host === trustedHost || host.endsWith(`.${trustedHost}`));
}

function trustLabelFor(url: string, source?: string) {
  const host = hostnameFrom(url);
  const sourceText = (source || "").toLowerCase();

  if (
    host.endsWith(".edu") ||
    host.endsWith(".gov") ||
    host.includes("wikipedia.org") ||
    host.includes("nih.gov") ||
    host.includes("ncbi.nlm.nih.gov") ||
    host.includes("openstax.org") ||
    host.includes("khanacademy.org") ||
    host.includes("bbc.co.uk") ||
    host.includes("bbc.com") ||
    host.includes("ck12.org") ||
    host.includes("mathsisfun.com") ||
    host.includes("physicsclassroom.com")
  ) {
    return "Verified";
  }

  if (
    host.includes("arxiv.org") ||
    host.includes("semanticscholar.org") ||
    host.includes("doi.org") ||
    host.includes("crossref.org") ||
    sourceText.includes("openalex") ||
    sourceText.includes("crossref")
  ) {
    return "Scholar";
  }

  if (sourceText.includes("wikipedia") || host.endsWith(".org")) {
    return "Trusted";
  }

  return "Web";
}

function makeId(value: string) {
  return Buffer.from(value).toString("base64url").slice(0, 32);
}

function queryTerms(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 3);
}

function scoreResult(result: WebSourceResult, query: string) {
  const haystack = `${result.title} ${result.snippet} ${result.source}`.toLowerCase();
  const terms = queryTerms(query);
  let score = 0;

  terms.forEach((term) => {
    if (haystack.includes(term)) score += 2;
    if (result.title.toLowerCase().includes(term)) score += 2;
  });

  if (/\.pdf($|\?)/i.test(result.url)) score += 2;
  if (hostMatchesTrustedList(hostnameFrom(result.url))) score += 3;
  if (result.trustLabel === "Verified") score += 4;
  if (result.trustLabel === "Scholar") score += 3;
  if (result.source.toLowerCase().includes("wikipedia")) score += 1;

  return score;
}

function uniqueResults(results: WebSourceResult[], query: string) {
  const seen = new Set<string>();

  return results
    .filter((result) => {
      const key = result.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => scoreResult(b, query) - scoreResult(a, query));
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
    .slice(0, 8)
    .map((item) => ({
      id: makeId(item.FirstURL || item.Text || ""),
      title: (item.Text || "").split(" - ")[0] || hostnameFrom(item.FirstURL || ""),
      url: item.FirstURL || "",
      snippet: clipText(normalizeWhitespace(item.Text || ""), 280),
      source: hostnameFrom(item.FirstURL || ""),
      trustLabel: trustLabelFor(item.FirstURL || "")
    }));

  return [...results, ...topicResults];
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

async function fetchOpenAlexResults(query: string): Promise<WebSourceResult[]> {
  const response = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=6`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ScholarMind/1.0 (mailto:hello@scholarmind.app)"
    },
    next: { revalidate: 60 * 30 }
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    results?: Array<{
      id?: string;
      doi?: string;
      display_name?: string;
      publication_year?: number;
      primary_location?: { landing_page_url?: string; pdf_url?: string; source?: { display_name?: string } };
      abstract_inverted_index?: Record<string, number[]>;
    }>;
  };

  return (data.results ?? []).map((item) => {
    const url = item.primary_location?.pdf_url || item.primary_location?.landing_page_url || item.doi || item.id || "";
    const abstract =
      item.abstract_inverted_index
        ? Object.entries(item.abstract_inverted_index)
            .flatMap(([word, positions]) => positions.map((position) => [position, word] as const))
            .sort((a, b) => a[0] - b[0])
            .map((entry) => entry[1])
            .join(" ")
        : "";

    return {
      id: makeId(url || item.display_name || ""),
      title: item.display_name || "OpenAlex result",
      url,
      snippet: clipText(normalizeWhitespace(abstract || `${item.display_name || ""} (${item.publication_year || "n.d."})`), 280),
      source: item.primary_location?.source?.display_name || "OpenAlex",
      trustLabel: trustLabelFor(url, "OpenAlex")
    };
  });
}

async function fetchCrossrefResults(query: string): Promise<WebSourceResult[]> {
  const response = await fetch(
    `https://api.crossref.org/works?rows=6&query.title=${encodeURIComponent(query)}&select=title,DOI,URL,publisher,abstract,link`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "ScholarMind/1.0 (mailto:hello@scholarmind.app)"
      },
      next: { revalidate: 60 * 30 }
    }
  );

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    message?: {
      items?: Array<{
        title?: string[];
        DOI?: string;
        URL?: string;
        publisher?: string;
        abstract?: string;
        link?: Array<{ URL?: string; "content-type"?: string }>;
      }>;
    };
  };

  return (data.message?.items ?? []).map((item) => {
    const pdfLink = item.link?.find((link) => (link["content-type"] || "").includes("pdf"))?.URL;
    const url = pdfLink || item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : "");
    const title = item.title?.[0] || item.publisher || "Crossref result";

    return {
      id: makeId(url || title),
      title,
      url,
      snippet: clipText(stripJats(item.abstract) || `${title} from ${item.publisher || "Crossref"}.`, 280),
      source: item.publisher || "Crossref",
      trustLabel: trustLabelFor(url, "Crossref")
    };
  });
}

function readXmlTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? normalizeWhitespace(stripHtml(match[1])) : "";
}

async function fetchArxivResults(query: string): Promise<WebSourceResult[]> {
  const response = await fetch(
    `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=5`,
    {
      headers: {
        Accept: "application/atom+xml",
        "User-Agent": "ScholarMind/1.0 (mailto:hello@scholarmind.app)"
      },
      next: { revalidate: 60 * 30 }
    }
  );

  if (!response.ok) {
    return [];
  }

  const xml = await response.text();
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

  return entries.map((entry) => {
    const title = readXmlTag(entry, "title") || "arXiv paper";
    const summary = readXmlTag(entry, "summary");
    const pdfLink =
      entry.match(/<link[^>]+title="pdf"[^>]+href="([^"]+)"/i)?.[1] ||
      entry.match(/<id>([^<]+)<\/id>/i)?.[1] ||
      "";

    return {
      id: makeId(pdfLink || title),
      title,
      url: pdfLink,
      snippet: clipText(summary, 280),
      source: "arXiv",
      trustLabel: "Scholar"
    };
  });
}

async function fetchBingRssResults(query: string): Promise<WebSourceResult[]> {
  const response = await fetch(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`, {
    headers: { Accept: "application/rss+xml" },
    next: { revalidate: 60 * 30 }
  });

  if (!response.ok) {
    return [];
  }

  const xml = await response.text();
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  return items.slice(0, 8).map((item) => {
    const title = readXmlTag(item, "title");
    const url = readXmlTag(item, "link");
    const snippet = readXmlTag(item, "description");

    return {
      id: makeId(url || title),
      title: title || hostnameFrom(url),
      url,
      snippet: clipText(snippet || `Web result from ${hostnameFrom(url)}.`, 280),
      source: hostnameFrom(url),
      trustLabel: trustLabelFor(url)
    };
  });
}

async function fetchTrustedLearningResults(query: string): Promise<WebSourceResult[]> {
  const trustedQuery = `${query} (${trustedLearningHosts
    .slice(0, 5)
    .map((host) => `site:${host}`)
    .join(" OR ")})`;
  const results = await fetchBingRssResults(trustedQuery);

  return results.filter((result) => hostMatchesTrustedList(hostnameFrom(result.url))).slice(0, 8);
}

async function fetchGoogleResults(query: string): Promise<{ results: WebSourceResult[]; warning?: string }> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (apiKey && cx) {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=8`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 30 }
      }
    );

    if (response.ok) {
      const data = (await response.json()) as {
        items?: Array<{ title?: string; link?: string; snippet?: string; displayLink?: string }>;
      };

      return {
        results: (data.items ?? []).map((item) => ({
          id: makeId(item.link || item.title || ""),
          title: item.title || hostnameFrom(item.link || ""),
          url: item.link || "",
          snippet: clipText(normalizeWhitespace(item.snippet || ""), 280),
          source: item.displayLink || hostnameFrom(item.link || ""),
          trustLabel: trustLabelFor(item.link || "", item.displayLink)
        })),
        warning: "Google web results can include pages that are not verified. Double-check them before revising from them."
      };
    }
  }

  return {
    results: await fetchBingRssResults(query),
    warning:
      "Google mode is using an open-web fallback until Google Custom Search keys are configured, so double-check the source quality."
  };
}

async function searchScholarSources(query: string): Promise<WebSourceResult[]> {
  const [openAlexResults, crossrefResults, arxivResults, trustedLearningResults] = await Promise.all([
    fetchOpenAlexResults(query),
    fetchCrossrefResults(query),
    fetchArxivResults(query),
    fetchTrustedLearningResults(query)
  ]);

  const combined = uniqueResults(
    [...trustedLearningResults, ...openAlexResults, ...crossrefResults, ...arxivResults],
    query
  );

  if (combined.length >= 8) {
    return combined.slice(0, 10);
  }

  const wikipediaResults = await fetchWikipediaResults(query);
  return uniqueResults([...combined, ...wikipediaResults], query).slice(0, 10);
}

export async function searchWebSources(
  query: string,
  engine: SourceSearchEngine = "scholar"
): Promise<SearchWebSourcesResult> {
  if (engine === "scholar") {
    return {
      results: await searchScholarSources(query),
      warning:
        "Scholar mode prioritizes academic papers, trusted learning sites, and open references first, but always double-check a source before relying on it."
    };
  }

  if (engine === "google") {
    const googleResults = await fetchGoogleResults(query);
    return {
      results: uniqueResults(googleResults.results, query).slice(0, 10),
      warning: googleResults.warning
    };
  }

  const [duckResults, wikipediaResults] = await Promise.all([
    fetchDuckDuckGoResults(query),
    fetchWikipediaResults(query)
  ]);

  return {
    results: uniqueResults([...duckResults, ...wikipediaResults], query).slice(0, 10),
    warning: "DuckDuckGo web results are helpful for quick context, but not every page is verified."
  };
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
