import { cleanStudySourceText } from "@/lib/documents/clean";

type SourceLike = {
  file_name: string;
  extracted_text: string;
};

const contextStopWords = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "been",
  "before",
  "being",
  "between",
  "chapter",
  "definitions",
  "examples",
  "focus",
  "from",
  "have",
  "idea",
  "into",
  "just",
  "make",
  "material",
  "more",
  "most",
  "notes",
  "only",
  "other",
  "page",
  "prompt",
  "question",
  "session",
  "should",
  "source",
  "sources",
  "study",
  "summary",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "topic",
  "uploaded",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "your"
]);

function normalizeWhitespace(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function tokenize(text: string) {
  const words = (text.toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g) ?? []).filter((token) => !contextStopWords.has(token));
  const questionRefs = Array.from(text.matchAll(/\b(?:question|q)\s*(\d{1,2}[a-z]?)\b/gi)).map((match) =>
    match[1].toLowerCase()
  );

  return [...new Set([...words, ...questionRefs])];
}

export function sanitizeSourceText(text: string) {
  return normalizeWhitespace(cleanStudySourceText(text));
}

function splitIntoChunks(text: string) {
  const sanitized = sanitizeSourceText(text).replace(/\n(?=(?:question|q)\s*\d+|\d+[.)]\s)/gi, "\n\n");
  const paragraphs = sanitized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length >= 40);

  if (paragraphs.length) {
    return paragraphs.flatMap((paragraph) => {
      if (paragraph.length <= 520) return [paragraph];

      const sentences = paragraph.match(/[^.!?\n]+[.!?]?/g) ?? [paragraph];
      const chunks: string[] = [];
      let current = "";

      sentences.forEach((sentence) => {
        const next = `${current} ${sentence}`.trim();
        if (next.length > 520 && current) {
          chunks.push(current.trim());
          current = sentence.trim();
        } else {
          current = next;
        }
      });

      if (current.trim()) {
        chunks.push(current.trim());
      }

      return chunks;
    });
  }

  return sanitized ? [sanitized.slice(0, 520)] : [];
}

function scoreChunk(chunk: string, fileName: string, queryTerms: string[], query: string) {
  const haystack = `${fileName} ${chunk}`.toLowerCase();
  let score = 0;
  const questionRefs = Array.from(query.matchAll(/\b(?:question|q)\s*(\d{1,2}[a-z]?)\b/gi)).map((match) =>
    match[1].toLowerCase()
  );

  queryTerms.forEach((term) => {
    if (haystack.includes(term)) score += 3;
    if (chunk.toLowerCase().includes(term)) score += 2;
    if (fileName.toLowerCase().includes(term)) score += 1;
  });

  questionRefs.forEach((ref) => {
    if (new RegExp(`\\b(?:question|q)\\s*${ref}\\b|\\b${ref}[.)]\\b`, "i").test(chunk)) {
      score += 9;
    }
  });

  if (/question\s*\d+|q\d+/i.test(chunk)) score += 2;
  if (/[:=]/.test(chunk)) score += 1;
  if (/\btherefore\b|\bbecause\b|\bmeans\b|\brefers to\b|\bis\b/i.test(chunk)) score += 1;

  return score;
}

export function buildStudyContext(
  files: SourceLike[],
  query = "",
  {
    maxCharacters = 16000,
    maxChunks = 16
  }: {
    maxCharacters?: number;
    maxChunks?: number;
  } = {}
) {
  const queryTerms = tokenize(query);
  const scoredChunks = files.flatMap((file) => {
    const chunks = splitIntoChunks(file.extracted_text);

    return chunks.map((chunk, index) => ({
      fileName: file.file_name,
      chunk,
      index,
      score: scoreChunk(chunk, file.file_name, queryTerms, query) + (index === 0 ? 1 : 0)
    }));
  });

  const sortedChunks = (queryTerms.length
    ? scoredChunks.sort((a, b) => b.score - a.score || a.index - b.index)
    : scoredChunks.sort((a, b) => a.index - b.index)).slice(0, maxChunks * 2);

  const chosen: string[] = [];
  const seenByFile = new Map<string, number>();
  let totalLength = 0;

  for (const item of sortedChunks) {
    const fileCount = seenByFile.get(item.fileName) ?? 0;
    if (fileCount >= 4) continue;

    const block = `Source: ${item.fileName}\n${item.chunk}`;
    if (totalLength + block.length > maxCharacters) continue;

    chosen.push(block);
    seenByFile.set(item.fileName, fileCount + 1);
    totalLength += block.length + 2;

    if (chosen.length >= maxChunks) break;
  }

  if (!chosen.length) {
    return files
      .slice(0, 4)
      .map((file) => `Source: ${file.file_name}\n${sanitizeSourceText(file.extracted_text).slice(0, 1200)}`)
      .join("\n\n");
  }

  return chosen.join("\n\n");
}
