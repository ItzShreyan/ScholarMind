/**
 * Types shared across the study studio.
 *
 * These were declared inside `StudyWorkspace.tsx`, which meant the pure
 * parsing and formatting helpers had no way to be imported anywhere else — a
 * test could not construct a `QuizItem`, and a sibling component could not
 * accept one. They live here so the data contract is visible on its own.
 */

import type { LearningModeId } from "@/lib/ai/learning-modes";
import type { WebSearchMode } from "@/lib/ai/research-intent";

export type Session = { id: string; title: string };

export type FileItem = {
  id: string;
  file_name: string;
  extracted_text: string;
  file_type: string;
  storage_path: string;
  source_enabled?: boolean;
};

export type ChatCitation = {
  title: string;
  url: string;
  source: string;
  trustLabel: string;
};

/** What the research step actually did, reported by the server. */
export type ChatResearchMeta = {
  mode: WebSearchMode;
  depth: "quick" | "deep";
  queries: string[];
  domains: string[];
  degraded?: string;
  conflicts: number;
};

export type ChatModelMeta = {
  model: string;
  tier: string;
  choice: string;
  auto: boolean;
  reason: string;
  /** Live web sources the answer drew on, when a search ran for this turn. */
  sources?: ChatCitation[];
  /** Absent when nothing was looked up, so "not searched" is distinguishable. */
  research?: ChatResearchMeta;
};

export type ChatMessage = {
  role: "user" | "ai";
  content: string;
  reasoning?: string;
  startedAt?: number;
  completedAt?: number;
  /** Which model actually answered, reported by the API on the first frame. */
  meta?: ChatModelMeta;
};

export type ChatThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

/**
 * The studio's own tool set.
 *
 * Deliberately narrower than the route's action type: the studio generates
 * these nine outputs and nothing else, so a chat turn can never be handed to
 * a generator prompt.
 */
export type AIAction =
  | "summary"
  | "flashcards"
  | "quiz"
  | "notes"
  | "exam"
  | "insights"
  | "hard_mode"
  | "study_plan"
  | "concepts";

export type ToolDraft = {
  action: AIAction;
  count: number;
  difficulty: "foundation" | "exam";
  examMode?: "full" | "practice";
  focus: string;
};

export type QuizItem = {
  question: string;
  options?: string[];
  answer?: string;
  explanation?: string;
};

export type FlashcardItem = {
  front: string;
  back: string;
};

export type QuizResult = {
  question: string;
  selected: string;
  correct: string;
  isCorrect: boolean;
  explanation: string;
};

export type OutputCard = {
  title: string;
  body: string;
};

export type ExamQuestion = {
  number: string;
  prompt: string;
  marks: string;
};

export type ToolHistoryItem = {
  id: string;
  action: AIAction;
  title: string;
  label: string;
  preview: string;
  output: string;
  createdAt: number;
};

export type WebSourceItem = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  trustLabel: string;
};

export type WorkspaceDynamicTab = {
  id: string;
  label: string;
  kind: "source" | "canvas-source" | "output" | "canvas-output" | "search" | "browse" | "canvas-browse";
  closable: true;
  action?: AIAction;
  output?: string;
  file?: FileItem;
  previewKind?: "text" | "table" | "pdf" | "image" | "audio" | "word" | "presentation";
  text?: string;
  url?: string | null;
  html?: string;
  query?: string;
  results?: WebSourceItem[];
};

export type PreviewState = {
  open: boolean;
  loading: boolean;
  file: FileItem | null;
  kind: "text" | "table" | "pdf" | "image" | "audio" | "word" | "presentation";
  text: string;
  url: string | null;
  error: string;
};

export type StudyMetrics = {
  quizAnswered: number;
  quizCorrect: number;
  flashcardsFlipped: number;
  toolRuns: Record<AIAction, number>;
  recentQuizResults: QuizResult[];
};

export type RevisionScheduleItem = {
  day: string;
  focus: string;
  task: string;
  check: string;
};

export type SourceSearchEngine = "scholar" | "google" | "duckduckgo";

export type CopiedSourceClipboard = {
  sourceSessionId: string;
  sourceStudioTitle: string;
  copiedAt: number;
};

export type CanvasTool = "mouse" | "text" | "highlight" | "draw" | "eraser";

export type CanvasAnnotation = {
  id: string;
  tabId: string;
  tool: Exclude<CanvasTool, "mouse">;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: number;
};

export type CanvasPoint = { x: number; y: number; pressure: number };

export type CanvasStroke = {
  id: string;
  tabId: string;
  tool: "highlight" | "draw";
  color: string;
  width: number;
  points: CanvasPoint[];
  createdAt: number;
};

export type RecentWebsite = {
  url: string;
  label: string;
  visitedAt: number;
};

/** The student's remembered tutor preferences. */
export type StudioChatPreferences = {
  modelChoice: "auto" | "pro" | "flash";
  learningMode: LearningModeId;
  webSearchMode: WebSearchMode;
};
