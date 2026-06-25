"use client";

import React, { useEffect, useId, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const superscriptMap: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  n: "ⁿ",
  i: "ⁱ"
};

function normalizeStudyContent(content: string) {
  const normalized = content.replace(/^Local fallback response\s*/i, "").trim();

  if (!normalized || normalized === "[object Object]" || normalized === "{}") {
    return "Something went wrong generating that reply. Please try again.";
  }

  return normalized;
}

function toUnicodeSuperscript(value: string) {
  const clean = value.replace(/^\{|\}$/g, "").replace(/^\(|\)$/g, "");
  return clean
    .split("")
    .map((character) => superscriptMap[character] ?? character)
    .join("");
}

function renderMathAwareText(children: React.ReactNode) {
  return React.Children.map(children, (child) => {
    if (typeof child !== "string") return child;
    const parts: React.ReactNode[] = [];
    const pattern = /(\$[^$]+\$)|([A-Za-z0-9)\]}]+)\^(\{[^}]+\}|\([^)]+\)|[-+]?\d+|[A-Za-z])/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(child))) {
      if (match.index > lastIndex) {
        parts.push(child.slice(lastIndex, match.index));
      }

      if (match[1]) {
        parts.push(
          <span key={`${match.index}-formula`} className="rounded-lg bg-white/10 px-1.5 py-0.5 font-mono text-[0.95em] text-[var(--accent-mint)]">
            {match[1].slice(1, -1)}
          </span>
        );
      } else {
        parts.push(match[2]);
        parts.push(
          <sup key={`${match.index}-sup`} className="font-mono text-[0.75em] leading-none">
            {toUnicodeSuperscript(match[3])}
          </sup>
        );
      }

      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < child.length) {
      parts.push(child.slice(lastIndex));
    }

    return parts.length ? parts : child;
  });
}

function MermaidBlock({ chart }: { chart: string }) {
  const chartId = useId().replace(/:/g, "-");
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let ignore = false;

    const renderChart = async () => {
      try {
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;
        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.dataset.theme === "light" ? "default" : "dark",
          securityLevel: "loose"
        });
        const { svg } = await mermaid.render(`mermaid-${chartId}`, chart);
        if (!ignore) {
          setSvg(svg);
          setFailed(false);
        }
      } catch {
        if (!ignore) {
          setFailed(true);
        }
      }
    };

    void renderChart();

    return () => {
      ignore = true;
    };
  }, [chart, chartId]);

  if (failed) {
    return (
      <pre className="overflow-x-auto rounded-[20px] bg-black/20 p-4 text-sm leading-7">
        <code>{chart}</code>
      </pre>
    );
  }

  if (!svg) {
    return <div className="rounded-[20px] bg-black/10 px-4 py-6 text-sm">Rendering diagram...</div>;
  }

  return (
    <div
      className="overflow-x-auto rounded-[20px] bg-black/10 p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function RichStudyText({
  content,
  compact = false
}: {
  content: string;
  compact?: boolean;
}) {
  const normalized = useMemo(() => normalizeStudyContent(content), [content]);
  const markdownComponents = useMemo<Components>(
    () => ({
      a: (props) => (
        <a {...props} target="_blank" rel="noreferrer" className="text-[var(--accent-sky)] underline underline-offset-4" />
      ),
      code: ({ className, children, ...props }) => {
        const codeText = String(children).replace(/\n$/, "");
        const inline = !className;
        if (inline) {
          return (
            <code {...props} className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[0.95em] text-[var(--accent-gold)]">
              {children}
            </code>
          );
        }

        if ((className || "").includes("language-mermaid")) {
          return <MermaidBlock chart={codeText} />;
        }

        return (
          <div className="my-4 overflow-hidden rounded-[22px] border border-white/10 bg-[#111827] shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/6 px-4 py-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent-sky)]">
                Code
              </span>
              <span className="rounded-full bg-[rgba(255,178,105,0.16)] px-2 py-1 text-[10px] font-semibold text-[var(--accent-gold)]">
                AI Code Output May Make Mistakes.
              </span>
            </div>
            <pre className="overflow-x-auto p-4 text-sm leading-7 text-slate-100">
              <code {...props} className={`${className || ""} font-mono`}>
                {children}
              </code>
            </pre>
          </div>
        );
      },
      p: ({ children, ...props }) => <p {...props}>{renderMathAwareText(children)}</p>,
      li: ({ children, ...props }) => <li {...props}>{renderMathAwareText(children)}</li>,
      td: ({ children, ...props }) => <td {...props}>{renderMathAwareText(children)}</td>,
      th: ({ children, ...props }) => <th {...props}>{renderMathAwareText(children)}</th>
    }),
    []
  );

  return (
    <div
      className={`rich-study-text ${compact ? "text-sm leading-7" : "text-[16px] leading-8 md:text-[17px] md:leading-9"} [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_hr]:my-5 [&_hr]:border-white/10 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_p]:my-3 [&_pre]:my-4 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:border [&_th]:border-white/10 [&_th]:bg-white/8 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
