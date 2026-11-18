"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { codeLanguageLabel } from "@/lib/safe-markup";

/**
 * A fenced code block, typeset as part of the answer rather than as a chat
 * attachment.
 *
 * The visual language is deliberate: a quiet monospace slab with the language
 * named on the left, so a student scanning an answer can skip it in one glance
 * when it is not the part they need. Copying is one click and confirms itself
 * without a toast.
 */
export function StudyCodeBlock({
  code,
  className
}: {
  code: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be denied; the code is still selectable by hand.
      setCopied(false);
    }
  }, [code]);

  const label = codeLanguageLabel(className);

  return (
    <div className="study-code">
      <div className="study-code-header">
        <span className="study-code-lang">{label}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="study-code-copy"
          aria-label={copied ? "Code copied" : `Copy ${label} code`}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="study-code-pre">
        <code className={className}>{code}</code>
      </pre>
    </div>
  );
}
