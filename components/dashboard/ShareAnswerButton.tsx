"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { summarizeForShare } from "@/lib/plain-text";
import { toast } from "@/lib/toast";
import { chatActionButtonClass } from "@/components/dashboard/ReadAloudButton";

/**
 * Share an answer.
 *
 * Uses the OS share sheet where it exists (every mobile browser, and Safari on
 * desktop), and falls back to copying before it ever tells the student it
 * cannot help. A share that silently does nothing would be worse than no
 * button at all.
 */
export function ShareAnswerButton({ content, title = "ScholarMind answer" }: { content: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const text = summarizeForShare(content, 900);
    if (!text) {
      toast.error("There is nothing to share yet.");
      return;
    }

    const payload = {
      title,
      text,
      url: typeof window !== "undefined" ? window.location.href : undefined
    };

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        // A dismissed share sheet is not an error; anything else falls through
        // to the clipboard so the action still succeeds.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    if (!navigator.clipboard) {
      toast.error("Sharing is not available in this browser.", {
        description: "Select the answer and copy it manually instead."
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
      toast.success("Answer copied.", { description: "Ready to paste into a message or a document." });
    } catch {
      toast.error("Could not copy the answer.", {
        description: "Your browser blocked clipboard access. Select the text and copy it manually."
      });
    }
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      className={chatActionButtonClass}
      aria-label="Share answer"
      title="Share"
    >
      {copied ? <Check className="h-4 w-4 text-[var(--accent-mint)]" /> : <Share2 className="h-4 w-4" />}
    </button>
  );
}
