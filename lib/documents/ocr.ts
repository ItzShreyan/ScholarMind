const maxPdfOcrPages = 6;

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
  const { createCanvas, loadImage } = await ensureCanvasGlobals();
  const tesseract = await import("tesseract.js");
  const recognize =
    tesseract.default && typeof tesseract.default.recognize === "function"
      ? tesseract.default.recognize.bind(tesseract.default)
      : (tesseract as { recognize?: (image: Buffer, language: string, options?: { logger?: () => void }) => Promise<{ data?: { text?: string } }> }).recognize;

  if (!recognize) {
    throw new Error("OCR is not available right now.");
  }

  let imageBuffer = buffer;

  try {
    const image = await loadImage(buffer);
    const targetWidth = Math.min(2200, Math.max(image.width, 1400));
    const scale = image.width > 0 ? Math.max(1, targetWidth / image.width) : 1;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const imageData = context.getImageData(0, 0, width, height);
    const { data } = imageData;
    for (let index = 0; index < data.length; index += 4) {
      const luminance = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
      const boosted = Math.max(0, Math.min(255, (luminance - 128) * 1.32 + 128));
      const normalized = boosted > 188 ? 255 : boosted < 72 ? 0 : boosted;
      data[index] = normalized;
      data[index + 1] = normalized;
      data[index + 2] = normalized;
    }
    context.putImageData(imageData, 0, 0);
    imageBuffer = canvas.toBuffer("image/png");
  } catch {
    imageBuffer = buffer;
  }

  const result = await recognize(imageBuffer, "eng", {
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
        const viewport = page.getViewport({ scale: 1.6 });
        const canvas = createCanvas(Math.max(1, Math.ceil(viewport.width)), Math.max(1, Math.ceil(viewport.height)));
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);

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
