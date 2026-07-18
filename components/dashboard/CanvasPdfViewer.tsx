"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface CanvasPdfViewerProps {
  url: string;
  fileName?: string;
}

export function CanvasPdfViewer({ url, fileName }: CanvasPdfViewerProps) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setPdfDoc(null);
    setNumPages(0);
    setPageNum(1);
    setScale(1);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const doc = await pdfjs.getDocument(url).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load PDF");
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

  const renderPage = useCallback(async (doc: PDFDocumentProxy, pageNumber: number, currentScale: number) => {
    try {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: currentScale });
      const canvas = document.getElementById("pdf-canvas") as HTMLCanvasElement | null;
      if (!canvas) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvas: canvas,
        viewport,
      }).promise;
    } catch {
      // Silently skip render errors on rapid zoom/page changes
    }
  }, []);

  useEffect(() => {
    if (!pdfDoc) return;
    renderPage(pdfDoc, pageNum, scale);
  }, [pdfDoc, pageNum, scale, renderPage]);

  const zoomIn = useCallback(() => setScale((s) => Math.min(3, s + 0.25)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(0.5, s - 0.25)), []);
  const prevPage = useCallback(() => setPageNum((p) => Math.max(1, p - 1)), []);
  const nextPage = useCallback(() => setPageNum((p) => Math.min(numPages, p + 1)), [numPages]);

  return (
    <div className="flex flex-col rounded-[24px] border border-white/10 bg-black/10 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">
            PDF Viewer
          </p>
          {fileName ? (
            <span className="truncate max-w-[160px] text-xs text-white/60">{fileName}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5 || loading}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/16 transition-colors disabled:opacity-40"
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5 text-white/80" />
          </button>
          <span className="text-xs font-medium text-white/60 min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 3 || loading}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/16 transition-colors disabled:opacity-40"
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5 text-white/80" />
          </button>
          <span className="w-px h-5 bg-white/10 mx-1" />
          <button
            onClick={prevPage}
            disabled={pageNum <= 1 || loading}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/16 transition-colors disabled:opacity-40"
            title="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-white/80" />
          </button>
          <span className="text-xs font-medium text-white/60 min-w-[4rem] text-center">
            {pageNum} / {numPages || "?"}
          </span>
          <button
            onClick={nextPage}
            disabled={pageNum >= numPages || loading}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/16 transition-colors disabled:opacity-40"
            title="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5 text-white/80" />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={canvasWrapperRef}
        className="flex-1 overflow-auto grid place-items-center bg-[rgba(0,0,0,0.12)] p-4 min-h-[60vh]"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-sm text-white/60">
            <LoaderCircle className="h-5 w-5 animate-spin text-[var(--accent-sky)]" />
            Loading PDF...
          </div>
        ) : error ? (
          <div className="text-sm text-[var(--accent-coral)]">PDF error: {error}</div>
        ) : (
          <canvas id="pdf-canvas" className="rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.18)] max-w-full" />
        )}
      </div>
    </div>
  );
}
