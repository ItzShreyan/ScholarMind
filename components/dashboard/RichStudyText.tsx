"use client";

import React, { memo, useEffect, useId, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const latexCommandPattern =
  /\\(?:text|frac|sqrt|cos|sin|tan|log|ln|theta|alpha|beta|gamma|delta|pi|sigma|phi|omega|times|cdot|pm|leq|geq|neq|infty|sum|int|vec|hat|bar|left|right|mathrm|mathbf|overline|underline|approx|propto|partial|nabla|mu|lambda|rho|epsilon|degree)/i;

function normalizeStudyContent(content: string) {
  const normalized = content.replace(/^Local fallback response\s*/i, "").trim();

  if (!normalized || normalized === "[object Object]" || normalized === "{}") {
    return "Something went wrong generating that reply. Please try again.";
  }

  return normalized;
}

function prepareMathContent(content: string) {
  let prepared = content;

  prepared = prepared.replace(/\\\(([\\s\\S]+?)\\\)/g, (_, math) => `$${math.trim()}$`);
  prepared = prepared.replace(/\\\[([\\s\\S]+?)\\\]/g, (_, math) => `$$${math.trim()}$$`);

  prepared = prepared.replace(/\(([^()\n]{1,180})\)/g, (match, inner: string) => {
    if (inner.includes("$")) return match;
    if (!latexCommandPattern.test(inner) && !/[=^_\\]/.test(inner)) return match;
    return `$${inner.trim()}$`;
  });

  prepared = prepared.replace(/\[(\s*P\s*=\s*[^[\n]{1,80})\]/gi, (_, math) => `$$${math.trim()}$$`);

  return prepared;
}

const MermaidBlock = memo(function MermaidBlock({ chart }: { chart: string }) {
  const chartId = useId().replace(/:/g, "-");
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let ignore = false;

    const renderChart = async () => {
      try {
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;
        
        // Ensure robust initialization
        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.classList.contains("light") ? "default" : "dark",
          securityLevel: "loose",
          suppressErrorRendering: true
        });

        // Mermaid may sometimes throw during render
        const { svg } = await mermaid.render(`mermaid-${chartId}`, chart);
        
        if (!ignore) {
          setSvg(svg);
          setFailed(false);
        }
      } catch (err) {
        // Clean up orphaned error nodes that mermaid might have appended to the body
        const errorNode = document.getElementById(`dmermaid-${chartId}`);
        if (errorNode) {
          errorNode.remove();
        }
        
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
      <div className="my-4 overflow-hidden rounded-[22px] border border-white/10 bg-black/20 shadow-sm">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Diagram (Syntax Error)
          </span>
        </div>
        <pre className="overflow-x-auto p-4 text-sm leading-7 text-slate-300">
          <code className="font-mono">{chart}</code>
        </pre>
      </div>
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
});

export const RichStudyText = memo(function RichStudyText({
  content,
  compact = false
}: {
  content: string;
  compact?: boolean;
}) {
  const normalized = useMemo(() => prepareMathContent(normalizeStudyContent(content)), [content]);
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
      blockquote: (props: React.ComponentPropsWithoutRef<"blockquote"> & { node?: unknown }) => {
        // Extract text to check for callout types
        const children = props.children as React.ReactNode | undefined;
        let text = "";
        const extractText = (child: unknown): string => {
          if (typeof child === "string") return child;
          if (Array.isArray(child)) return child.map(extractText).join("");
          if (typeof child === "object" && child !== null) {
            const maybe = child as { props?: { children?: unknown } };
            if (maybe.props && maybe.props.children) return extractText(maybe.props.children);
          }
          return "";
        };
        text = extractText(children);
        
        const match = text.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
        if (match) {
          const type = match[1].toUpperCase();
          const colors: Record<string, string> = {
            NOTE: "border-l-blue-500 bg-blue-500/10 text-blue-100",
            TIP: "border-l-green-500 bg-green-500/10 text-green-100",
            IMPORTANT: "border-l-purple-500 bg-purple-500/10 text-purple-100",
            WARNING: "border-l-yellow-500 bg-yellow-500/10 text-yellow-100",
            CAUTION: "border-l-red-500 bg-red-500/10 text-red-100"
          };
          const colorClass = colors[type] || colors.NOTE;
          
          return (
            <blockquote {...props} className={`my-4 overflow-hidden rounded-[18px] border border-white/5 border-l-4 px-5 py-3 ${colorClass}`}>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider opacity-80">{type}</div>
              <div className="[&>p:first-child]:inline">{children}</div>
            </blockquote>
          );
        }

        return (
          <blockquote {...props} className="my-4 overflow-hidden rounded-[18px] border border-white/5 border-l-4 border-l-white/20 bg-white/5 px-5 py-3 italic text-white/80">
            {children}
          </blockquote>
        );
      }
    }),
    []
  );

  return (
    <div
      className={`rich-study-text ${compact ? "text-sm leading-7" : "text-[16px] leading-8 md:text-[17px] md:leading-9"} [&_.katex]:text-[1.05em] [&_.katex-display]:my-4 [&_.katex-display]:overflow-x-auto [&_.katex-display]:rounded-[18px] [&_.katex-display]:bg-white/8 [&_.katex-display]:px-4 [&_.katex-display]:py-3 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_hr]:my-5 [&_hr]:border-white/10 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_p]:my-3 [&_pre]:my-4 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:border [&_th]:border-white/10 [&_th]:bg-white/8 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
});
