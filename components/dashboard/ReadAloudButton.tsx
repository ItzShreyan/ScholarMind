"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { chunkForSpeech, markdownToPlainText } from "@/lib/plain-text";
import { toast } from "@/lib/toast";
import { cn } from "@/components/ui/cn";

/** Shared style for every icon button in the chat action row. */
export const chatActionButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/16 hover:text-white disabled:opacity-55";

/**
 * Read an answer aloud.
 *
 * Uses the browser's own speech synthesis — no network, no dependency, and no
 * cost. Long answers are queued in sentence-sized chunks so playback starts
 * immediately and nothing is truncated by the engine.
 *
 * The button is hidden (not silently broken) on browsers without support.
 */
export function ReadAloudButton({ content, label = "assistant response" }: { content: string; label?: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      cancelledRef.current = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(() => {
    if (!("speechSynthesis" in window)) return;

    const text = markdownToPlainText(content);
    if (!text) {
      toast.error("There is nothing to read aloud yet.");
      return;
    }

    const chunks = chunkForSpeech(text);
    cancelledRef.current = false;
    window.speechSynthesis.cancel();

    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.rate = 1;
      utterance.pitch = 1;
      if (index === chunks.length - 1) {
        utterance.onend = () => setSpeaking(false);
      }
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    });

    setSpeaking(true);
  }, [content]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={speaking ? stop : speak}
      className={cn(chatActionButtonClass)}
      aria-label={speaking ? "Stop reading aloud" : `Read ${label} aloud`}
      aria-pressed={speaking}
      title={speaking ? "Stop reading" : "Read aloud"}
    >
      {speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
}
