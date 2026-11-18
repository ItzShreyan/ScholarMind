"use client";

import { createContext, useContext } from "react";

/**
 * Lets a custom block send a message back into the chat.
 *
 * Provided only by the chat message render, which is the one place that has a
 * send function. The other six RichStudyText call sites render the same blocks
 * without interactive controls, because `onAction` is null there — a saved
 * study output tab should not present a button that silently does nothing.
 */
export const BlockActionContext = createContext<((text: string) => void) | null>(null);

export function useBlockAction() {
  return useContext(BlockActionContext);
}
