"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { LoaderCircle, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { WorkBook, WorkSheet } from "xlsx";
import * as XLSX from "xlsx";

export type PreviewKind = "pdf" | "image" | "table" | "word" | "audio" | "text" | "presentation";

interface FileViewerProps {
  url?: string | null;
  fileName?: string;
  previewKind: PreviewKind;
  text?: string;
  html?: string;
}

/**
 * Single preview component for all supported format families.
 */
export function FileViewer({ url, fileName, previewKind, text, html }: FileViewerProps) {
  let viewer: ReactNode;
  switch (previewKind) {
    case "pdf":
      viewer = <PdfRenderer url={url ?? ""} fileName={fileName} />;
      break;
    case "image":
      viewer = <ImageRenderer url={url ?? ""} fileName={fileName} />;
      break;
    case "table":
      viewer = <SpreadsheetRenderer url={url ?? ""} fileName={fileName} text={text ?? ""} />;
      break;
    case "word":
      viewer = <DocxRenderer html={html ?? ""} text={text ?? ""} fileName={fileName} />;
      break;
    case "audio":
      viewer = <AudioRenderer url={url ?? ""} fileName={fileName} text={text ?? ""} />;
      break;
    case "presentation":
      viewer = <PresentationRenderer text={text ?? ""} fileName={fileName} />;
      break;
    case "text":
    default:
      viewer = <TextPreview text={text ?? ""} fileName={fileName} />;
  }

  return <div className="studio-file-viewer min-w-0">{viewer}</div>;
}

/* ─── Image renderer with zoom controls ─── */

function ImageRenderer({ url, fileName }: { url: string; fileName?: string }) {
  const [scale, setScale] = useState(1);
  const zoomIn = useCallback(() => setScale((s) => Math.min(4, s + 0.25)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(0.25, s - 0.25)), []);

  return (
    <div className="flex flex-col rounded-[24px] border border-white/10 bg-black/10 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">File Viewer</p>
          {fileName ? <span className="truncate max-w-[160px] text-xs text-white/60">{fileName}</span> : null}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={zoomOut} disabled={scale <= 0.25} className="p-1.5 rounded-full bg-white/10 hover:bg-white/16 transition-colors disabled:opacity-40" title="Zoom out"><ZoomOut className="h-3.5 w-3.5 text-white/80" /></button>
          <span className="text-xs font-medium text-white/60 min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} disabled={scale >= 4} className="p-1.5 rounded-full bg-white/10 hover:bg-white/16 transition-colors disabled:opacity-40" title="Zoom in"><ZoomIn className="h-3.5 w-3.5 text-white/80" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-[rgba(0,0,0,0.12)] p-4 min-h-[60vh] grid place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={fileName || "Image preview"} className="object-contain transition-transform rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.18)]" style={{ transform: `scale(${scale})`, transformOrigin: "center center" }} />
      </div>
    </div>
  );
}

/* ─── Spreadsheet renderer: client-side xlsx parsing with sheet tabs ─── */

function SpreadsheetRenderer({ url, fileName, text }: { url: string; fileName?: string; text: string }) {
  const [workbook, setWorkbook] = useState<WorkBook | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    (async () => {
      try {
        // Try to fetch and parse the file from its signed URL
        if (url) {
          const response = await fetch(url);
          const buffer = await response.arrayBuffer();
          const wb = XLSX.read(buffer, { type: "array", cellText: true, cellDates: true });
          if (cancelled) return;
          setWorkbook(wb);
          setActiveSheet(0);
        }
      } catch (_err) {
        if (cancelled) return;
        // Fall back to the pre-extracted text
        setError("");
      } finally {
        if (cancelled) return;
        setLoading(false);
        forceUpdate((n) => n + 1);
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

  // Fall back to text preview if xlsx parsing fails or no url
  if (!loading && (!workbook || !workbook.SheetNames.length)) {
    return <TextPreview text={text} fileName={fileName} />;
  }

  const sheetNames = workbook?.SheetNames ?? [];
  const currentSheetName = sheetNames[activeSheet] ?? "";
  const currentSheet: WorkSheet | undefined = workbook?.Sheets[currentSheetName];

  // Parse rows using sheet_to_json
  let rows: Array<Array<string | number | boolean>> = [];
  if (currentSheet && workbook) {
    try {
      rows = XLSX.utils.sheet_to_json(currentSheet, { header: 1, blankrows: false, raw: false, defval: "" }) as Array<Array<string | number | boolean>>;
    } catch {
      rows = [];
    }
  }

  return (
    <div className="flex flex-col rounded-[24px] border border-white/10 bg-black/10 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">File Viewer</p>
          {fileName ? <span className="truncate max-w-[160px] text-xs text-white/60">{fileName}</span> : null}
        </div>
      </div>

      {/* Sheet tabs */}
      {sheetNames.length > 1 ? (
        <div className="flex gap-1 overflow-x-auto border-b border-white/10 bg-white/6 px-3 pt-2">
          {sheetNames.map((name, i) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveSheet(i)}
              className={`rounded-t-[12px] px-3 py-1.5 text-xs font-medium transition ${
                i === activeSheet
                  ? "bg-white/16 text-[var(--fg)]"
                  : "bg-white/6 text-white/50 hover:bg-white/10"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}

      {/* Table */}
      <div className="flex-1 overflow-auto bg-[rgba(0,0,0,0.12)] p-4 min-h-[60vh]">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-sm text-white/60 py-12">
            <LoaderCircle className="h-5 w-5 animate-spin text-[var(--accent-sky)]" />
            Loading spreadsheet...
          </div>
        ) : error ? (
          <div className="text-sm text-[var(--accent-coral)] py-8 text-center">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-white/60 py-8 text-center">No data found in this sheet.</div>
        ) : (
          <table className="min-w-full text-left text-xs border-collapse">
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? "border-b border-white/20 bg-white/8" : "border-b border-white/6 hover:bg-white/4"}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 align-top whitespace-nowrap max-w-[300px] truncate" title={String(cell)}>
                      {cell == null || cell === "" ? <span className="text-white/20">—</span> : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─── Presentation renderer: per-slide text cards ─── */

function AudioRenderer({ url, fileName, text }: { url: string; fileName?: string; text: string }) {
  return (
    <div className="flex flex-col rounded-[24px] border border-white/10 bg-black/10 overflow-hidden min-h-[60vh]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">File Viewer</p>
          {fileName ? <span className="truncate max-w-[160px] text-xs text-white/60">{fileName}</span> : null}
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-[rgba(0,0,0,0.12)] p-4">
        {url ? (
          <div className="rounded-[20px] border border-white/10 bg-white/8 p-4">
            <audio controls className="w-full" src={url} />
          </div>
        ) : null}
        {text ? (
          <div className="mt-4 rounded-[20px] border border-white/10 bg-white/8 p-4 text-sm text-white/70">
            {text}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PresentationRenderer({ text, fileName }: { text: string; fileName?: string }) {
  // Split the extracted text by "Slide N" markers (the parser prepends "Slide 1\n", "Slide 2\n" etc.)
  const slides = text
    .split(/\n(?=Slide \d+)/)
    .filter(Boolean)
    .slice(0, 80);

  const [activeSlide, setActiveSlide] = useState(0);

  if (!slides.length) {
    return (
      <div className="flex flex-col rounded-[24px] border border-white/10 bg-black/10 overflow-hidden min-h-[60vh] items-center justify-center p-4">
        <p className="text-sm text-white/60">No slide content available for this presentation.</p>
      </div>
    );
  }

  const currentSlide = slides[activeSlide] || "";
  const slideLines = currentSlide.split("\n").filter(Boolean);
  const slideTitle = slideLines[0] || "";
  const slideBody = slideLines.slice(1).join("\n");

  return (
    <div className="flex flex-col rounded-[24px] border border-white/10 bg-black/10 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">File Viewer</p>
          {fileName ? <span className="truncate max-w-[160px] text-xs text-white/60">{fileName}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSlide((s) => Math.max(0, s - 1))}
            disabled={activeSlide <= 0}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/16 transition-colors disabled:opacity-40"
            title="Previous slide"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-white/80" />
          </button>
          <span className="text-xs font-medium text-white/60 min-w-[4rem] text-center">
            {activeSlide + 1} / {slides.length}
          </span>
          <button
            onClick={() => setActiveSlide((s) => Math.min(slides.length - 1, s + 1))}
            disabled={activeSlide >= slides.length - 1}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/16 transition-colors disabled:opacity-40"
            title="Next slide"
          >
            <ChevronRight className="h-3.5 w-3.5 text-white/80" />
          </button>
        </div>
      </div>

      {/* Slide card */}
      <div className="flex-1 overflow-auto bg-[rgba(0,0,0,0.12)] p-6 min-h-[60vh]">
        <div className="mx-auto max-w-3xl rounded-[20px] border border-white/12 bg-gradient-to-br from-white/10 to-white/5 p-8 shadow-[0_16px_48px_rgba(0,0,0,0.24)]">
          {/* Slide number badge */}
          <div className="mb-4 inline-block rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
            Text-based preview — not a pixel-exact render
          </div>

          {/* Title */}
          {slideTitle ? (
            <h3 className="text-xl font-bold text-white/90 mb-4 leading-snug">
              {slideTitle.replace(/^Slide \d+\s*/i, "")}
            </h3>
          ) : null}

          {/* Body */}
          {slideBody ? (
            <div className="space-y-3">
              {slideBody.split("\n").map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-2" />;
                // Detect bullet points
                if (/^[•\-*]\s/.test(trimmed)) {
                  return (
                    <div key={i} className="flex items-start gap-2 text-sm leading-7 text-white/70">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-sky)]" />
                      <span>{trimmed.replace(/^[•\-*]\s*/, "")}</span>
                    </div>
                  );
                }
                return <p key={i} className="text-sm leading-7 text-white/70">{trimmed}</p>;
              })}
            </div>
          ) : (
            <p className="text-sm text-white/40 italic">This slide contains images or elements that could not be extracted as text.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Word document renderer: styled HTML from mammoth ─── */

function DocxRenderer({ html, text, fileName }: { html: string; text: string; fileName?: string }) {
  // If we have mammoth-generated HTML, render it with app-typography styling
  if (html) {
    return (
      <div className="flex flex-col rounded-[24px] border border-white/10 bg-black/10 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/8 px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">File Viewer</p>
            {fileName ? <span className="truncate max-w-[160px] text-xs text-white/60">{fileName}</span> : null}
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-[rgba(0,0,0,0.12)] p-4 min-h-[60vh] prose prose-invert prose-sm max-w-none">
          <div
            className="docx-preview"
            dangerouslySetInnerHTML={{ __html: html }}
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.88)"
            }}
          />
        </div>
      </div>
    );
  }

  // Fall back to plain text
  return <TextPreview text={text} fileName={fileName} />;
}

/* ─── PDF renderer: continuous scroll with IntersectionObserver ─── */

function PdfRenderer({ url, fileName }: { url: string; fileName?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1);
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const canvasesRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pageRendersInFlight = useRef<Set<number>>(new Set());
  const numPagesRef = useRef(0);
  const [, forceRender] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setPdfDoc(null);
    setScale(1);
    renderedPagesRef.current.clear();
    canvasesRef.current.clear();
    pageRendersInFlight.current.clear();

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const doc = await pdfjs.getDocument(url).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        numPagesRef.current = doc.numPages;
        setLoading(false);
      } catch (_err) {
        if (cancelled) return;
        setError(_err instanceof Error ? _err.message : "Failed to load PDF");
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

  const renderPageContent = useCallback(async (doc: PDFDocumentProxy, pageNumber: number, currentScale: number) => {
    if (pageRendersInFlight.current.has(pageNumber)) return;
    pageRendersInFlight.current.add(pageNumber);

    try {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: currentScale });
      const canvas = canvasesRef.current.get(pageNumber);
      if (!canvas) { pageRendersInFlight.current.delete(pageNumber); return; }

      const currentWidth = parseInt(canvas.getAttribute("data-width") || "0", 10);
      if (currentWidth === viewport.width && renderedPagesRef.current.has(pageNumber)) {
        pageRendersInFlight.current.delete(pageNumber);
        return;
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.setAttribute("data-width", String(viewport.width));

      await page.render({ canvas, viewport }).promise;
      renderedPagesRef.current.add(pageNumber);
    } catch {
      // skip
    } finally {
      pageRendersInFlight.current.delete(pageNumber);
    }
  }, []);

  useEffect(() => {
    if (!pdfDoc || loading) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = parseInt((entry.target as HTMLElement).getAttribute("data-page-number") || "0", 10);
            if (pageNum > 0) renderPageContent(pdfDoc, pageNum, scale);
          }
        }
      },
      { rootMargin: "300px 0px" }
    );

    const pageElements = container.querySelectorAll<HTMLElement>("[data-page-number]");
    pageElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pdfDoc, scale, loading, renderPageContent]);

  const setCanvasRef = useCallback((pageNumber: number, el: HTMLCanvasElement | null) => {
    if (el) canvasesRef.current.set(pageNumber, el);
    else canvasesRef.current.delete(pageNumber);
  }, []);

  const zoomIn = useCallback(() => setScale((s) => Math.min(3, s + 0.25)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(0.5, s - 0.25)), []);
  const numPages = pdfDoc?.numPages ?? 0;

  return (
    <div className="flex flex-col rounded-[24px] border border-white/10 bg-black/10 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">File Viewer</p>
          {fileName ? <span className="truncate max-w-[160px] text-xs text-white/60">{fileName}</span> : null}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={zoomOut} disabled={scale <= 0.5 || loading} className="p-1.5 rounded-full bg-white/10 hover:bg-white/16 transition-colors disabled:opacity-40" title="Zoom out"><ZoomOut className="h-3.5 w-3.5 text-white/80" /></button>
          <span className="text-xs font-medium text-white/60 min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} disabled={scale >= 3 || loading} className="p-1.5 rounded-full bg-white/10 hover:bg-white/16 transition-colors disabled:opacity-40" title="Zoom in"><ZoomIn className="h-3.5 w-3.5 text-white/80" /></button>
          <span className="w-px h-5 bg-white/10 mx-1" />
          <span className="text-xs font-medium text-white/60">{numPages} page{numPages !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto bg-[rgba(0,0,0,0.12)] p-4 min-h-[60vh]">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-sm text-white/60 py-12"><LoaderCircle className="h-5 w-5 animate-spin text-[var(--accent-sky)]" />Loading PDF...</div>
        ) : error ? (
          <div className="text-sm text-[var(--accent-coral)] py-8 text-center">PDF error: {error}</div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <div key={pageNum} data-page-number={pageNum} className="flex flex-col items-center">
                <canvas ref={(el) => setCanvasRef(pageNum, el)} className="rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.18)] max-w-full" style={{ width: scale >= 1 ? `${Math.round(100 / scale)}%` : "100%" }} />
                <span className="mt-1 text-[10px] text-white/40">{pageNum} / {numPages}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Plain text / markup preview ─── */

function TextPreview({ text, fileName }: { text: string; fileName?: string }) {
  // Detect code-like formats for monospace display
  const codeFormat = fileName
    ? /\.(json|yaml|yml|xml|html|htm|js|ts|jsx|tsx|css|scss|py|rb|sh|bash|zsh|sql|md)$/i.test(fileName)
    : false;

  // Attempt to pretty-print JSON
  let displayText = text || "Preview text is not available for this source.";
  if (fileName && /\.json$/i.test(fileName) && displayText) {
    try {
      displayText = JSON.stringify(JSON.parse(displayText), null, 2);
    } catch {
      // leave as-is
    }
  }

  return (
    <div className="flex flex-col rounded-[24px] border border-white/10 bg-black/10 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">File Viewer</p>
          {fileName ? <span className="truncate max-w-[160px] text-xs text-white/60">{fileName}</span> : null}
          {codeFormat ? (
            <span className="rounded-full bg-[rgba(57,208,255,0.14)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--accent-sky)]">
              Code
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-[rgba(0,0,0,0.12)] p-4 min-h-[60vh]">
        <pre
          className={`whitespace-pre-wrap rounded-[24px] p-5 text-sm leading-7 ${
            codeFormat ? "bg-black/30 font-mono text-[13px] leading-6" : "bg-white/10"
          }`}
          style={codeFormat ? { tabSize: 2 } : undefined}
        >
          {displayText}
        </pre>
      </div>
    </div>
  );
}
