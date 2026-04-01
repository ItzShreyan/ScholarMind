export type PreferenceTool =
  | "summary"
  | "flashcards"
  | "quiz"
  | "exam"
  | "insights"
  | "hard_mode"
  | "study_plan"
  | "concepts";

export type UserPreferences = {
  theme: "dark" | "light";
  playfulMotion: boolean;
  rememberLastStudio: boolean;
  lastStudioId: string | null;
  defaultTool: PreferenceTool;
};

export const defaultUserPreferences: UserPreferences = {
  theme: "dark",
  playfulMotion: true,
  rememberLastStudio: true,
  lastStudioId: null,
  defaultTool: "summary"
};
