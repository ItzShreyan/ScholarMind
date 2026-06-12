## 2025-05-20 - Insecure Mermaid Rendering Security Level
**Vulnerability:** Mermaid diagram rendering with `securityLevel: "loose"` combined with `dangerouslySetInnerHTML`.
**Learning:** Mermaid's `"loose"` security level allows HTML tags and click events in diagrams. When these diagrams are rendered into the DOM using `dangerouslySetInnerHTML`, it creates a vector for Cross-Site Scripting (XSS) if the diagram content (e.g., from AI response or user input) is not fully trusted.
**Prevention:** Use `securityLevel: "strict"` when initializing Mermaid to ensure that HTML tags in chart text are encoded and click functionality is disabled.
