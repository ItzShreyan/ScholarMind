const maxPdfOcrPages = 4;

function normalizeWhitespace(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function ensureCanvasGlobals() {
  const canvasModule = await import("@napi-rs/canvas");
  const globals = globalThis as Record<string, unknown>;

  if (!globals.DOMMatrix) globals.DOMMatrix = canvasModule.DOMMatrix;
  if (!globals.ImageData) globals.ImageData = canvasModule.ImageData;
  if (!globals.Path2D) globals.Path2D = canvasModule.Path2D;

  return canvasModule;
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

export async function extractPdfDocumentByOcr(buffer: Buffer, pageLimit = maxPdfOcrPages) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = await ensureCanvasGlobals();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true
  });
  const pdf = await loadingTask.promise;

  try {
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, pageLimit); pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);

      try {
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = createCanvas(Math.max(1, Math.ceil(viewport.width)), Math.max(1, Math.ceil(viewport.height)));
        const context = canvas.getContext("2d");

        await page.render({
          canvas: canvas as never,
          canvasContext: context as never,
          viewport
        }).promise;

        const text = await recognizeImageBuffer(canvas.toBuffer("image/png"));
        if (text) {
          pages.push(`Page ${pageNumber}\n${text}`);
        }
      } finally {
        page.cleanup();
      }
    }

    return normalizeWhitespace(pages.join("\n\n"));
  } finally {
    await loadingTask.destroy();
  }
}
