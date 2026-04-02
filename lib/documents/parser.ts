import {
  isDocxDocument,
  isImageDocument,
  isPdfDocument,
  isSpreadsheetDocument,
  isTextLikeDocument
} from "@/lib/documents/formats";

type ExtractionResult = {
  text: string;
  readable: boolean;
  rejectionReason?: string;
};

const maxExtractedCharacters = 64000;

function normalizeWhitespace(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function clipText(text: string, limit = maxExtractedCharacters) {
  return text.length > limit ? `${text.slice(0, limit).trim()}\n\n[Content clipped for speed.]` : text;
}

function mergeExtractedText(primary: string, secondary: string) {
  const base = normalizeWhitespace(primary);
  const extra = normalizeWhitespace(secondary);

  if (!base) return extra;
  if (!extra) return base;
  if (base === extra) return base;

  const seen = new Set(
    base
      .split("\n")
      .map((line) => normalizeWhitespace(line))
      .filter(Boolean)
  );

  const uniqueExtra = extra
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length >= 18 && !seen.has(line));

  return uniqueExtra.length ? `${base}\n\n${uniqueExtra.join("\n")}` : base;
}

function isReadableContent(text: string) {
  const normalized = normalizeWhitespace(text);
  const words = normalized.match(/[A-Za-z0-9][A-Za-z0-9'-]{1,}/g) ?? [];
  return normalized.length >= 24 || words.length >= 4;
}

function isLightweightReadableContent(text: string) {
  const normalized = normalizeWhitespace(text);
  const words = normalized.match(/[A-Za-z0-9][A-Za-z0-9'-]{1,}/g) ?? [];
  return normalized.length >= 12 || words.length >= 3;
}

function decodeBasicHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripHtml(text: string) {
  return decodeBasicHtmlEntities(
    text
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function stripRtf(text: string) {
  return text
    .replace(/\\par[d]?/gi, "\n")
    .replace(/\\tab/gi, "\t")
    .replace(/\\'[0-9a-f]{2}/gi, " ")
    .replace(/\\[a-z]+\d* ?/gi, " ")
    .replace(/[{}]/g, " ");
}

function decodeUtf8(buffer: Buffer) {
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

function summarizeCsvLike(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 80)
    .join("\n");
}

async function extractTextDocument(buffer: Buffer, fileName: string) {
  const raw = decodeUtf8(buffer);

  if (/\.(html?|xml)$/i.test(fileName)) {
    return stripHtml(raw);
  }

  if (/\.rtf$/i.test(fileName)) {
    return stripRtf(raw);
  }

  return raw;
}

async function extractDocxDocument(buffer: Buffer) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

async function extractSpreadsheetDocument(buffer: Buffer) {
  const xlsx = await import("xlsx");
  const workbook = xlsx.read(buffer, { type: "buffer", cellText: true, cellDates: true });

  return workbook.SheetNames.slice(0, 6)
    .map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, {
        header: 1,
        blankrows: false,
        raw: false,
        defval: ""
      }) as Array<Array<string | number | boolean>>;

      const preview = rows
        .slice(0, 60)
        .map((row) => row.map((cell) => String(cell ?? "").trim()).join("\t"))
        .filter(Boolean)
        .join("\n");

      return preview ? `Sheet: ${sheetName}\n${preview}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

async function recognizeImage(buffer: Buffer) {
  const { recognizeImageBuffer } = await import("@/lib/documents/ocr");
  return recognizeImageBuffer(buffer);
}

async function extractPdfDocument(buffer: Buffer) {
  const pdfParse = (await import("pdf-parse")).default;
  let parsedText = "";

  try {
    const parsed = await pdfParse(buffer);
    parsedText = normalizeWhitespace(parsed.text || "");
  } catch {
    parsedText = "";
  }

  if (isReadableContent(parsedText)) {
    if (parsedText.length >= 3200) {
      return parsedText;
    }
  }

  const { extractPdfDocumentByOcr } = await import("@/lib/documents/ocr");
  const ocrText = normalizeWhitespace(await extractPdfDocumentByOcr(buffer));
  return normalizeWhitespace(mergeExtractedText(parsedText, ocrText));
}

function unreadable(reason: string): ExtractionResult {
  return {
    text: "",
    readable: false,
    rejectionReason: reason
  };
}

async function extractFromBuffer({
  buffer,
  fileName,
  fileType
}: {
  buffer: Buffer;
  fileName: string;
  fileType?: string;
}): Promise<ExtractionResult> {
  try {
    let text = "";

    if (isTextLikeDocument(fileName, fileType)) {
      text = /\.(csv|tsv)$/i.test(fileName)
        ? summarizeCsvLike(await extractTextDocument(buffer, fileName))
        : await extractTextDocument(buffer, fileName);
    } else if (isSpreadsheetDocument(fileName, fileType)) {
      text = await extractSpreadsheetDocument(buffer);
    } else if (isDocxDocument(fileName, fileType)) {
      text = await extractDocxDocument(buffer);
    } else if (isPdfDocument(fileName, fileType)) {
      text = await extractPdfDocument(buffer);
    } else if (isImageDocument(fileName, fileType)) {
      text = await recognizeImage(buffer);
    } else {
      return unreadable("This file type is not supported yet. Reupload it as PDF, image, text, Word, or spreadsheet.");
    }

    const normalized = clipText(normalizeWhitespace(text));

    const isLightweightSource = isImageDocument(fileName, fileType) || isPdfDocument(fileName, fileType);

    if (!(isReadableContent(normalized) || (isLightweightSource && isLightweightReadableContent(normalized)))) {
      return unreadable(
        "This file was unreadable or did not contain enough extractable information. Reupload another copy."
      );
    }

    return {
      text: normalized,
      readable: true
    };
  } catch (error) {
    return unreadable(
      (error as Error).message ||
        "This file could not be read clearly enough. Reupload another copy."
    );
  }
}

export async function extractBufferContent({
  buffer,
  fileName,
  fileType
}: {
  buffer: Buffer;
  fileName: string;
  fileType?: string;
}): Promise<ExtractionResult> {
  if (!buffer || !buffer.length) {
    return unreadable("This file is empty. Reupload another copy.");
  }

  return extractFromBuffer({
    buffer,
    fileName: fileName || "upload",
    fileType
  });
}

export async function extractDocumentContent(file: File): Promise<ExtractionResult> {
  if (!file || typeof file.arrayBuffer !== "function") {
    return unreadable("This upload could not be processed. Reupload another copy.");
  }

  if (file.size <= 0) {
    return unreadable("This file is empty. Reupload another copy.");
  }

  const fileName = file.name || "upload";
  const fileType = file.type || "";
  const buffer = Buffer.from(await file.arrayBuffer());
  return extractFromBuffer({ buffer, fileName, fileType });
}
