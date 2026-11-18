/**
 * GitHub-style callouts → a fence this renderer owns.
 *
 *   > [!NOTE]
 *   > Mitochondria have their own DNA.
 *
 * becomes
 *
 *   ```callout-note
 *   Mitochondria have their own DNA.
 *   ```
 *
 * Fences carry the callout kind through the markdown parser with no raw HTML
 * and no rehype plugin. The body is left as markdown, so bold, lists, links and
 * equations inside a callout still render — the renderer re-parses the fence
 * contents with the same component set.
 *
 * A blockquote without a marker is left completely alone.
 */

const CALLOUT_KINDS = ["note", "tip", "important", "warning", "caution"] as const;
export type CalloutFenceKind = (typeof CALLOUT_KINDS)[number];

/** Matches a whole blockquote run whose first line is a `[!KIND]` marker. */
const CALLOUT_BLOCK =
  /^>[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*([^\n]*)\n?((?:>[^\n]*(?:\n|$))*)/gim;

/** `language-callout-note` → `"note"`, or null. */
export function readCalloutFenceLanguage(className: string | undefined): CalloutFenceKind | null {
  const match = /language-callout-([a-z]+)/i.exec(className ?? "");
  if (!match) return null;
  const kind = match[1].toLowerCase();
  return (CALLOUT_KINDS as readonly string[]).includes(kind) ? (kind as CalloutFenceKind) : null;
}

/** The `[!KIND]` marker as it should read in the UI. */
export function calloutKindToLabel(kind: CalloutFenceKind): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

export function extractCallouts(markdown: string): string {
  if (!markdown || !markdown.includes("[!")) return markdown;

  return markdown.replace(
    CALLOUT_BLOCK,
    (match, rawKind: string, trailing: string, body: string) => {
      const kind = rawKind.toLowerCase();

      const lines = (body || "")
        .split("\n")
        .map((line) => line.replace(/^>[ \t]?/, ""))
        .join("\n")
        .trimEnd();

      // The marker line can carry text after it (`> [!NOTE] see below`).
      const first = trailing.trim();
      const inner = [first, lines].filter((part) => part.length > 0).join("\n");

      // A fence cannot contain another fence, so an exotic body is left as the
      // original blockquote rather than being corrupted.
      if (inner.includes("```")) return match;

      return `\`\`\`callout-${kind}\n${inner}\n\`\`\`\n`;
    }
  );
}
