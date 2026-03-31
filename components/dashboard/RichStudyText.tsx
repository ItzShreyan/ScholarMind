"use client";

import { useEffect, useId, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

function normalizeStudyContent(content: string) {
  return content.replace(/^Local fallback response\s*/i, "").trim();
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
            <code {...props} className="rounded bg-black/20 px-1.5 py-0.5 text-[0.95em]">
              {children}
            </code>
          );
        }

        if ((className || "").includes("language-mermaid")) {
          return <MermaidBlock chart={codeText} />;
        }

        return (
          <pre className="overflow-x-auto rounded-[20px] bg-black/20 p-4 text-sm leading-7">
            <code {...props} className={className}>
              {children}
            </code>
          </pre>
        );
      }
    }),
    []
  );

  return (
    <div
      className={`rich-study-text ${compact ? "text-sm leading-7" : "text-[15px] leading-8 md:text-[16px]"} [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_hr]:my-5 [&_hr]:border-white/10 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_p]:my-3 [&_pre]:my-4 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:border [&_th]:border-white/10 [&_th]:bg-white/8 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
