function normalizeWhitespace(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function recognizeImageBuffer(buffer: Buffer) {
  const tesseract = await import("tesseract.js");
  const recognize =
    tesseract.default && typeof tesseract.default.recognize === "function"
      ? tesseract.default.recognize.bind(tesseract.default)
      : (tesseract as { recognize?: (image: Buffer, language: string, options?: { logger?: () => void }) => Promise<{ data?: { text?: string } }> }).recognize;

  if (!recognize) {
    throw new Error("OCR is not available right now.");
  }

  const result = await recognize(buffer, "eng", {
    logger: () => undefined
  });

  return normalizeWhitespace(result?.data?.text || "");
}

export async function extractPdfDocumentByOcr(_buffer: Buffer, _pageLimit?: number) {
  // PDF OCR fallback requires a native canvas renderer (@napi-rs/canvas).
  // On serverless platforms this package is too large (50-80 MB native binary),
  // so the fallback is disabled. pdf-parse handles text extraction for normal PDFs.
  return "";
}
