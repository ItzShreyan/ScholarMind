export function selectProvider(input: any) {
  const mode = input.mode || "chat";

  // Free fast model for light tasks
  if (mode === "chat" || mode === "eli10" || mode === "summary") {
    return "openrouter_v2";
  }

  // Stronger structured outputs
  if (mode === "quiz" || mode === "flashcards" || mode === "deep") {
    return "groq_v2";
  }

  // fallback
  return "gemini";
}
