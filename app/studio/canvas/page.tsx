"use client";

import { useEffect, useMemo, useState } from "react";
import { Highlighter, Maximize2, MousePointer2, PenLine, SendHorizonal, StickyNote, Type, X } from "lucide-react";
import { AINotesConsole } from "@/components/dashboard/AINotesConsole";
import { RichStudyText } from "@/components/dashboard/RichStudyText";
import { Button } from "@/components/ui/Button";

type CanvasPayload = {
  title: string;
  studio?: string;
  kind: "text" | "markdown" | "pdf" | "image" | "notes";
  content?: string;
  url?: string | null;
  sourceId?: string;
  savedAt?: number;
};

type Annotation = {
  id: string;
  text: string;
  selectedText: string;
  createdAt: number;
};

function getCanvasId() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("canvas") || "";
}

export default function StudioCanvasPage() {
  const [payload, setPayload] = useState<CanvasPayload | null>(null);
  const [tool, setTool] = useState<"select" | "text" | "pen" | "highlight">("select");
  const [selectedText, setSelectedText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const canvasId = useMemo(getCanvasId, []);

  useEffect(() => {
    if (!canvasId) return;
    const raw = sessionStorage.getItem(`scholarmind_canvas_${canvasId}`);
    if (!raw) return;
    try {
      setPayload(JSON.parse(raw) as CanvasPayload);
      const savedAnnotations = sessionStorage.getItem(`scholarmind_canvas_annotations_${canvasId}`);
      if (savedAnnotations) {
        setAnnotations(JSON.parse(savedAnnotations) as Annotation[]);
      }
    } catch {
      setPayload(null);
    }
  }, [canvasId]);

  useEffect(() => {
    if (!canvasId) return;
    sessionStorage.setItem(`scholarmind_canvas_annotations_${canvasId}`, JSON.stringify(annotations));
  }, [annotations, canvasId]);

  const captureSelection = () => {
    const text = window.getSelection()?.toString().trim() || "";
    if (text) setSelectedText(text.slice(0, 1200));
  };

  const addAnnotation = () => {
    const body = noteText.trim();
    if (!body && !selectedText) return;
    setAnnotations((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: body || "Marked for review",
        selectedText,
        createdAt: Date.now()
      },
      ...current
    ]);
    setNoteText("");
  };

  const askPrompt = [
    payload?.title ? `I am viewing "${payload.title}" in ScholarMind canvas mode.` : "",
    selectedText ? `Selected text: ${selectedText}` : "",
    annotations.length
      ? `My annotations: ${annotations
          .slice(0, 5)
          .map((item) => `${item.selectedText ? `"${item.selectedText}" -> ` : ""}${item.text}`)
          .join(" | ")}`
      : "",
    "Please explain this clearly and help me revise it."
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <main className="min-h-screen bg-[var(--bg)] px-3 py-3 text-[var(--fg)]">
      <section className="panel panel-border mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1800px] flex-col overflow-hidden rounded-[28px]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-coral)]">
              Canvas mode
            </p>
            <h1 className="truncate text-xl font-semibold md:text-2xl">{payload?.title || "Studio canvas"}</h1>
            <p className="muted mt-1 text-xs">{payload?.studio || "ScholarMind Studio"} • select, annotate, then ask the tutor</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "select", label: "Select", icon: MousePointer2 },
              { key: "text", label: "Text", icon: Type },
              { key: "pen", label: "Pen", icon: PenLine },
              { key: "highlight", label: "Highlight", icon: Highlighter }
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTool(item.key as typeof tool)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition ${
                  tool === item.key ? "bg-[var(--fg)] text-[var(--bg)]" : "bg-white/10 text-[var(--muted)] hover:text-[var(--fg)]"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
            <button type="button" onClick={() => window.close()} className="rounded-full bg-white/10 p-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="grid flex-1 overflow-hidden lg:grid-cols-[1fr_24rem]">
          <div onMouseUp={captureSelection} className="hide-scrollbar overflow-auto p-4 md:p-6">
            {!payload ? (
              <div className="grid min-h-[60vh] place-items-center rounded-[28px] bg-white/8 p-8 text-center">
                <div>
                  <Maximize2 className="mx-auto h-8 w-8 text-[var(--accent-sky)]" />
                  <p className="mt-4 text-lg font-semibold">Canvas content was not found.</p>
                  <p className="muted mt-2 text-sm">Open canvas mode again from the Studio workspace.</p>
                </div>
              </div>
            ) : payload.kind === "pdf" && payload.url ? (
              <iframe src={payload.url} title={payload.title} className="h-[calc(100vh-8rem)] w-full rounded-[24px] border border-white/10 bg-white" />
            ) : payload.kind === "image" && payload.url ? (
              <div className="grid min-h-[70vh] place-items-center rounded-[24px] bg-black/20 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={payload.url} alt={payload.title} className="max-h-[calc(100vh-10rem)] rounded-[20px] object-contain" />
              </div>
            ) : payload.kind === "notes" ? (
              <AINotesConsole content={payload.content || ""} />
            ) : payload.kind === "markdown" ? (
              <article className="mx-auto max-w-4xl rounded-[28px] bg-white/8 p-6">
                <RichStudyText content={payload.content || ""} />
              </article>
            ) : (
              <pre className="mx-auto max-w-4xl whitespace-pre-wrap rounded-[28px] bg-white/8 p-6 text-sm leading-7">
                {payload.content || "No readable text available."}
              </pre>
            )}
          </div>

          <aside className="hide-scrollbar border-t border-white/10 bg-white/6 p-4 lg:overflow-auto lg:border-l lg:border-t-0">
            <div className="rounded-[24px] bg-white/10 p-4">
              <p className="text-sm font-semibold">Selection-aware notes</p>
              <p className="muted mt-2 text-xs">Select text on the canvas, then annotate it. The tutor prompt below includes your selection and notes.</p>
              <textarea
                value={selectedText}
                onChange={(event) => setSelectedText(event.target.value)}
                placeholder="Selected text appears here..."
                className="mt-3 min-h-[7rem] w-full rounded-[18px] border border-white/12 bg-black/10 px-3 py-3 text-xs outline-none focus:border-[var(--accent-sky)]"
              />
              <textarea
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                placeholder="Write an annotation or answer attempt..."
                className="mt-3 min-h-[6rem] w-full rounded-[18px] border border-white/12 bg-black/10 px-3 py-3 text-xs outline-none focus:border-[var(--accent-sky)]"
              />
              <Button onClick={addAnnotation} className="mt-3 w-full justify-center" size="sm">
                <StickyNote className="h-4 w-4" />
                Add annotation
              </Button>
            </div>

            <div className="mt-4 rounded-[24px] bg-white/10 p-4">
              <p className="text-sm font-semibold">Ask AI with canvas context</p>
              <p className="muted mt-2 text-xs">Copy this into the Studio tutor. It includes the selected text and your annotations.</p>
              <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-[18px] bg-black/20 p-3 text-xs leading-5">
                {askPrompt || "Select text or add an annotation first."}
              </pre>
              <Button
                onClick={() => navigator.clipboard?.writeText(askPrompt)}
                variant="secondary"
                className="mt-3 w-full justify-center"
                size="sm"
                disabled={!askPrompt}
              >
                <SendHorizonal className="h-4 w-4" />
                Copy tutor prompt
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {annotations.map((item) => (
                <div key={item.id} className="rounded-[20px] bg-white/8 p-3 text-xs">
                  {item.selectedText ? <p className="font-semibold">“{item.selectedText}”</p> : null}
                  <p className="muted mt-2 leading-5">{item.text}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
