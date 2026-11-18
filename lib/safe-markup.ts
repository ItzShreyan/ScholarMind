/**
 * Safe markup helpers.
 *
 * Two places in ScholarMind end up putting non-text markup into the page:
 * rendered Mermaid diagrams (SVG) and links produced by a language model. Both
 * are written by something we do not control, so both are filtered here rather
 * than trusted at the call site.
 *
 * These are deliberately narrow, allow-list-based checks — the goal is only to
 * remove active content, not to reimplement a sanitiser. Mermaid itself is
 * configured with `securityLevel: "strict"`, so this is defence in depth.
 */

/** Elements that can execute, navigate, or embed remote content. */
const FORBIDDEN_ELEMENTS = [
  "script",
  "iframe",
  "object",
  "embed",
  "audio",
  "video",
  "form",
  "input",
  "button",
  "base",
  "link",
  "meta"
];

/** URL schemes a study answer has any business linking to. */
const SAFE_SCHEMES = new Set(["http:", "https:", "mailto:"]);

/**
 * Is this href safe to render as a link?
 *
 * Relative paths are allowed (they cannot leave the origin), protocols must be
 * http/https/mailto, and anything with control characters — the classic way to
 * smuggle `java\nscript:` past a naive prefix check — is rejected.
 */
export function isSafeHref(href: string | undefined): boolean {
  if (!href) return false;

  const value = href.trim();
  if (!value) return false;

  // Control characters and whitespace inside the scheme are always suspicious.
  if (/[\u0000-\u001f\u007f]/.test(value)) return false;

  // Relative or same-page links are fine.
  if (/^[#/?]/.test(value)) return true;

  // Scheme-less path/blob-free references such as "notes/unit-4.pdf".
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return !value.startsWith("//");
  }

  try {
    const url = new URL(value);
    return SAFE_SCHEMES.has(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Remove active content from a Mermaid-generated SVG string.
 *
 * Done with the DOM rather than regexes so nesting is handled correctly: a
 * `<script>` inside a `<foreignObject>` is removed along with everything that
 * could execute. Mermaid's own HTML labels survive because `foreignObject`
 * itself is kept and only its dangerous descendants are stripped.
 */
export function sanitizeSvg(svg: string): string {
  if (!svg) return "";

  // Server-side this component is not rendered, but never guess at a string.
  if (typeof document === "undefined" || typeof DOMParser === "undefined") return "";

  const parser = new DOMParser();
  const parsed = parser.parseFromString(svg, "image/svg+xml");

  if (parsed.querySelector("parsererror")) return "";

  for (const tag of FORBIDDEN_ELEMENTS) {
    parsed.querySelectorAll(tag).forEach((node) => node.remove());
  }

  const URL_ATTRIBUTES = new Set(["href", "xlink:href", "src", "action", "formaction"]);
  const UNSAFE_IN_STYLE = /(javascript:|vbscript:|expression\s*\(|data:text\/html)/i;

  parsed.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;

      // Inline event handlers, whatever they are called.
      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
        continue;
      }

      // A link or embed that navigates somewhere we do not allow. In-page
      // fragment references (`#node-3`) are how Mermaid labels connect, so
      // those are kept.
      if (URL_ATTRIBUTES.has(name)) {
        const isFragment = value.startsWith("#");
        if (!isFragment && !isSafeHref(value)) {
          element.removeAttribute(attribute.name);
        }
        continue;
      }

      // CSS can execute or exfiltrate too.
      if (name === "style" && UNSAFE_IN_STYLE.test(value)) {
        element.removeAttribute(attribute.name);
      }
    }
  });

  return parsed.documentElement.outerHTML;
}

/**
 * Language label for a fenced code block, in the form a reader recognises.
 *
 * Returns the pretty name and whether the block is actually a diagram fence we
 * should not label as "code".
 */
const LANGUAGE_LABELS: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  typescript: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  javascript: "JavaScript",
  py: "Python",
  python: "Python",
  rb: "Ruby",
  ruby: "Ruby",
  java: "Java",
  c: "C",
  cpp: "C++",
  "c++": "C++",
  cs: "C#",
  csharp: "C#",
  go: "Go",
  rs: "Rust",
  rust: "Rust",
  php: "PHP",
  sql: "SQL",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  shell: "Shell",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  tex: "LaTeX",
  latex: "LaTeX",
  md: "Markdown",
  markdown: "Markdown",
  txt: "Text",
  text: "Text"
};

export function codeLanguageLabel(className: string | undefined): string {
  const match = /language-([\w+#-]+)/.exec(className ?? "");
  const raw = match?.[1]?.toLowerCase();
  if (!raw) return "Code";
  return LANGUAGE_LABELS[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
}
