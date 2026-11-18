"use client";

import type { ReactElement } from "react";
import { AnswerBlock } from "@/components/dashboard/chat-blocks/AnswerBlock";
import { CheckBlock } from "@/components/dashboard/chat-blocks/CheckBlock";
import { PracticeBlock } from "@/components/dashboard/chat-blocks/PracticeBlock";
import { StepsBlock } from "@/components/dashboard/chat-blocks/StepsBlock";
import { TermsBlock } from "@/components/dashboard/chat-blocks/TermsBlock";
import {
  parseAnswer,
  parseCheck,
  parsePractice,
  parseSteps,
  parseTerms
} from "@/components/dashboard/chat-blocks/parse";

/** The five fence languages this module owns. */
export const CHAT_BLOCK_LANGUAGES = ["steps", "answer", "practice", "check", "terms"] as const;

export type ChatBlockLanguage = (typeof CHAT_BLOCK_LANGUAGES)[number];

/** `"language-steps"` → `"steps"`, or null when it is not one of ours. */
export function readBlockLanguage(className: string | undefined): ChatBlockLanguage | null {
  if (!className) return null;

  const match = className.match(/language-([a-z]+)/i);
  if (!match) return null;

  const language = match[1].toLowerCase();
  return (CHAT_BLOCK_LANGUAGES as readonly string[]).includes(language)
    ? (language as ChatBlockLanguage)
    : null;
}

/**
 * Render a custom block, or `null` to let the caller fall back to the normal
 * code renderer.
 *
 * Returning null on a parse failure is the whole safety story: a model that
 * emits a broken fence produces a plain code block the student can still read,
 * never a blank message.
 */
export function renderChatBlock(
  language: ChatBlockLanguage,
  source: string
): ReactElement | null {
  switch (language) {
    case "steps": {
      const data = parseSteps(source);
      return data ? <StepsBlock data={data} /> : null;
    }
    case "answer": {
      const data = parseAnswer(source);
      return data ? <AnswerBlock data={data} /> : null;
    }
    case "practice": {
      const data = parsePractice(source);
      return data ? <PracticeBlock data={data} /> : null;
    }
    case "check": {
      const data = parseCheck(source);
      return data ? <CheckBlock data={data} /> : null;
    }
    case "terms": {
      const data = parseTerms(source);
      return data ? <TermsBlock data={data} /> : null;
    }
    default:
      return null;
  }
}

export { BlockActionContext, useBlockAction } from "@/components/dashboard/chat-blocks/BlockActionContext";

export { AnswerBlock, CheckBlock, PracticeBlock, StepsBlock, TermsBlock };
