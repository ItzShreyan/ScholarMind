"use client";

import { memo, useEffect, useId, useState } from "react";
import { AlertTriangle, Workflow } from "lucide-react";
import { sanitizeSvg } from "@/lib/safe-markup";

type Status = "loading" | "ready" | "failed";

/**
 * A Mermaid diagram from an answer.
 *
 * Three details matter:
 *   1. Mermaid is imported lazily, so a student who never meets a diagram never
 *      downloads it.
 *   2. The rendered SVG is run through `sanitizeSvg` before it is inserted.
 *      Mermaid runs with `securityLevel: "strict"`, but the model writes the
 *      source, so the output is filtered rather than trusted.
 *   3. A syntax error shows the source instead of an empty box — a broken
 *      diagram must still tell the student something.
 *
 * The theme is re-read when the document theme class changes, so a diagram
 * drawn in dark mode does not stay dark on an ivory surface.
 */
export const StudyMermaid = memo(function StudyMermaid({ chart }: { chart: string }) {
  const rawId = useId();
  const chartId = rawId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const [status, setStatus] = useState<Status>("loading");
  const [svg, setSvg] = useState("");
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsLight(root.classList.contains("light"));
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    const render = async () => {
      try {
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;

        mermaid.initialize({
          startOnLoad: false,
          theme: isLight ? "default" : "dark",
          securityLevel: "strict",
          suppressErrorRendering: true,
          fontFamily: "var(--font-body)"
        });

        const result = await mermaid.render(`mmd-${chartId}`, chart);
        const safe = sanitizeSvg(result.svg);

        if (cancelled) return;

        if (!safe) {
          setStatus("failed");
          return;
        }

        setSvg(safe);
        setStatus("ready");
      } catch {
        // Mermaid appends a temporary error node to <body> on failure.
        document.getElementById(`dmmd-${chartId}`)?.remove();
        if (!cancelled) setStatus("failed");
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [chart, chartId, isLight]);

  if (status === "failed") {
    return (
      <figure className="study-diagram study-diagram-fallback">
        <figcaption className="study-diagram-caption">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          Diagram could not be drawn
        </figcaption>
        <pre className="study-code-pre">
          <code>{chart}</code>
        </pre>
      </figure>
    );
  }

  if (status === "loading") {
    return (
      <figure className="study-diagram study-diagram-loading" aria-busy="true">
        <figcaption className="study-diagram-caption">
          <Workflow className="h-3.5 w-3.5" aria-hidden="true" />
          Drawing the diagram…
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="study-diagram">
      <div className="study-diagram-canvas" dangerouslySetInnerHTML={{ __html: svg }} />
    </figure>
  );
});
