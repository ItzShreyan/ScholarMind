"use client";

import { DragEvent as ReactDragEvent, KeyboardEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Brain,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CheckCircle2,
  Copy,
  Eraser,
  Eye,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe2,
  Highlighter,
  LoaderCircle,
  Lock,
  Maximize2,
  MousePointer2,
  Music,
  Pencil,
  PenLine,
  Play,
  Plus,
  RefreshCw,
  Search,
  SendHorizonal,
  Timer,
  Trash2,
  Upload,
  WandSparkles,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import type { SourceModalProps } from "@/components/dashboard/SourceModal";

const SourceModal = dynamic<SourceModalProps>(
  () => import("@/components/dashboard/SourceModal").then((m) => ({ default: m.SourceModal })),
  { ssr: false }
);
const WorkspaceTimer = dynamic(() => import("@/components/dashboard/WorkspaceTimer").then((m) => ({ default: m.WorkspaceTimer })), { ssr: false });
import { RichStudyText } from "@/components/dashboard/RichStudyText";
import { SpotifyPlaybackPanel } from "@/components/dashboard/SpotifyPlaybackPanel";
import { SpotifyPlaybackProvider } from "@/components/dashboard/useSpotifyPlayback";
import { DynamicIslandMusicPlayer } from "@/components/dashboard/DynamicIslandMusicPlayer";
import { AINotesConsole } from "@/components/dashboard/AINotesConsole";
import { FileViewer } from "@/components/dashboard/FileViewer";
import type { PreviewKind } from "@/components/dashboard/FileViewer";
import { SecurityBadge } from "@/components/common/SecurityBadge";
import { Button } from "@/components/ui/Button";
import { defaultExamGeneratorWeeklyLimit, defaultFreePreviewDailyLimit } from "@/lib/ai/preview";
import { defaultUserPreferences } from "@/lib/preferences/defaults";
import { buildStudyContext } from "@/lib/ai/source-context";
import { onboardingSummary, type OnboardingRecord } from "@/lib/onboarding-profile";
import { parseFlashcards } from "@/lib/ai/parse";
import { extractStructuredOutput } from "@/lib/ai/strip-reasoning";
import type { SiteSettings } from "@/lib/site-settings";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";
import {
  defaultMaxUploadFileSizeMb,
  resolvePreviewKind,
  uploadAcceptAttribute
} from "@/lib/documents/formats";

type Session = { id: string; title: string };
type FileItem = {
  id: string;
  file_name: string;
  extracted_text: string;
  file_type: string;
  storage_path: string;
  source_enabled?: boolean;
};
type ChatMessage = { role: "user" | "ai"; content: string };
type ChatThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};
type AIAction =
  | "summary"
  | "flashcards"
  | "quiz"
  | "notes"
  | "exam"
  | "insights"
  | "hard_mode"
  | "study_plan"
  | "concepts";

type ToolDraft = {
  action: AIAction;
  count: number;
  difficulty: "foundation" | "exam";
  examMode?: "full" | "practice";
  focus: string;
};

type QuizItem = {
  question: string;
  options?: string[];
  answer?: string;
  explanation?: string;
};

type FlashcardItem = {
  front: string;
  back: string;
};

type QuizResult = {
  question: string;
  selected: string;
  correct: string;
  isCorrect: boolean;
  explanation: string;
};

type OutputCard = {
  title: string;
  body: string;
};

type ExamQuestion = {
  number: string;
  prompt: string;
  marks: string;
};

type ToolHistoryItem = {
  id: string;
  action: AIAction;
  title: string;
  label: string;
  preview: string;
  output: string;
  createdAt: number;
};

type WorkspaceDynamicTab = {
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
  query?: string;
  results?: WebSourceItem[];
};

type PreviewState = {
  open: boolean;
  loading: boolean;
  file: FileItem | null;
  kind: "text" | "table" | "pdf" | "image" | "audio" | "word" | "presentation";
  text: string;
  url: string | null;
  error: string;
};

type WebSourceItem = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  trustLabel: string;
};

type StudyMetrics = {
  quizAnswered: number;
  quizCorrect: number;
  flashcardsFlipped: number;
  toolRuns: Record<AIAction, number>;
  recentQuizResults: QuizResult[];
};

type RevisionScheduleItem = {
  day: string;
  focus: string;
  task: string;
  check: string;
};

type SourceSearchEngine = "scholar" | "google" | "duckduckgo";
type CopiedSourceClipboard = {
  sourceSessionId: string;
  sourceStudioTitle: string;
  copiedAt: number;
};
type CanvasTool = "mouse" | "text" | "highlight" | "draw" | "eraser";
type CanvasAnnotation = {
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
type CanvasPoint = { x: number; y: number; pressure: number };
type CanvasStroke = {
  id: string;
  tabId: string;
  tool: "highlight" | "draw";
  color: string;
  width: number;
  points: CanvasPoint[];
  createdAt: number;
};

const desktopLeftPanelDefault = 360;
const desktopRightPanelDefault = 520;
const desktopLeftPanelMin = 300;
const desktopLeftPanelMax = 520;
const desktopRightPanelMin = 420;
const desktopRightPanelMax = 760;
const desktopCenterPanelMin = 460;
const desktopResizeHandleWidth = 14;
const sourceClipboardStorageKey = "scholarmind_source_clipboard";
const focusMusicStateStorageKey = "scholarmind_focus_music_state";
const chatThreadsStoragePrefix = "scholarmind_chat_threads:";
const recentWebsitesStoragePrefix = "scholarmind_recent_websites:";
const maxRecentWebsites = 6;

type RecentWebsite = {
  url: string;
  label: string;
  visitedAt: number;
};

const focusTracks: Array<{ title: string; artist: string; mood: string; color: string }> = [];

const musicProviders = [
  { key: "spotify", name: "Spotify", logo: "S", href: "/api/music/spotify/login", note: "Connect account • Free accounts have limited playback", unavailable: false }
];

const actionButtons: { key: AIAction; label: string; copy: string }[] = [
  { key: "summary", label: "Summary", copy: "Condense the uploaded material into fast revision notes." },
  { key: "notes", label: "AI Notes", copy: "Build long textbook-style notes with formulas, examples, questions, and science labs." },
  { key: "flashcards", label: "Flashcards", copy: "Turn the notes into quick active-recall prompts." },
  { key: "quiz", label: "Quiz", copy: "Generate multiple-choice questions from the uploaded sources." },
  { key: "exam", label: "Exam Generator", copy: "Build a full GCSE, A-Level, or custom mock paper from the source stack." }
];

const toolTones: Record<AIAction, string> = {
  summary: "border-[rgba(57,208,255,0.22)] bg-[rgba(57,208,255,0.1)]",
  notes: "border-[rgba(255,209,102,0.24)] bg-[rgba(255,209,102,0.1)]",
  flashcards: "border-[rgba(255,209,102,0.24)] bg-[rgba(255,209,102,0.1)]",
  quiz: "border-[rgba(121,247,199,0.24)] bg-[rgba(121,247,199,0.1)]",
  exam: "border-[rgba(255,209,102,0.24)] bg-[rgba(255,209,102,0.08)]",
  insights: "border-[rgba(255,125,89,0.24)] bg-[rgba(255,125,89,0.1)]",
  hard_mode: "border-[rgba(255,125,89,0.26)] bg-[rgba(255,125,89,0.12)]",
  study_plan: "border-[rgba(57,208,255,0.22)] bg-[rgba(57,208,255,0.08)]",
  concepts: "border-[rgba(121,247,199,0.24)] bg-[rgba(121,247,199,0.08)]"
};

function createToolDraft(action: AIAction): ToolDraft {
  return {
    action,
    count: action === "flashcards" ? 8 : action === "quiz" ? 6 : action === "study_plan" ? 7 : action === "exam" ? 14 : action === "notes" ? 8 : 5,
    difficulty: action === "hard_mode" || action === "exam" ? "exam" : "foundation",
    examMode: action === "exam" ? "full" : undefined,
    focus: ""
  };
}

function parseJsonBlock<T>(text: string): T | null {
  // Strip BOM, reasoning preamble, and clean up
  let cleaned = extractStructuredOutput(text).replace(/^\uFEFF/, "").trim();
  if (!cleaned) return null;

  // Recursively strip trailing commas: keep going until no more matches
  const stripTrailingCommas = (s: string): string => {
    const result = s.replace(/,\s*([\]}])/g, "$1");
    return result === s ? result : stripTrailingCommas(result);
  };
  cleaned = stripTrailingCommas(cleaned);

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // fall through
  }

  // Try extracting from code fences
  const fencedMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    const jsonStr = stripTrailingCommas(fencedMatch[1].trim());
    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      // fall through
    }
  }

  // Try extracting balanced array or object from the raw text
  const bracketMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (bracketMatch) {
    const jsonStr = stripTrailingCommas(bracketMatch[1]);
    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      // fall through
    }
  }

  return null;
}

function cleanGeneratedText(text: string) {
  return extractStructuredOutput(text)
    .replace(/^Local fallback response\s*/i, "")
    .replace(/```(?:json)?/gi, "")
    .trim();
}

function normalizeAIText(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed && trimmed !== "[object Object]" && trimmed !== "{}" ? trimmed : "";
  }
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = [record.error, record.message, record.text, record.content];
    for (const item of preferred) {
      const normalized = normalizeAIText(item);
      if (normalized) return normalized;
    }
    try {
      const json = JSON.stringify(value);
      return json === "{}" ? "" : json;
    } catch {
      return "";
    }
  }
  return String(value).trim();
}

function normalizeErrorMessage(value: unknown, fallback = "Unexpected error") {
  const normalized = normalizeAIText(value);
  if (!normalized || normalized === "[object Object]" || normalized === "{}") {
    return fallback;
  }
  return normalized;
}

function sanitizeDisplayText(value: unknown, fallback: string) {
  const normalized = normalizeErrorMessage(value, fallback);
  return normalized === "[object Object]" ? fallback : normalized;
}

function normalizeAIResponseText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(normalizeAIResponseText).filter(Boolean).join("\n");
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const candidate = normalizeAIText(record.text ?? record.content ?? record.error ?? record.message);
    return candidate || JSON.stringify(value);
  }
  return normalizeAIText(value);
}

function parseSSEChunk(chunk: string): string {
  const lines = chunk.split(/\r?\n/);
  let extracted = "";
  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    const payload = line.replace(/^data:\s*/, "").trim();
    if (payload === "[DONE]") continue;
    try {
      const data = JSON.parse(payload);
      const delta = data?.choices?.[0]?.delta?.content;
      extracted += normalizeAIText(delta);
    } catch {
      // not JSON: ignore
    }
  }
  return extracted;
}

function normalizeLine(line: string) {
  return line
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .trim();
}

function clipText(text: string, limit: number) {
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function summarizeGeneratedOutput(text: string) {
  return clipText(
    cleanGeneratedText(text)
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
    180
  );
}

function isTutorSmallTalk(text: string) {
  const normalized = text.trim().toLowerCase();
  return /^(hi|hey|hello|yo|hiya|good morning|good afternoon|good evening)\b/.test(normalized) ||
    /how are you( doing)?/i.test(normalized) ||
    /what'?s up/i.test(normalized);
}

function detectChatToolRequest(text: string): AIAction | null {
  const normalized = text.toLowerCase();
  if (!/\b(make|build|create|generate|turn|give me)\b/.test(normalized)) return null;
  if (/\bflashcards?\b/.test(normalized)) return "flashcards";
  if (/\bquiz\b|\bmcq\b|\bmultiple[- ]choice\b/.test(normalized)) return "quiz";
  if (/\bexam\b|\bmock paper\b|\btest paper\b/.test(normalized)) return "exam";
  if (/\b(ai notes|long notes|textbook notes|study notes|detailed notes)\b/.test(normalized)) return "notes";
  if (/\bsummary\b|\bsummarise\b|\bsummarize\b/.test(normalized)) return "summary";
  return null;
}

function extractUrlFromText(text: string) {
  const match = text.match(/https?:\/\/[^\s)]+/i);
  return match?.[0]?.replace(/[.,;]+$/, "") || null;
}

function extractWebUrlFromSourceText(text: string) {
  const labeled = text.match(/Source URL:\s*(https?:\/\/[^\s]+)/i);
  if (labeled?.[1]) return labeled[1].trim();
  return extractUrlFromText(text);
}

function getSearchUrl(query: string) {
  return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query.trim())}`;
}

function detectCanvasAssistRequest(text: string): "highlight" | "text" | null {
  const lower = text.toLowerCase();
  if (!/\b(highlight|annotate|annotation|mark up|markup|text box|add a note|mark this)\b/.test(lower)) {
    return null;
  }
  if (/\bhighlight\b/.test(lower)) return "highlight";
  return "text";
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    const statusMessage = response.status ? ` (${response.status})` : "";
    throw new Error(
      response.ok
        ? `The server returned an unreadable response${statusMessage}. Restart the dev server and try again.`
        : `The server returned an unexpected response${statusMessage}.`
    );
  }
}

function cleanCardText(text: string) {
  return cleanGeneratedText(text)
    .replace(/^question:\s*/i, "")
    .replace(/^source:\s*[^\n]+/gim, "")
    .replace(/^source title:\s*[^\n]+/gim, "")
    .replace(/^source url:\s*[^\n]+/gim, "")
    .replace(/^summary:\s*[^\n]+/gim, "")
    .replace(/^trust:\s*[^\n]+/gim, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFlashcards(items: FlashcardItem[] | null) {
  if (!items?.length) return null;

  const normalized = items
    .map((item, index) => {
      const front = clipText(cleanCardText(item.front || `Flashcard ${index + 1}`), 96);
      const back = clipText(cleanCardText(item.back || ""), 220);
      return {
        front: front || `Flashcard ${index + 1}`,
        back: back || "Review the uploaded sources and try generating this flashcard again."
      };
    })
    .filter((item) => item.front || item.back);

  return normalized.length ? normalized : null;
}

function parseFlashcardsFallback(text: string) {
  const cleaned = cleanGeneratedText(text);
  const matches = Array.from(
    cleaned.matchAll(/(?:Flashcard\s*\d+)?\s*Front:\s*([\s\S]+?)\s*Back:\s*([\s\S]+?)(?=(?:Flashcard\s*\d+)?\s*Front:|$)/gi)
  );

  if (!matches.length) return null;

  return matches.map((match) => ({
    front: cleanCardText(match[1]),
    back: cleanCardText(match[2])
  }));
}

function normalizeQuizAnswer(answer: string | undefined, options: string[]) {
  const rawAnswer = cleanCardText(answer || "");
  if (!rawAnswer) return "";

  const letterMatch = rawAnswer.match(/^[A-D]/i)?.[0]?.toUpperCase();
  if (!letterMatch) return rawAnswer;

  return options.find((option) => option.trim().toUpperCase().startsWith(letterMatch)) || rawAnswer;
}

function normalizeQuizItems(items: QuizItem[] | null) {
  if (!items?.length) return null;

  const normalized = items
    .map((item) => {
      const options = (item.options ?? []).map((option) => cleanCardText(option)).filter(Boolean).slice(0, 4);
      return {
        question: clipText(cleanCardText(item.question || ""), 220),
        options,
        answer: normalizeQuizAnswer(item.answer, options),
        explanation: clipText(cleanCardText(item.explanation || ""), 220)
      };
    })
    .filter((item) => item.question);

  return normalized.length ? normalized : null;
}

function parseQuizFallback(text: string) {
  const cleaned = cleanGeneratedText(text);
  const blocks = cleaned
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  const questions: QuizItem[] = [];
  let current: QuizItem | null = null;

  const pushCurrent = () => {
    if (!current?.question) return;
    questions.push({
      question: current.question,
      options: current.options?.filter(Boolean) ?? [],
      answer: current.answer,
      explanation: current.explanation
    });
  };

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const hasQuestion = lines.some((line) => /^(question\s*\d+|q\d+|\d+[.)])/i.test(line));
    if (hasQuestion) {
      pushCurrent();
      current = { question: "", options: [] };
    }

    for (const line of lines) {
      if (!current) {
        current = { question: "", options: [] };
      }

      if (/^(question\s*\d+|q\d+|\d+[.)])/i.test(line)) {
        current.question = cleanCardText(line.replace(/^(question\s*\d+|q\d+|\d+[.)])[:.)-\s]*/i, ""));
        continue;
      }

      if (/^[A-D][.)-]/i.test(line)) {
        current.options = [...(current.options ?? []), cleanCardText(line)];
        continue;
      }

      if (/^answer:/i.test(line)) {
        current.answer = cleanCardText(line.replace(/^answer:/i, ""));
        continue;
      }

      if (/^explanation:/i.test(line)) {
        current.explanation = cleanCardText(line.replace(/^explanation:/i, ""));
        continue;
      }

      if (!current.question) {
        current.question = cleanCardText(line);
      } else if (!current.explanation) {
        current.explanation = cleanCardText(line);
      }
    }
  }

  pushCurrent();
  return questions.length ? questions : null;
}

function parseOutputCards(text: string, action: AIAction): OutputCard[] {
  const cleaned = cleanGeneratedText(text);
  if (!cleaned) return [];

  const lines = cleaned
    .split(/\n+/)
    .map(normalizeLine)
    .filter(Boolean);

  if (!lines.length) return [];

  if (action === "study_plan") {
    return lines.map((line, index) => {
      const [title, ...rest] = line.split(/:\s+/);
      if (/^day\b/i.test(title) && rest.length) {
        return { title, body: rest.join(": ") };
      }
      return { title: `Step ${index + 1}`, body: line };
    });
  }

  return lines.map((line, index) => {
    const [title, ...rest] = line.split(/:\s+/);
    if (rest.length && title.length < 42) {
      return { title, body: rest.join(": ") };
    }

    return {
      title:
        action === "hard_mode"
          ? `Challenge ${index + 1}`
          : action === "concepts"
            ? `Concept ${index + 1}`
            : action === "summary"
              ? `Key Point ${index + 1}`
              : `Study Note ${index + 1}`,
      body: line
    };
  });
}

function parseTablePreview(text: string) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : ",";
  return lines.slice(0, 30).map((line) => line.split(delimiter).map((cell) => cell.trim()));
}

function buildToolPrompt(draft: ToolDraft, files: FileItem[]) {
  const count = Math.max(3, Math.min(draft.count, draft.action === "exam" ? 18 : 12));
  const sourceList = files.map((file) => file.file_name).join(", ");
  const focus = draft.focus.trim() || "the most important ideas across all uploaded files";
  const difficulty = draft.difficulty === "exam" ? "exam-level" : "foundation-level";
  const preface = `Use only the uploaded study sources. Base the output on these files: ${sourceList}. Focus on ${focus}. Keep the output ${difficulty}. Do not paste source metadata, filenames, URLs, AI context, or prompt instructions unless the user needs a citation. Do not output placeholders. Produce the final student-facing study material only.`;

  switch (draft.action) {
    case "quiz":
      return `${preface} Generate ${count} high-quality multiple-choice questions like a real study platform. Use the student profile in the context to match their country, curriculum stage, exam board, and tier where provided. Every question must test a specific fact, method, formula, misconception, source detail, or exam skill from the uploaded material. Avoid generic options like "source", "definition", "examples", or "types". Make distractors plausible, not silly. Keep each option short, give exactly 4 options, make the answer match one option exactly, and keep the explanation brief but useful. Return only a JSON array with this exact shape and no markdown: [{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":"A. ...","explanation":"..."}].`;
    case "flashcards":
      return `${preface} Generate ${count} strong active-recall flashcards. Each front must be a real term, question, formula, process, date, quote, rule, or recall cue from the sources, not a generic word. The back should be concise, accurate, and phrased like a student-friendly memory answer. Keep each front under 14 words and each back under 45 words. Do not paste raw source paragraphs or repeat the file name. Return only JSON with this exact shape: [{"front":"...","back":"..."}].`;
    case "exam":
      if (draft.examMode === "practice") {
        return `${preface} Generate ${Math.max(4, Math.min(12, count))} original exam-style practice questions in markdown, not a full exam. Include mark allocations, space for working, and a compact mark scheme at the end. Questions must be source-specific, realistic, and useful for quick revision. If the material is mathematical, include method-based questions and formulas where helpful. Do not copy real past-paper questions.`;
      }
      return `${preface} Generate a long original ${focus} mock exam in markdown with around ${Math.max(36, count + 22)} questions. Include a front-page title, time allowed, total marks, short instructions, clearly numbered questions, mark allocations, multiple sections, and a compact mark scheme table at the end. Aim for the feel of a real GCSE, A-Level, school, university, or international mock paper rather than a short worksheet, while creating new questions instead of copying past papers. Use source-specific wording, not generic filler. If the material is mathematical, include method-based questions, multi-step problems, formulas, diagrams or tables when helpful, and require working.`;
    case "notes":
      return `${preface} Generate long-form AI Notes as valid JSON only. Make it textbook-quality, source-grounded, curriculum-aware, and much more detailed than a summary. Teach the topic like a patient tutor: clear chapter sections, short paragraphs, definitions, formulas, worked examples, common mistakes, callouts, diagrams/tables where useful, and practice questions with hints and answers. Include enough depth that a student can revise from it without needing the original source open. Include formulaBlocks only when formulas genuinely matter. Include scienceSimulation only when the source is clearly science/STEM and an interactive simulation would actually help understanding, such as particles, waves, circuits, forces, energy transfer, rates of reaction, diffusion, osmosis, or cells. Do not include any simulation for non-science or where a simulation would feel forced. Return JSON with title, subject, level, estimatedTime, sections, callouts, formulaBlocks, workedExamples, practiceQuestions, diagrams, scienceSimulation or simulationSpec, and sourceNotes.`;
    case "summary":
      return `${preface} Return a full revision summary in markdown. Use these sections in order: ## What this topic is about, ## Key points to remember, ## Step-by-step explanation, ## What to memorise, ## Quick self-check. Keep it concise but complete, use short paragraphs or bullets where helpful, and use a table only when the source naturally contains comparisons, formulas, or dates.`;
    case "insights":
      return `${preface} Return a short performance report with weak spots, misconceptions, and next-best study actions. Use a markdown table when it helps.`;
    case "hard_mode":
      return `${preface} Return a markdown table with ${count} likely exam traps. Use the columns Trap | Why students fall for it | Correct move | Self-check.`;
    case "study_plan":
      return `${preface} Return a ${count}-step study plan as a markdown table with the columns Day | Focus | Task | Check.`;
    case "concepts":
      return `${preface} Return either a concise markdown table or a mermaid diagram when it helps explain the topic links. If neither helps, return ${count} lines in the format "Concept: why it matters".`;
    default:
      return preface;
  }
}

function looksRichOutput(text: string) {
  return /```mermaid/i.test(text) || /\|.+\|/.test(text) || /^#{1,3}\s/m.test(text);
}

function trustBadgeTone(trustLabel: string) {
  if (trustLabel === "Verified") {
    return "bg-[rgba(121,247,199,0.18)] text-[var(--accent-mint)]";
  }

  if (trustLabel === "Scholar") {
    return "bg-[rgba(57,208,255,0.18)] text-[var(--accent-sky)]";
  }

  if (trustLabel === "Trusted") {
    return "bg-[rgba(255,209,102,0.18)] text-[var(--accent-gold)]";
  }

  return "bg-white/10 text-[var(--fg)]";
}

function createEmptyMetrics(): StudyMetrics {
  return {
    quizAnswered: 0,
    quizCorrect: 0,
    flashcardsFlipped: 0,
    toolRuns: {
      summary: 0,
      notes: 0,
      flashcards: 0,
      quiz: 0,
      exam: 0,
      insights: 0,
      hard_mode: 0,
      study_plan: 0,
      concepts: 0
    },
    recentQuizResults: []
  };
}

function buildPerformanceSummary(metrics: StudyMetrics) {
  const toolSummary = Object.entries(metrics.toolRuns)
    .filter(([, count]) => count > 0)
    .map(([action, count]) => `${action.replace(/_/g, " ")}: ${count}`)
    .join(", ");

  return [
    `Quiz answers checked: ${metrics.quizAnswered}`,
    `Quiz answers correct: ${metrics.quizCorrect}`,
    `Flashcards flipped: ${metrics.flashcardsFlipped}`,
    toolSummary ? `Tool usage: ${toolSummary}` : "",
    metrics.recentQuizResults.length
      ? `Recent quiz misses: ${metrics.recentQuizResults
          .filter((item) => !item.isCorrect)
          .slice(0, 3)
          .map((item) => item.question)
          .join(" | ")}`
      : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function parseMarkdownTableRows(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));

  if (lines.length < 3) return [];

  const rows = lines
    .map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));

  if (rows.length < 3) return [];
  return rows;
}

function parseRevisionSchedule(text: string): RevisionScheduleItem[] {
  const rows = parseMarkdownTableRows(text);

  if (rows.length) {
    const [header, divider, ...body] = rows;
    const normalizedHeader = header.map((cell) => cell.toLowerCase());
    if (divider.every((cell) => /^:?-{3,}:?$/.test(cell))) {
      const dayIndex = normalizedHeader.findIndex((cell) => cell.includes("day") || cell.includes("week"));
      const focusIndex = normalizedHeader.findIndex((cell) => cell.includes("focus"));
      const taskIndex = normalizedHeader.findIndex((cell) => cell.includes("task") || cell.includes("study"));
      const checkIndex = normalizedHeader.findIndex((cell) => cell.includes("check"));

      if (dayIndex >= 0 && focusIndex >= 0) {
        return body.map((row) => ({
          day: row[dayIndex] || `Day ${body.indexOf(row) + 1}`,
          focus: row[focusIndex] || "Focus",
          task: row[taskIndex] || row[focusIndex] || "",
          check: row[checkIndex] || "Do a quick recall check."
        }));
      }
    }
  }

  return parseOutputCards(text, "study_plan").map((card, index) => ({
    day: /^day|^week/i.test(card.title) ? card.title : `Day ${index + 1}`,
    focus: card.title,
    task: card.body,
    check: "Summarise it aloud and self-test."
  }));
}

function parseExamQuestions(text: string): ExamQuestion[] {
  const cleaned = cleanGeneratedText(text);
  if (!cleaned) return [];

  const questionOnlySection = cleaned
    .split(/\n#{1,6}\s*mark scheme\b/i)[0]
    .split(/\nmark scheme\b/i)[0]
    .trim();

  const matches = Array.from(
    questionOnlySection.matchAll(
      /(?:^|\n)(?:question\s*)?(\d+[a-z]?)[.)]\s+([\s\S]*?)(?=(?:\n(?:question\s*)?\d+[a-z]?[.)]\s)|(?:\n#{1,6}\s)|$)/gim
    )
  );

  return matches
    .map((match) => {
      const prompt = match[2].trim().replace(/\n{3,}/g, "\n\n");
      const marksMatch = prompt.match(/(\d+\s*(?:marks?|pts?))/i);
      return {
        number: match[1],
        prompt: prompt.replace(/\((\d+\s*(?:marks?|pts?))\)/i, "").trim(),
        marks: marksMatch?.[1] || ""
      };
    })
    .filter((item) => item.prompt);
}

function sanitizeFileBaseName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "study-export";
}

// Escapes text for safe injection into raw HTML (used only in the PDF export
// template where React is not available). Uses native DOM APIs instead of
// a hand-rolled character escaper.
function escapeHtml(value: string): string {
  if (typeof document === "undefined") return value;
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(value));
  return div.innerHTML;
}
export function StudyWorkspace({
  sessions,
  initialSessionId,
  initialFiles,
  siteSettings,
  onboarding
}: {
  sessions: Session[];
  initialSessionId: string | null;
  initialFiles: FileItem[];
  siteSettings?: SiteSettings;
  onboarding?: OnboardingRecord | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const spotifyLoginHref = `/api/music/spotify/login?returnTo=${encodeURIComponent(pathname || "/studio")}`;
  const searchParams = useSearchParams();
  const workspaceGridRef = useRef<HTMLDivElement>(null);
  const workspaceScrollRef = useRef<HTMLDivElement>(null);
  const lastWorkspaceScrollYRef = useRef(0);
  const chatViewportRef = useRef<HTMLDivElement>(null);
  const quickImportInputRef = useRef<HTMLInputElement>(null);
  const planLaunchAttemptRef = useRef<string | null>(null);
  const defaultToolAppliedRef = useRef(false);
  const musicStateLoadedRef = useRef(false);
  const [sessionList, setSessionList] = useState<Session[]>(sessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId);
  const [filesBySession, setFilesBySession] = useState<Record<string, FileItem[]>>(() =>
    initialSessionId ? { [initialSessionId]: initialFiles } : {}
  );
  const [chat, setChat] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetchingFiles, setFetchingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeAction, setActiveAction] = useState<AIAction>("summary");
  const [toolDraft, setToolDraft] = useState<ToolDraft>(createToolDraft("summary"));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [showChatThreads, setShowChatThreads] = useState(false);
  const [chatHistoryReadySession, setChatHistoryReadySession] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState<"files" | "chat" | "tools">("chat");
  const [workspaceTab, setWorkspaceTab] = useState("home");
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceDynamicTab[]>([]);
  const [browseReloadKeys, setBrowseReloadKeys] = useState<Record<string, number>>({});
  const [browseHistory, setBrowseHistory] = useState<Record<string, string[]>>({});
  const [browseHistoryIndex, setBrowseHistoryIndex] = useState<Record<string, number>>({});
  const [browseUrlInputs, setBrowseUrlInputs] = useState<Record<string, string>>({});
  const [showTimerPopover, setShowTimerPopover] = useState(false);
  const [timerMode, setTimerMode] = useState<"regular" | "interval">("interval");
  const [timerMinutes, setTimerMinutes] = useState(60);
  const [breakEveryMinutes, setBreakEveryMinutes] = useState(20);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPhase, setTimerPhase] = useState<"focus" | "break" | "done">("focus");
  const [breakPopupOpen, setBreakPopupOpen] = useState(false);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [workspaceFullscreen, setWorkspaceFullscreen] = useState(false);
  const [screenAwarePulse, setScreenAwarePulse] = useState(false);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState("");
  const [workspaceSearchLoading, setWorkspaceSearchLoading] = useState(false);
  const [workspaceSearchError, setWorkspaceSearchError] = useState("");
  const [recentWebsites, setRecentWebsites] = useState<RecentWebsite[]>([]);
  const [splitWorkspaceTabId, setSplitWorkspaceTabId] = useState<string | null>(null);
  const [splitPickerOpen, setSplitPickerOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(50);
  const [splitDragTabId, setSplitDragTabId] = useState<string | null>(null);
  const [splitDropSide, setSplitDropSide] = useState<"left" | "right" | null>(null);
  const [canvasTool, setCanvasTool] = useState<CanvasTool>("mouse");
  const [canvasAnnotations, setCanvasAnnotations] = useState<CanvasAnnotation[]>([]);
  const [canvasStrokes, setCanvasStrokes] = useState<CanvasStroke[]>([]);
  const activeCanvasTabRef = useRef<string | null>(null);
  const [activeCanvasStroke, setActiveCanvasStroke] = useState<CanvasStroke | null>(null);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicPanelOpen, setMusicPanelOpen] = useState(false);
  const [musicSearch, setMusicSearch] = useState("");
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [revealedQuiz, setRevealedQuiz] = useState<Record<number, boolean>>({});
  const [selectedQuizOption, setSelectedQuizOption] = useState<Record<number, string>>({});
  const [quizResults, setQuizResults] = useState<Record<number, QuizResult>>({});
  const [revealedFlashcards, setRevealedFlashcards] = useState<Record<number, boolean>>({});
  const [examAnswers, setExamAnswers] = useState<Record<number, string>>({});
  const [toolCardIndex, setToolCardIndex] = useState(0);
  const [toolHistoryBySession, setToolHistoryBySession] = useState<Record<string, ToolHistoryItem[]>>({});
  const [metricsBySession, setMetricsBySession] = useState<Record<string, StudyMetrics>>({});
  const [restoredStudio, setRestoredStudio] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [rememberLastStudioPref, setRememberLastStudioPref] = useState(defaultUserPreferences.rememberLastStudio);
  const [accountLastStudioId, setAccountLastStudioId] = useState<string | null>(defaultUserPreferences.lastStudioId);
  const [preferredDefaultTool, setPreferredDefaultTool] = useState<AIAction>(defaultUserPreferences.defaultTool);
  const [showStudioBrowser, setShowStudioBrowser] = useState(false);
  const [studioBrowserRefreshing, setStudioBrowserRefreshing] = useState(false);
  const [copyingStudioId, setCopyingStudioId] = useState<string | null>(null);
  const [copiedSourceClipboard, setCopiedSourceClipboard] = useState<CopiedSourceClipboard | null>(null);
  const [renamingStudioId, setRenamingStudioId] = useState<string | null>(null);
  const [deletingStudioId, setDeletingStudioId] = useState<string | null>(null);
  const [toolModalOpen, setToolModalOpen] = useState(false);
  const [toolModalView, setToolModalView] = useState<"setup" | "result">("setup");
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [sourceModalMode, setSourceModalMode] = useState<"upload" | "web">("upload");
  const [sourceModalQuery, setSourceModalQuery] = useState("");
  const [sourceSearchEngine, setSourceSearchEngine] = useState<SourceSearchEngine>("scholar");
  const [sourceModalLoading, setSourceModalLoading] = useState(false);
  const [sourceModalError, setSourceModalError] = useState("");
  const [sourceSearchWarning, setSourceSearchWarning] = useState("");
  const [sourceResultFilter, setSourceResultFilter] = useState<"all" | "verified" | "scholar" | "open_web">("all");
  const [visibleSourceResults, setVisibleSourceResults] = useState(12);
  const [sourceModalReason, setSourceModalReason] = useState("Add a file or a verified web source to unlock chat and tools.");
  const [sourceSearchResults, setSourceSearchResults] = useState<WebSourceItem[]>([]);
  const [importingSourceId, setImportingSourceId] = useState<string | null>(null);
  const [sourcePromptedForStudio, setSourcePromptedForStudio] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [togglingFileId, setTogglingFileId] = useState<string | null>(null);
  const [desktopLayoutEnabled, setDesktopLayoutEnabled] = useState(false);
  const [desktopPanelWidths, setDesktopPanelWidths] = useState({
    left: desktopLeftPanelDefault,
    right: desktopRightPanelDefault
  });
  const [draggingDivider, setDraggingDivider] = useState<null | "left" | "right">(null);
  const [preview, setPreview] = useState<PreviewState>({
    open: false,
    loading: false,
    file: null,
    kind: "text",
    text: "",
    url: null,
    error: ""
  });
  const [, setDragDepth] = useState(0);

  const persistChatThreads = useCallback((sessionId: string, threads: ChatThread[]) => {
    try {
      localStorage.setItem(`${chatThreadsStoragePrefix}${sessionId}`, JSON.stringify(threads.slice(0, 12)));
    } catch {
      // Recent chat snapshots are helpful but should never block the tutor.
    }
  }, []);

  const snapshotCurrentChat = useCallback(() => {
    if (!activeSessionId || messages.length < 2) return;
    const title =
      messages.find((message) => message.role === "user")?.content.replace(/\s+/g, " ").trim().slice(0, 56) ||
      "Recent tutor chat";
    const thread: ChatThread = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      messages: messages.slice(-80),
      updatedAt: Date.now()
    };
    setChatThreads((current) => {
      const next = [thread, ...current.filter((item) => item.title !== title)].slice(0, 12);
      persistChatThreads(activeSessionId, next);
      return next;
    });
  }, [activeSessionId, messages, persistChatThreads]);

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      setChatThreads([]);
      setChatHistoryReadySession(null);
      return;
    }

    let ignore = false;
    setChatHistoryReadySession(null);
    try {
      const rawThreads = localStorage.getItem(`${chatThreadsStoragePrefix}${activeSessionId}`);
      const parsedThreads = rawThreads ? (JSON.parse(rawThreads) as ChatThread[]) : [];
      setChatThreads(
        Array.isArray(parsedThreads)
          ? parsedThreads
              .filter((thread) => thread?.id && Array.isArray(thread.messages))
              .slice(0, 12)
          : []
      );
    } catch {
      setChatThreads([]);
    }

    const loadChatHistory = async () => {
      try {
        const response = await fetch(`/api/chat-history?sessionId=${activeSessionId}`);
        const json = await readJsonResponse(response);
        if (ignore) return;

        if (response.ok && Array.isArray(json.messages)) {
          setMessages(
            json.messages
              .filter((message: ChatMessage) => message?.role && typeof message.content === "string")
              .map((message: ChatMessage) => ({ role: message.role, content: message.content }))
          );
        } else {
          setMessages([]);
        }
      } catch {
        if (!ignore) setMessages([]);
      } finally {
        if (!ignore) setChatHistoryReadySession(activeSessionId);
      }
    };

    void loadChatHistory();

    return () => {
      ignore = true;
    };
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId || chatHistoryReadySession !== activeSessionId) return;

    const timeoutId = window.setTimeout(() => {
      void fetch("/api/chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          messages: messages.slice(-80)
        })
      }).catch(() => {
        // Chat history should never block the tutor UI.
      });
    }, 650);

    return () => window.clearTimeout(timeoutId);
  }, [activeSessionId, chatHistoryReadySession, messages]);

  useEffect(() => {
    setSessionList(sessions);
  }, [sessions]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${recentWebsitesStoragePrefix}${activeSessionId || "global"}`);
      if (!stored) {
        setRecentWebsites([]);
        return;
      }
      const parsed = JSON.parse(stored) as RecentWebsite[];
      setRecentWebsites(Array.isArray(parsed) ? parsed.slice(0, maxRecentWebsites) : []);
    } catch {
      setRecentWebsites([]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    try {
      const savedLeft = Number(localStorage.getItem("scholarmind_workspace_left_width"));
      const savedRight = Number(localStorage.getItem("scholarmind_workspace_right_width"));
      const storedClipboard = localStorage.getItem(sourceClipboardStorageKey);

      setDesktopPanelWidths({
        left: Number.isFinite(savedLeft) && savedLeft > 0 ? savedLeft : desktopLeftPanelDefault,
        right: Number.isFinite(savedRight) && savedRight > 0 ? savedRight : desktopRightPanelDefault
      });
      if (storedClipboard) {
        const parsed = JSON.parse(storedClipboard) as CopiedSourceClipboard;
        if (parsed?.sourceSessionId && parsed?.sourceStudioTitle) {
          setCopiedSourceClipboard(parsed);
        }
      }
    } catch {
      setDesktopPanelWidths({
        left: desktopLeftPanelDefault,
        right: desktopRightPanelDefault
      });
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("scholarmind_workspace_left_width", String(Math.round(desktopPanelWidths.left)));
      localStorage.setItem("scholarmind_workspace_right_width", String(Math.round(desktopPanelWidths.right)));
      if (copiedSourceClipboard) {
        localStorage.setItem(sourceClipboardStorageKey, JSON.stringify(copiedSourceClipboard));
      } else {
        localStorage.removeItem(sourceClipboardStorageKey);
      }
    } catch {
      // Ignore storage issues.
    }
  }, [copiedSourceClipboard, desktopPanelWidths]);

  useEffect(() => {
    if (!initialSessionId) return;
    setFilesBySession((current) => ({ ...current, [initialSessionId]: initialFiles }));
  }, [initialFiles, initialSessionId]);

  useEffect(() => {
    let ignore = false;

    const loadPreferences = async () => {
      try {
        const response = await fetch("/api/preferences");
        const json = await readJsonResponse(response);
        if (!response.ok) {
          throw new Error(normalizeErrorMessage(json.error, "Unable to load your account preferences."));
        }
        if (ignore) return;

        const nextDefaultTool = actionButtons.some((item) => item.key === json.defaultTool)
          ? (json.defaultTool as AIAction)
          : defaultUserPreferences.defaultTool;

        setRememberLastStudioPref(json.rememberLastStudio ?? defaultUserPreferences.rememberLastStudio);
        setAccountLastStudioId(typeof json.lastStudioId === "string" ? json.lastStudioId : null);
        setPreferredDefaultTool(nextDefaultTool);

        try {
          localStorage.setItem("theme", json.theme === "light" ? "light" : "dark");
          localStorage.setItem("scholarmind_playful_motion", json.playfulMotion === false ? "off" : "on");
          localStorage.setItem("scholarmind_remember_last_studio", json.rememberLastStudio === false ? "off" : "on");
          localStorage.setItem("scholarmind_default_tool", nextDefaultTool);
          if (typeof json.lastStudioId === "string" && json.lastStudioId) {
            localStorage.setItem("scholarmind_last_studio", json.lastStudioId);
          }
        } catch {
          // Ignore local storage issues and keep the account-backed values in memory.
        }
      } catch {
        try {
          setRememberLastStudioPref(localStorage.getItem("scholarmind_remember_last_studio") !== "off");
          const storedTool = localStorage.getItem("scholarmind_default_tool") as AIAction | null;
          if (storedTool && actionButtons.some((item) => item.key === storedTool)) {
            setPreferredDefaultTool(storedTool);
          }
          const rememberedStudio = localStorage.getItem("scholarmind_last_studio");
          setAccountLastStudioId(rememberedStudio || null);
        } catch {
          // Browser storage can fail in private contexts. The in-memory defaults are enough.
        }
      } finally {
        if (!ignore) {
          setPreferencesReady(true);
        }
      }
    };

    void loadPreferences();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const preventWindowFileDrop = (event: DragEvent) => {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
    };

    window.addEventListener("dragover", preventWindowFileDrop);
    window.addEventListener("drop", preventWindowFileDrop);

    return () => {
      window.removeEventListener("dragover", preventWindowFileDrop);
      window.removeEventListener("drop", preventWindowFileDrop);
    };
  }, []);

  useEffect(() => {
    if (initialSessionId) {
      setActiveSessionId(initialSessionId);
      return;
    }

    if (!activeSessionId && sessionList[0]) {
      setActiveSessionId(sessionList[0].id);
    }
  }, [activeSessionId, initialSessionId, sessionList]);

  useEffect(() => {
    if (restoredStudio || !sessionList.length || !preferencesReady) return;

    if (pathname !== "/dashboard/workspace") {
      setRestoredStudio(true);
      return;
    }

    try {
      if (!rememberLastStudioPref) {
        setRestoredStudio(true);
        return;
      }

      const rememberedStudio = accountLastStudioId || localStorage.getItem("scholarmind_last_studio");
      if (rememberedStudio && sessionList.some((session) => session.id === rememberedStudio)) {
        setActiveSessionId(rememberedStudio);
      }
    } catch {
      // Ignore browser storage errors and keep the current default studio.
    } finally {
      setRestoredStudio(true);
    }
  }, [accountLastStudioId, pathname, preferencesReady, rememberLastStudioPref, restoredStudio, sessionList]);

  const currentFiles = useMemo(
    () => (activeSessionId ? filesBySession[activeSessionId] ?? [] : []),
    [activeSessionId, filesBySession]
  );
  const sourceEnabledFiles = useMemo(
    () => currentFiles.filter((file) => file.source_enabled !== false),
    [currentFiles]
  );
  const sourceEnabledCount = sourceEnabledFiles.length;
  const hasCurrentFiles = activeSessionId ? activeSessionId in filesBySession : false;
  const currentSession = sessionList.find((session) => session.id === activeSessionId) ?? null;
  const currentToolHistory = useMemo(
    () => (activeSessionId ? toolHistoryBySession[activeSessionId] ?? [] : []),
    [activeSessionId, toolHistoryBySession]
  );
  const currentMetrics = activeSessionId ? metricsBySession[activeSessionId] ?? createEmptyMetrics() : createEmptyMetrics();
  const currentFilesLabel = useMemo(() => {
    if (!sourceEnabledFiles.length) return "No source-enabled files yet";
    if (sourceEnabledFiles.length === 1) return sourceEnabledFiles[0].file_name;
    const preview = sourceEnabledFiles.slice(0, 2).map((file) => file.file_name).join(", ");
    return sourceEnabledFiles.length > 2 ? `${preview} +${sourceEnabledFiles.length - 2} more` : preview;
  }, [sourceEnabledFiles]);
  const toolsLocked = sourceEnabledCount === 0;

  const closeSourceModal = () => {
    setSourceModalOpen(false);
    setSourceModalError("");
    setSourceSearchWarning("");
    setSourceModalQuery("");
    setSourceSearchEngine("scholar");
  };

  const openSourceModal = (
    reason = "Add notes to unlock chat and tools.",
    _mode: "upload" | "web" = "upload"
  ) => {
    void _mode;
    setSourceModalReason(reason);
    setSourceModalMode("upload");
    setSourceModalError("");
    setVisibleSourceResults(12);
    setSourceResultFilter("all");
    setSourceModalOpen(true);
  };

  const parsedQuiz = useMemo(
    () =>
      activeAction === "quiz"
        ? normalizeQuizItems(parseJsonBlock<QuizItem[]>(output) ?? parseQuizFallback(output))
        : null,
    [activeAction, output]
  );
  const parsedFlashcards = useMemo(
    () =>
      activeAction === "flashcards"
        ? normalizeFlashcards(
            parseJsonBlock<FlashcardItem[]>(output) ??
              (parseFlashcards(output).length ? parseFlashcards(output).map((item) => ({ front: item.question, back: item.answer })) : parseFlashcardsFallback(output))
          )
        : null,
    [activeAction, output]
  );
  const parsedCards = useMemo(() => parseOutputCards(output, activeAction), [activeAction, output]);
  const filteredSourceResults = useMemo(() => {
    if (sourceResultFilter === "all") return sourceSearchResults;
    if (sourceResultFilter === "verified") {
      return sourceSearchResults.filter((result) => result.trustLabel === "Verified");
    }
    if (sourceResultFilter === "scholar") {
      return sourceSearchResults.filter((result) => result.trustLabel === "Scholar" || result.trustLabel === "Trusted");
    }
    return sourceSearchResults.filter((result) => result.trustLabel === "Web");
  }, [sourceResultFilter, sourceSearchResults]);
  const visibleSourceSearchResults = useMemo(
    () => filteredSourceResults.slice(0, visibleSourceResults),
    [filteredSourceResults, visibleSourceResults]
  );
  const quizResultRows = useMemo(
    () =>
      (parsedQuiz ?? []).map((item, index) => {
        const graded = quizResults[index];
        const selected = graded?.selected || selectedQuizOption[index] || "";
        const correct = graded?.correct || item.answer || "";
        const isCorrect = graded?.isCorrect ?? (selected && correct ? selected === correct : false);
        return {
          number: index + 1,
          question: item.question,
          selected,
          correct,
          isCorrect,
          explanation: graded?.explanation || item.explanation || ""
        };
      }),
    [parsedQuiz, quizResults, selectedQuizOption]
  );
  const parsedExamQuestions = useMemo(
    () => (activeAction === "exam" ? parseExamQuestions(output) : []),
    [activeAction, output]
  );
  const parsedSchedule = useMemo(
    () => (activeAction === "study_plan" ? parseRevisionSchedule(output) : []),
    [activeAction, output]
  );
  const effectiveSiteSettings = siteSettings ?? {
    aiDailyLimit: defaultFreePreviewDailyLimit,
    aiHourlyLimit: 8,
    examWeeklyLimit: defaultExamGeneratorWeeklyLimit,
    researchModeLocked: true,
    maintenanceMessage: ""
  };
  const desktopGridStyle = useMemo(
    () =>
      desktopLayoutEnabled
        ? {
            gridTemplateColumns: `minmax(0,1fr) ${desktopResizeHandleWidth}px ${desktopPanelWidths.right}px`
          }
        : undefined,
    [desktopLayoutEnabled, desktopPanelWidths.right]
  );
  const timerDisplay = useMemo(() => {
    const minutes = Math.floor(timerRemaining / 60);
    const seconds = timerRemaining % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [timerRemaining]);
  const selectedTrack = focusTracks[selectedTrackIndex] ?? null;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(focusMusicStateStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { playing?: boolean; trackIndex?: number };
        if (typeof parsed.playing === "boolean") setMusicPlaying(parsed.playing);
        if (typeof parsed.trackIndex === "number" && focusTracks.length) {
          setSelectedTrackIndex(Math.max(0, Math.min(focusTracks.length - 1, parsed.trackIndex)));
        }
      }
    } catch {
      // Music state is optional, so a bad localStorage value should not break Studio.
    } finally {
      musicStateLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!musicStateLoadedRef.current) return;
    const state = {
      playing: musicPlaying,
      trackIndex: selectedTrackIndex,
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem(focusMusicStateStorageKey, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent("scholarmind:music-state", { detail: state }));
    } catch {
      // Ignore private browsing/storage failures.
    }
  }, [musicPlaying, selectedTrackIndex]);

  useEffect(() => {
    void fetch("/api/music/spotify/status")
      .then((response) => response.json())
      .then((json) => setSpotifyConnected(Boolean(json.connected)))
      .catch(() => setSpotifyConnected(false));
  }, []);

  useEffect(() => {
    const musicStatus = searchParams.get("music");
    if (!musicStatus) return;

    if (musicStatus === "spotify_connected") {
      setSpotifyConnected(true);
      setMusicPanelOpen(true);
      setStatusNote("Spotify connected. Browse your playlists or search for tracks in the music panel.");
    } else if (musicStatus === "spotify_not_connected") {
      setStatusNote("Spotify could not be connected. Check your redirect URL and try again.");
    } else if (musicStatus === "spotify_setup_required") {
      setStatusNote("Spotify is not configured on this deployment yet.");
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("music");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const activeWorkspaceDynamicTab = useMemo(
    () => workspaceTabs.find((item) => item.id === workspaceTab) ?? null,
    [workspaceTab, workspaceTabs]
  );
  const splitWorkspaceTab = useMemo(
    () => workspaceTabs.find((item) => item.id === splitWorkspaceTabId) ?? null,
    [splitWorkspaceTabId, workspaceTabs]
  );
  const updateMetrics = useCallback(
    (updater: (current: StudyMetrics) => StudyMetrics) => {
      if (!activeSessionId) return;

      setMetricsBySession((current) => {
        const base = current[activeSessionId] ?? createEmptyMetrics();
        return {
          ...current,
          [activeSessionId]: updater(base)
        };
      });
    },
    [activeSessionId]
  );

  const downloadBlob = useCallback((blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 400);
  }, []);

  const exportPayload = useCallback(() => {
    const base = {
      studio: currentSession?.title || "Study studio",
      action: activeAction,
      generatedAt: new Date().toISOString(),
      sourceCount: sourceEnabledFiles.length,
      sources: sourceEnabledFiles.map((file) => ({
        id: file.id,
        name: file.file_name,
        type: file.file_type
      }))
    };

    if (activeAction === "quiz" && parsedQuiz?.length) {
      return {
        ...base,
        items: parsedQuiz,
        results: quizResultRows
      };
    }

    if (activeAction === "flashcards" && parsedFlashcards?.length) {
      return {
        ...base,
        cards: parsedFlashcards
      };
    }

    if (activeAction === "exam" && parsedExamQuestions.length) {
      return {
        ...base,
        questions: parsedExamQuestions.map((question, index) => ({
          ...question,
          answer: examAnswers[index] || ""
        })),
        markdown: output
      };
    }

    if (activeAction === "study_plan" && parsedSchedule.length) {
      return {
        ...base,
        schedule: parsedSchedule,
        markdown: output
      };
    }

    return {
      ...base,
      cards: parsedCards,
      markdown: output
    };
  }, [activeAction, currentSession?.title, examAnswers, output, parsedCards, parsedExamQuestions, parsedFlashcards, parsedQuiz, parsedSchedule, quizResultRows, sourceEnabledFiles]);

  const exportCurrentResultAsJson = useCallback(() => {
    if (!output) {
      setStatusNote("Generate a study result first, then export it.");
      return;
    }

    const fileName = `${sanitizeFileBaseName(`${currentSession?.title || "studio"}-${activeAction}`)}.json`;
    downloadBlob(new Blob([JSON.stringify(exportPayload(), null, 2)], { type: "application/json" }), fileName);
    setStatusNote("JSON export downloaded.");
  }, [activeAction, currentSession?.title, downloadBlob, exportPayload, output]);

  const exportCurrentResultAsPdf = useCallback(() => {
    if (!output) {
      setStatusNote("Generate a study result first, then export it.");
      return;
    }

    const printableWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
    if (!printableWindow) {
      setStatusNote("Allow popups for this site to export as PDF.");
      return;
    }

    const quizTable =
      activeAction === "quiz" && quizResultRows.length
        ? `
          <h2>Quiz Results</h2>
          <table>
            <thead>
              <tr><th>#</th><th>Question</th><th>Your answer</th><th>Correct answer</th><th>Result</th></tr>
            </thead>
            <tbody>
              ${quizResultRows
                .map(
                  (row) =>
                    `<tr><td>${row.number}</td><td>${escapeHtml(row.question)}</td><td>${escapeHtml(
                      row.selected || "—"
                    )}</td><td>${escapeHtml(row.correct || "—")}</td><td>${row.isCorrect ? "Correct" : row.selected ? "Review" : "Pending"}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
        `
        : "";

    const examAnswerSheet =
      activeAction === "exam" && parsedExamQuestions.length
        ? `
          <h2>Online Answer Sheet</h2>
          ${parsedExamQuestions
            .map(
              (question, index) => `
                <section style="margin-bottom: 18px;">
                  <h3 style="margin-bottom: 6px;">Question ${escapeHtml(question.number)}${question.marks ? ` (${escapeHtml(question.marks)})` : ""}</h3>
                  <p>${escapeHtml(question.prompt)}</p>
                  <div style="margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 14px; padding: 12px; min-height: 96px;">
                    ${escapeHtml(examAnswers[index] || "No online answer added yet.")}
                  </div>
                </section>
              `
            )
            .join("")}
        `
        : "";

    printableWindow.document.write(`<!doctype html>
      <html>
        <head>
          <title>${escapeHtml(currentSession?.title || "ScholarMind Export")}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 32px; color: #0f172a; line-height: 1.6; }
            h1, h2 { margin: 0 0 12px; }
            .meta { color: #475569; margin-bottom: 24px; }
            pre { white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; vertical-align: top; }
            th { background: #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(actionButtons.find((item) => item.key === activeAction)?.label || "Study export")}</h1>
          <p class="meta">${escapeHtml(currentSession?.title || "Study studio")} • ${sourceEnabledCount} source-enabled file(s)</p>
          ${quizTable}
          ${examAnswerSheet}
          <pre>${escapeHtml(output)}</pre>
          <script>window.onload = function(){ window.print(); };</script>
        </body>
      </html>`);
    printableWindow.document.close();
    setStatusNote("PDF export opened in a print window.");
  }, [activeAction, currentSession?.title, examAnswers, output, parsedExamQuestions, quizResultRows, sourceEnabledCount]);

  const upsertWorkspaceTab = useCallback((nextTab: WorkspaceDynamicTab) => {
    setWorkspaceTabs((current) => {
      const existingIndex = current.findIndex((item) => item.id === nextTab.id);
      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = nextTab;
        return next;
      }
      return [...current, nextTab].slice(-16);
    });
    setWorkspaceTab(nextTab.id);
    if (
      nextTab.kind === "output" ||
      nextTab.kind === "canvas-output" ||
      nextTab.kind === "browse" ||
      nextTab.kind === "canvas-browse" ||
      nextTab.kind === "canvas-source"
    ) {
      setTab("tools");
    } else {
      setTab("chat");
    }
  }, []);

  const recordRecentWebsite = useCallback(
    (url: string, label: string) => {
      setRecentWebsites((current) => {
        const next = [{ url, label, visitedAt: Date.now() }, ...current.filter((item) => item.url !== url)].slice(
          0,
          maxRecentWebsites
        );
        try {
          localStorage.setItem(
            `${recentWebsitesStoragePrefix}${activeSessionId || "global"}`,
            JSON.stringify(next)
          );
        } catch {
          // Ignore storage failures.
        }
        return next;
      });
    },
    [activeSessionId]
  );

  const openBrowseInWorkspace = useCallback(
    (url: string, label: string) => {
      recordRecentWebsite(url, label);
      const tabId = `browse-${Date.now()}`;
      upsertWorkspaceTab({
        id: tabId,
        label: clipText(label, 24),
        kind: "browse",
        url,
        closable: true
      });
      setBrowseHistory((current) => ({ ...current, [tabId]: [url] }));
      setBrowseHistoryIndex((current) => ({ ...current, [tabId]: 0 }));
      setBrowseUrlInputs((current) => ({ ...current, [tabId]: url }));
    },
    [recordRecentWebsite, upsertWorkspaceTab]
  );

  const closeWorkspaceTab = useCallback((tabId: string) => {
    setWorkspaceTabs((current) => current.filter((item) => item.id !== tabId));
    setWorkspaceTab((current) => (current === tabId ? "home" : current));
    setSplitWorkspaceTabId((current) => (current === tabId ? null : current));
  }, []);

  const openDraggedWorkspaceSplit = useCallback(
    (draggedTabId: string, side: "left" | "right") => {
      const draggedTab = workspaceTabs.find((item) => item.id === draggedTabId);
      if (!draggedTab) return;

      const currentDynamicTab = workspaceTabs.find((item) => item.id === workspaceTab && item.id !== draggedTabId);
      const fallbackPartner = workspaceTabs.find((item) => item.id !== draggedTabId);
      const partnerTab = currentDynamicTab ?? fallbackPartner;

      if (!partnerTab) {
        setWorkspaceTab(draggedTabId);
        setSplitWorkspaceTabId(null);
        setStatusNote("Open another note, search result, or AI output before using split view.");
        return;
      }

      if (side === "left") {
        setWorkspaceTab(draggedTabId);
        setSplitWorkspaceTabId(partnerTab.id);
      } else {
        setWorkspaceTab(partnerTab.id);
        setSplitWorkspaceTabId(draggedTabId);
      }

      setSplitPickerOpen(false);
      setSplitDragTabId(null);
      setSplitDropSide(null);
      setStatusNote(`${draggedTab.label} opened in split view. Drag another tab to either side to rearrange.`);
    },
    [workspaceTab, workspaceTabs]
  );

  const restoreChatThread = useCallback((thread: ChatThread) => {
    snapshotCurrentChat();
    setMessages(thread.messages);
    setChat("");
    setShowChatThreads(false);
    setTab("tools");
    setStatusNote(`Restored chat: ${thread.title}`);
  }, [snapshotCurrentChat]);

  const deleteChatThread = useCallback((threadId: string) => {
    if (!activeSessionId) return;
    setChatThreads((current) => {
      const next = current.filter((thread) => thread.id !== threadId);
      persistChatThreads(activeSessionId, next);
      return next;
    });
  }, [activeSessionId, persistChatThreads]);

  const startNewChat = useCallback(() => {
    snapshotCurrentChat();
    setMessages([]);
    setChat("");
    setShowChatThreads(false);
    setStatusNote("Started a new tutor chat. Recent chats are saved in this studio.");
  }, [snapshotCurrentChat]);

  const openCurrentResultInCanvas = useCallback(() => {
    if (!output) {
      setStatusNote("Generate or reopen an output before opening canvas mode.");
      return;
    }

    const label = actionButtons.find((item) => item.key === activeAction)?.label || "AI Output";
    upsertWorkspaceTab({
      id: `canvas-output-${activeAction}`,
      label: label,
      kind: "canvas-output",
      action: activeAction,
      output,
      closable: true
    });
  }, [activeAction, output, upsertWorkspaceTab]);

  const openCurrentResultInWorkspaceTab = useCallback(() => {
    if (!output) {
      setStatusNote("Generate or reopen an output before opening a workspace tab.");
      return;
    }

    const label = actionButtons.find((item) => item.key === activeAction)?.label || "AI Output";
    upsertWorkspaceTab({
      id: `output-${activeAction}`,
      label,
      kind: "output",
      action: activeAction,
      output,
      closable: true
    });
  }, [activeAction, output, upsertWorkspaceTab]);

  const openGeneratedResultInWorkspaceTab = useCallback(
    (action: AIAction, generatedOutput: string, focus = "") => {
      const label = actionButtons.find((item) => item.key === action)?.label || "AI Output";
      const focusLabel = focus.trim();
      upsertWorkspaceTab({
        id: `output-${action}-${Date.now()}`,
        label: focusLabel ? `${label}: ${clipText(focusLabel, 24)}` : label,
        kind: "output",
        action,
        output: generatedOutput,
        closable: true
      });
    },
    [upsertWorkspaceTab]
  );

  const openFileInCanvas = useCallback(
    async (file: FileItem) => {
      try {
        const response = await fetch(`/api/files/preview?fileId=${file.id}`);
        const json = await readJsonResponse(response);
        const kind = (json.kind || resolvePreviewKind(file.file_name, file.file_type, file.storage_path)) as "text" | "table" | "pdf" | "image";
        upsertWorkspaceTab({
          id: `canvas-source-${file.id}`,
          label: clipText(file.file_name, 28),
          kind: "canvas-source",
          file,
          previewKind: kind,
          text: json.text || file.extracted_text || "",
          url: json.url || null,
          closable: true
        });
        setWorkspaceTab(`canvas-source-${file.id}`);
        setTab("tools");
      } catch {
        upsertWorkspaceTab({
          id: `canvas-source-${file.id}`,
          label: clipText(file.file_name, 28),
          kind: "canvas-source",
          file,
          previewKind: "text",
          text: file.extracted_text || "Preview text is not available for this file.",
          url: null,
          closable: true
        });
      }
    },
    [upsertWorkspaceTab]
  );

  const openFileInWorkspaceTab = useCallback(
    async (file: FileItem) => {
      if (file.file_type === "text/web") {
        const webUrl = extractWebUrlFromSourceText(file.extracted_text || "");
        if (webUrl) {
          openBrowseInWorkspace(webUrl, file.file_name);
          return;
        }
      }

      await openFileInCanvas(file);
    },
    [openBrowseInWorkspace, openFileInCanvas]
  );

  const addCanvasAnnotation = useCallback(
    (
      tabId: string,
      tool: Exclude<CanvasTool, "mouse">,
      point?: { x: number; y: number },
      initialText?: string
    ) => {
    const placement = point ?? { x: 18, y: 18 };
    setCanvasAnnotations((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        tabId,
        tool,
        text:
          initialText?.trim() ||
          (tool === "highlight" ? "Highlight this section" : "Type your note here"),
        x: placement.x,
        y: placement.y,
        width: tool === "highlight" ? 220 : 180,
        height: tool === "highlight" ? 72 : 96,
        createdAt: Date.now()
      },
      ...current
    ]);
    setStatusNote("Text box added. Drag it anywhere on the canvas and resize from the corner.");
  }, []);

  const getCanvasPointerPoint = useCallback((event: ReactPointerEvent<HTMLDivElement>): CanvasPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
      pressure: event.pressure && event.pressure > 0 ? event.pressure : 0.5
    };
  }, []);

  const eraseStrokesNear = useCallback((tabId: string, point: CanvasPoint) => {
    const radius = 24;
    setCanvasStrokes((current) =>
      current.filter((stroke) => {
        if (stroke.tabId !== tabId) return true;
        return !stroke.points.some((p) => Math.hypot(p.x - point.x, p.y - point.y) <= radius);
      })
    );
  }, []);

  const beginCanvasStroke = useCallback(
    (tabId: string, event: ReactPointerEvent<HTMLDivElement>) => {
      activeCanvasTabRef.current = tabId;

      if (canvasTool === "eraser") {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        eraseStrokesNear(tabId, getCanvasPointerPoint(event));
        return;
      }

      if (canvasTool !== "draw" && canvasTool !== "highlight") return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const point = getCanvasPointerPoint(event);
      setActiveCanvasStroke({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        tabId,
        tool: canvasTool,
        color: canvasTool === "highlight" ? "rgba(255, 226, 105, 0.42)" : "rgba(105, 232, 238, 0.95)",
        width: canvasTool === "highlight" ? 18 : 4,
        points: [point],
        createdAt: Date.now()
      });
    },
    [canvasTool, eraseStrokesNear, getCanvasPointerPoint]
  );

  const moveCanvasStroke = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (canvasTool === "eraser") return;

      if (!activeCanvasStroke) return;
      event.preventDefault();
      const point = getCanvasPointerPoint(event);
      setActiveCanvasStroke((current) =>
        current
          ? {
              ...current,
              points: [...current.points, point]
            }
          : current
      );
    },
    [activeCanvasStroke, canvasTool, eraseStrokesNear, getCanvasPointerPoint]
  );

  const finishCanvasStroke = useCallback(() => {
    if (canvasTool === "eraser") {
      activeCanvasTabRef.current = null;
      return;
    }

    setActiveCanvasStroke((current) => {
      if (!current || current.points.length < 2) return null;
      setCanvasStrokes((strokes) => [current, ...strokes].slice(0, 120));
      setStatusNote("Canvas drawing saved. Stylus, Apple Pencil, and S-Pen strokes are visible to your study context.");
      return null;
    });
  }, [canvasTool]);

  const strokePath = useCallback((points: CanvasPoint[]) => {
    if (!points.length) return "";
    return points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(" ");
  }, []);

  const buildScreenContext = useCallback(() => {
    const openResultLabel = output
      ? `${actionButtons.find((item) => item.key === activeAction)?.label || activeAction}: ${clipText(
          cleanGeneratedText(output).replace(/\s+/g, " "),
          900
        )}`
      : "No generated output open.";
    const previewContext = preview.open
      ? `Open source preview: ${preview.file?.file_name || "source"} (${preview.kind}). ${clipText(
          preview.text.replace(/\s+/g, " "),
          700
        )}`
      : "No source preview modal open.";
    const openTabsSummary = workspaceTabs
      .map((tab) => {
        const parts = [`${tab.label} (${tab.kind})`];
        if (tab.url) parts.push(`url=${tab.url}`);
        if (tab.query) parts.push(`search=${tab.query}`);
        if (tab.action) parts.push(`tool=${tab.action}`);
        if (tab.file?.file_name) parts.push(`file=${tab.file.file_name}`);
        return parts.join(" | ");
      })
      .slice(0, 10)
      .join(" || ");
    const activeTab = workspaceTabs.find((item) => item.id === workspaceTab);
    const annotationSummary = canvasAnnotations
      .slice(0, 16)
      .map(
        (annotation) =>
          `[${annotation.tabId}] ${annotation.tool} at (${annotation.x.toFixed(0)}%, ${annotation.y.toFixed(0)}%): "${clipText(annotation.text, 160)}"`
      )
      .join(" | ");
    const strokeSummary = canvasStrokes
      .slice(0, 16)
      .map(
        (stroke) =>
          `[${stroke.tabId}] ${stroke.tool} stroke with ${stroke.points.length} points, color ${stroke.color}, width ${stroke.width}`
      )
      .join(" | ");
    const activeTabDetail = workspaceTabs.find((item) => item.id === workspaceTab);
    const activeTabPreview = activeTabDetail
      ? [
          activeTabDetail.url ? `Live page: ${activeTabDetail.url}` : "",
          activeTabDetail.file?.file_name ? `File: ${activeTabDetail.file.file_name}` : "",
          activeTabDetail.previewKind ? `Preview mode: ${activeTabDetail.previewKind}` : "",
          activeTabDetail.text ? `Visible text preview: ${clipText(activeTabDetail.text.replace(/\s+/g, " "), 1200)}` : "",
          activeTabDetail.output
            ? `Visible generated output: ${clipText(cleanGeneratedText(activeTabDetail.output).replace(/\s+/g, " "), 900)}`
            : ""
        ]
          .filter(Boolean)
          .join("\n")
      : "";
    const activeTabAnnotations = canvasAnnotations
      .filter((annotation) => annotation.tabId === workspaceTab)
      .map((annotation) => `${annotation.tool}: "${clipText(annotation.text, 140)}"`)
      .join(" | ");
    const activeTabStrokes = canvasStrokes.filter((stroke) => stroke.tabId === workspaceTab).length;

    return [
      `Active workspace tab: ${activeTab?.label || workspaceTab}.`,
      activeTabPreview ? `What the student is viewing now:\n${activeTabPreview}` : "",
      activeTabAnnotations ? `Annotations on the active tab: ${activeTabAnnotations}.` : "",
      activeTabStrokes ? `Freehand marks on the active tab: ${activeTabStrokes} stroke(s).` : "",
      `Active canvas tool: ${canvasTool}.`,
      currentSession?.title ? `Current studio: ${currentSession.title}.` : "",
      openTabsSummary ? `Open workspace tabs: ${openTabsSummary}.` : "No extra workspace tabs open.",
      `Source-enabled files in view: ${currentFilesLabel}.`,
      `Selected tool: ${actionButtons.find((item) => item.key === activeAction)?.label || activeAction}.`,
      openResultLabel,
      previewContext,
      annotationSummary ? `Canvas annotations across tabs: ${annotationSummary}.` : "",
      strokeSummary ? `Canvas drawings across tabs: ${strokeSummary}.` : "",
      currentToolHistory.length
        ? `Recent generated outputs: ${currentToolHistory
            .slice(0, 4)
            .map((item) => `${item.label}: ${item.title}`)
            .join(" | ")}.`
        : ""
    ]
      .filter(Boolean)
      .join("\n");
  }, [
    activeAction,
    canvasAnnotations,
    canvasStrokes,
    canvasTool,
    currentFilesLabel,
    currentSession?.title,
    currentToolHistory,
    output,
    preview.file?.file_name,
    preview.kind,
    preview.open,
    preview.text,
    workspaceTab,
    workspaceTabs
  ]);

  useEffect(() => {
    setRevealedQuiz({});
    setSelectedQuizOption({});
    setQuizResults({});
    setRevealedFlashcards({});
    setExamAnswers({});
    setToolCardIndex(0);
  }, [activeAction, output]);

  useEffect(() => {
    setMessages([]);
    setOutput("");
    setChat("");
    setChatLoading(false);
    setToolModalOpen(false);
    setToolModalView("setup");
    setStatusNote("");
    closePreview();
  }, [activeSessionId]);

  useEffect(() => {
    if (sourceEnabledCount) {
      setSourceModalOpen(false);
      setSourceModalError("");
    }
  }, [sourceEnabledCount]);

  useEffect(() => {
    if (!activeSessionId || sourceEnabledCount || sourcePromptedForStudio === activeSessionId) return;

    const timeoutId = window.setTimeout(() => {
      openSourceModal("Upload a source or import a web source before you start chatting or generating tools.");
      setSourcePromptedForStudio(activeSessionId);
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [activeSessionId, sourceEnabledCount, sourcePromptedForStudio]);

  useEffect(() => {
    const tab = workspaceTabs.find((item) => item.id === workspaceTab);
    if (!tab || !(tab.kind === "output" || tab.kind === "canvas-output") || !tab.output) return;
    if (tab.action) setActiveAction(tab.action);
    setOutput(tab.output);
  }, [workspaceTab, workspaceTabs]);

  useEffect(() => {
    if (!preferencesReady || defaultToolAppliedRef.current) return;
    if (actionButtons.some((item) => item.key === preferredDefaultTool)) {
      setActiveAction(preferredDefaultTool);
      setToolDraft(createToolDraft(preferredDefaultTool));
    }
    defaultToolAppliedRef.current = true;
  }, [preferencesReady, preferredDefaultTool]);

  useEffect(() => {
    if (!preferencesReady) return;

    try {
      localStorage.setItem("scholarmind_remember_last_studio", rememberLastStudioPref ? "on" : "off");
      localStorage.setItem("scholarmind_default_tool", preferredDefaultTool);
      if (!rememberLastStudioPref) {
        localStorage.removeItem("scholarmind_last_studio");
      }
    } catch {
      return;
    }
  }, [preferencesReady, preferredDefaultTool, rememberLastStudioPref]);

  useEffect(() => {
    if (!activeSessionId || !preferencesReady || !rememberLastStudioPref) return;

    try {
      localStorage.setItem("scholarmind_last_studio", activeSessionId);
    } catch {
      // Ignore browser storage failures.
    }

    const timeoutId = window.setTimeout(() => {
      void fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastStudioId: activeSessionId })
      });
    }, 160);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeSessionId, preferencesReady, rememberLastStudioPref]);

  useEffect(() => {
    if (!activeSessionId || hasCurrentFiles) return;

    let ignore = false;

    const fetchFiles = async () => {
      setFetchingFiles(true);

      try {
        const response = await fetch(`/api/sessions?sessionId=${activeSessionId}`);
        const json = await readJsonResponse(response);
        if (!response.ok) {
          throw new Error(normalizeErrorMessage(json.error, "Unable to load files for this studio."));
        }
        if (ignore) return;

        setFilesBySession((current) => ({
          ...current,
          [activeSessionId]: json.files ?? []
        }));
      } catch (error) {
        if (!ignore) {
          setStatusNote(formatSupabaseSetupError((error as Error).message || "Unable to load files for this studio."));
        }
      } finally {
        if (!ignore) setFetchingFiles(false);
      }
    };

    fetchFiles();

    return () => {
      ignore = true;
    };
  }, [activeSessionId, hasCurrentFiles]);

  useEffect(() => {
    const viewport = chatViewportRef.current;
    if (!viewport) return;

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: messages.length > 1 ? "smooth" : "auto"
    });
  }, [chatLoading, messages]);

  useEffect(() => {
    const container = workspaceScrollRef.current;
    if (!container) return;

    const onScroll = () => {
      const y = container.scrollTop;
      const atBottom = y + container.clientHeight >= container.scrollHeight - 100;

      if (y < lastWorkspaceScrollYRef.current - 12) {
        setMusicPanelOpen(false);
      }

      lastWorkspaceScrollYRef.current = y;
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  const playSoftPing = useCallback((kind: "break" | "focus" | "done" = "focus") => {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const audio = new AudioContextClass();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = kind === "done" ? 740 : kind === "break" ? 520 : 620;
      gain.gain.setValueAtTime(0.001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.13, audio.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + (kind === "done" ? 0.45 : 0.22));
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + (kind === "done" ? 0.5 : 0.25));
      window.setTimeout(() => audio.close(), 650);
    } catch {
      // Browser audio can be blocked; the visual timer still works.
    }
  }, []);

  const startStudyTimer = useCallback(
    (minutes = timerMinutes) => {
      const safeMinutes = Math.max(1, Math.min(240, minutes));
      setTimerMinutes(safeMinutes);
      setBreakEveryMinutes((current) => Math.max(1, Math.min(current, safeMinutes)));
      setBreakMinutes((current) => Math.max(1, Math.min(current, Math.max(1, Math.min(breakEveryMinutes, safeMinutes)))));
      setTimerRemaining(safeMinutes * 60);
      setTimerPhase("focus");
      setTimerRunning(true);
      setBreakPopupOpen(false);
      setStatusNote(`Study timer started for ${safeMinutes} minute(s).`);
    },
    [breakEveryMinutes, timerMinutes]
  );

  useEffect(() => {
    if (!timerRunning || timerRemaining <= 0) return;

    const intervalId = window.setInterval(() => {
      setTimerRemaining((current) => {
        if (current <= 1) {
          setTimerRunning(false);
          setTimerPhase("done");
          setBreakPopupOpen(false);
          playSoftPing("done");
          setStatusNote("Study timer complete.");
          return 0;
        }

        const next = current - 1;
        if (timerMode === "regular") {
          return next;
        }

        const elapsed = timerMinutes * 60 - next;
        const focusBlock = Math.max(1, breakEveryMinutes) * 60;
        const breakBlock = Math.max(1, breakMinutes) * 60;
        const cycle = focusBlock + breakBlock;
        const cyclePosition = elapsed % cycle;
        const nextPhase = cyclePosition >= focusBlock ? "break" : "focus";

        setTimerPhase((currentPhase) => {
          if (currentPhase !== nextPhase) {
            playSoftPing(nextPhase === "break" ? "break" : "focus");
            if (nextPhase === "break") {
              setBreakPopupOpen(true);
            }
          }
          return nextPhase;
        });

        return next;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [breakEveryMinutes, breakMinutes, playSoftPing, timerMinutes, timerMode, timerRemaining, timerRunning]);

  useEffect(() => {
    const syncDesktopLayout = () => {
      const enabled = window.innerWidth >= 1024;
      setDesktopLayoutEnabled(enabled);

      const container = workspaceGridRef.current;
      if (!enabled || !container) return;

      const availableWidth = container.getBoundingClientRect().width - desktopResizeHandleWidth;
      if (availableWidth <= desktopCenterPanelMin) return;

      setDesktopPanelWidths((current) => {
        const maxRight = Math.min(
          desktopRightPanelMax,
          availableWidth - desktopCenterPanelMin
        );
        const nextRight = Math.min(
          Math.max(current.right, desktopRightPanelMin),
          Math.max(desktopRightPanelMin, maxRight)
        );

        return current.right === nextRight
          ? current
          : { ...current, right: nextRight };
      });
    };

    syncDesktopLayout();
    window.addEventListener("resize", syncDesktopLayout);
    return () => window.removeEventListener("resize", syncDesktopLayout);
  }, []);

  useEffect(() => {
    if (!draggingDivider) return;

    const onMouseMove = (event: MouseEvent) => {
      const container = workspaceGridRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const availableWidth = rect.width - desktopResizeHandleWidth;
      if (availableWidth <= desktopCenterPanelMin) return;

      setDesktopPanelWidths((current) => {
        if (draggingDivider === "left") {
          const maxLeft = Math.min(
            desktopLeftPanelMax,
            availableWidth - current.right - desktopCenterPanelMin
          );
          const nextLeft = Math.min(
            Math.max(event.clientX - rect.left, desktopLeftPanelMin),
            Math.max(desktopLeftPanelMin, maxLeft)
          );

          return {
            ...current,
            left: nextLeft
          };
        }

        const distanceFromRight = rect.right - event.clientX;
        const maxRight = Math.min(
          desktopRightPanelMax,
          availableWidth - desktopCenterPanelMin
        );
        const nextRight = Math.min(
          Math.max(distanceFromRight, desktopRightPanelMin),
          Math.max(desktopRightPanelMin, maxRight)
        );

        return {
          ...current,
          right: nextRight
        };
      });
    };

    const onMouseUp = () => {
      setDraggingDivider(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [draggingDivider]);

  const buildContextForPrompt = useCallback(
    (hint: string, action: AIAction) => {
      const sourceContext = buildStudyContext(sourceEnabledFiles, hint, {
        maxCharacters:
          action === "notes"
            ? 18000
            : action === "exam"
              ? 14000
              : action === "quiz" || action === "flashcards"
                ? 7500
                : 6500,
        maxChunks:
          action === "notes" ? 20 : action === "exam" ? 14 : action === "quiz" || action === "flashcards" ? 10 : 7
      });
      const profile = onboardingSummary(onboarding);

      return [profile ? `Student profile:\n${profile}` : "", sourceContext].filter(Boolean).join("\n\n");
    },
    [onboarding, sourceEnabledFiles]
  );

  const saveToolResult = useCallback(
    (action: AIAction, text: string, focus: string) => {
      if (!activeSessionId) return;

      const actionLabel = actionButtons.find((item) => item.key === action)?.label || "Tool";
      const focusLabel = focus.trim();
      const result: ToolHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        action,
        title: focusLabel ? `${actionLabel}: ${clipText(focusLabel, 44)}` : actionLabel,
        label: actionLabel,
        preview: summarizeGeneratedOutput(text),
        output: text,
        createdAt: Date.now()
      };

      setToolHistoryBySession((current) => ({
        ...current,
        [activeSessionId]: [result, ...(current[activeSessionId] ?? [])].slice(0, 12)
      }));
    },
    [activeSessionId]
  );

  const openSavedToolResult = useCallback((result: ToolHistoryItem) => {
    setActiveAction(result.action);
    setToolDraft(createToolDraft(result.action));
    setOutput(result.output);
    setToolCardIndex(0);
    setTab("tools");
    upsertWorkspaceTab({
      id: `saved-output-${result.id}`,
      label: result.label,
      kind: "output",
      action: result.action,
      output: result.output,
      closable: true
    });
  }, [upsertWorkspaceTab]);

  const toolResultCount =
    activeAction === "quiz"
      ? parsedQuiz?.length ?? 0
      : activeAction === "flashcards"
        ? parsedFlashcards?.length ?? 0
        : parsedCards.length;

  const shiftToolCard = useCallback(
    (step: number) => {
      if (!toolResultCount) {
        setToolCardIndex(0);
        return;
      }

      setToolCardIndex((current) => (current + step + toolResultCount) % toolResultCount);
    },
    [toolResultCount]
  );

  useEffect(() => {
    if (!toolModalOpen || toolModalView !== "result") return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        shiftToolCard(1);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        shiftToolCard(-1);
        return;
      }

      if (activeAction === "flashcards" && event.code === "Space") {
        event.preventDefault();
        setRevealedFlashcards((current) => {
          if (!current[toolCardIndex]) {
            updateMetrics((metrics) => ({
              ...metrics,
              flashcardsFlipped: metrics.flashcardsFlipped + 1
            }));
            return { ...current, [toolCardIndex]: true };
          }

          shiftToolCard(1);
          return current;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeAction, shiftToolCard, toolCardIndex, toolModalOpen, toolModalView, updateMetrics]);

  const refreshStudios = async () => {
    setStudioBrowserRefreshing(true);

    try {
      const response = await fetch("/api/sessions");
      const json = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to refresh the studio list."));
      }

      setSessionList(Array.isArray(json.sessions) ? json.sessions : []);
    } catch (error) {
      setStatusNote(formatSupabaseSetupError((error as Error).message || "Unable to refresh the studio list."));
    } finally {
      setStudioBrowserRefreshing(false);
    }
  };

  const openStudio = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setTab("files");
    setShowStudioBrowser(false);
    setStatusNote("");
  };

  const getKnownFileCount = (sessionId: string) =>
    sessionId in filesBySession ? filesBySession[sessionId].length : null;

  const createStudio = async (title?: string) => {
    setStatusNote("Preparing a new studio...");
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || `Studio ${sessionList.length + 1}` })
      });
      const json = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to prepare a studio."));
      }

      const nextSession = { id: json.id as string, title: json.title as string };
      setSessionList((current) =>
        current.some((session) => session.id === nextSession.id) ? current : [nextSession, ...current]
      );
      setFilesBySession((current) => ({ ...current, [nextSession.id]: current[nextSession.id] ?? [] }));
      setActiveSessionId(nextSession.id);
      setTab("files");
      setStatusNote("Studio ready.");
      return nextSession.id;
    } catch (error) {
      setStatusNote(formatSupabaseSetupError((error as Error).message || "Unable to prepare a studio."));
      return null;
    }
  };

  const renameStudio = async (sessionId: string, currentTitle: string) => {
    const nextTitle = window.prompt("Rename studio", currentTitle)?.trim();
    if (!nextTitle || nextTitle === currentTitle) {
      return;
    }

    setRenamingStudioId(sessionId);
    setStatusNote("Renaming studio...");

    try {
      const response = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, title: nextTitle })
      });
      const json = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to rename this studio."));
      }

      setSessionList((current) =>
        current.map((session) => (session.id === sessionId ? { ...session, title: json.title || nextTitle } : session))
      );
      setStatusNote(`Studio renamed to ${json.title || nextTitle}.`);
    } catch (error) {
      setStatusNote(formatSupabaseSetupError((error as Error).message || "Unable to rename this studio."));
    } finally {
      setRenamingStudioId(null);
    }
  };

  const deleteStudio = async (sessionId: string, title: string) => {
    const confirmed = window.confirm(`Delete "${title}"? This will remove the studio and its uploaded sources.`);
    if (!confirmed) {
      return;
    }

    setDeletingStudioId(sessionId);
    setStatusNote("Deleting studio...");

    try {
      const response = await fetch("/api/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      const json = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to delete this studio."));
      }

      const nextSessions = Array.isArray(json.sessions) ? json.sessions : [];
      setSessionList(nextSessions);
      setFilesBySession((current) => {
        const next = { ...current };
        delete next[sessionId];
        return next;
      });

      if (activeSessionId === sessionId) {
        setActiveSessionId(nextSessions[0]?.id ?? null);
      }

      setShowStudioBrowser(false);
      setStatusNote(`Deleted ${title}.`);
    } catch (error) {
      setStatusNote(formatSupabaseSetupError((error as Error).message || "Unable to delete this studio."));
    } finally {
      setDeletingStudioId(null);
    }
  };

  const ensureActiveSession = async () => {
    if (activeSessionId) return activeSessionId;
    return createStudio("Untitled Studio");
  };

  const uploadFiles = async (incoming: FileList | File[] | null) => {
    const filesToUpload = incoming ? Array.from(incoming) : [];
    if (!filesToUpload.length) {
      const message = "No files were selected. Try again and keep the files in the picker until the upload starts.";
      setStatusNote(message);
      setSourceModalError(message);
      return;
    }

    const maxUploadFileSizeBytes = defaultMaxUploadFileSizeMb * 1024 * 1024;
    const oversizedFiles = filesToUpload.filter((file) => file.size > maxUploadFileSizeBytes);
    const allowedFiles = filesToUpload.filter((file) => file.size <= maxUploadFileSizeBytes);

    if (!allowedFiles.length) {
      const message = `Each uploaded file must be ${defaultMaxUploadFileSizeMb} MB or smaller.`;
      setStatusNote(message);
      setSourceModalError(message);
      return;
    }

    const sessionId = await ensureActiveSession();
    if (!sessionId) {
      return;
    }

    setActiveSessionId(sessionId);
    setUploading(true);
    setUploadProgress(10);
    setStatusNote("");
    setSourceModalError("");

    try {
      let nextFiles = filesBySession[sessionId] ?? [];
      const warnings: string[] = [];
      const rejectedFiles: { fileName: string; reason: string }[] = [];

  // Batch upload all files in a single request
      const form = new FormData();
      allowedFiles.forEach((file) => form.append("files", file));
      form.append("sessionId", sessionId);

      setUploadProgress(30);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const json = await readJsonResponse(response);

      if (!response.ok) {
        if (Array.isArray(json.rejectedFiles)) {
          rejectedFiles.push(...json.rejectedFiles);
        } else if (json.error) {
          allowedFiles.forEach(f => rejectedFiles.push({ fileName: f.name, reason: normalizeErrorMessage(json.error, "Upload failed.") }));
        }
      } else {
        nextFiles = Array.isArray(json.files) ? json.files : nextFiles;
        if (Array.isArray(json.warnings)) warnings.push(...json.warnings);
        if (Array.isArray(json.rejectedFiles)) rejectedFiles.push(...json.rejectedFiles);
      }
      setUploadProgress(80);

      if (!nextFiles.length) {
        const refreshResponse = await fetch(`/api/sessions?sessionId=${sessionId}`);
        const refreshJson = await readJsonResponse(refreshResponse);
        if (!refreshResponse.ok) {
          throw new Error(
            normalizeErrorMessage(refreshJson.error, "Upload finished, but the files could not be refreshed.")
          );
        }
        nextFiles = Array.isArray(refreshJson.files) ? refreshJson.files : [];
      }

      setUploadProgress(92);
      setFilesBySession((current) => ({
        ...current,
        [sessionId]: nextFiles
      }));
      setUploadProgress(100);
      const oversizedMessage =
        oversizedFiles.length > 0 ? ` ${oversizedFiles.length} file(s) were skipped for being over ${defaultMaxUploadFileSizeMb} MB.` : "";
      const rejectedMessage =
        rejectedFiles.length > 0
          ? ` ${rejectedFiles.length} file(s) were unreadable and were skipped. Reupload a clearer copy.`
          : "";
      if (nextFiles.length) {
        const message = warnings.length
          ? `${nextFiles.length} file(s) added. ${warnings[0]}${rejectedMessage}${oversizedMessage}`
          : `${nextFiles.length} file(s) added. The study tools are now ready to use.${rejectedMessage}${oversizedMessage}`;
        setStatusNote(message);
        setSourceModalError("");
        setSourceModalOpen(false);
      } else {
        const message =
          rejectedFiles[0]?.reason ||
          "Upload finished, but no saved files came back from Supabase. Re-run supabase/schema.sql and confirm the storage policies were created.";
        setStatusNote(message);
        setSourceModalError(message);
      }
      setTab("tools");
    } catch (error) {
      const message = formatSupabaseSetupError((error as Error).message || "Upload failed.");
      setStatusNote(message);
      setSourceModalError(message);
    } finally {
      window.setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 360);
    }
  };

  const searchWebSources = async () => {
    const query = sourceModalQuery.trim();
    if (!query) {
      setSourceModalError("Type a topic, chapter, or question to search for web sources.");
      return;
    }

    setSourceModalLoading(true);
    setSourceModalError("");
    setSourceSearchWarning("");
    setSourceSearchResults([]);
    setVisibleSourceResults(12);
    setSourceResultFilter("all");

    try {
      const response = await fetch("/api/sources/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, engine: sourceSearchEngine })
      });
      const json = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to search the web right now."));
      }

      setSourceSearchResults(Array.isArray(json.results) ? json.results : []);
      setSourceSearchWarning(typeof json.warning === "string" ? json.warning : "");
      setSourceModalMode("web");

      if (!json.results?.length) {
        setSourceModalError("No web sources came back for that topic. Try a more specific search.");
      }
    } catch (error) {
      setSourceModalError((error as Error).message || "Unable to search the web right now.");
    } finally {
      setSourceModalLoading(false);
    }
  };

  const searchWorkspaceSources = async () => {
    const query = workspaceSearchQuery.trim();
    if (!query) {
      setWorkspaceSearchError("Type a topic, question, or URL to search inside the studio.");
      return;
    }

    setWorkspaceSearchLoading(true);
    setWorkspaceSearchError("");

    try {
      const looksLikeUrl =
        /^https?:\/\//i.test(query) ||
        /^www\./i.test(query) ||
        /^[\w-]+\.(ac\.|co\.|com|org|net|edu|gov|io|app)[^\s]*$/i.test(query);

      if (looksLikeUrl) {
        const normalizedUrl = /^https?:\/\//i.test(query) ? query : `https://${query.replace(/^www\./i, "www.")}`;
        let hostname = normalizedUrl;
        try {
          hostname = new URL(normalizedUrl).hostname;
        } catch {
          throw new Error("That URL does not look valid. Try again with https:// included.");
        }

        openBrowseInWorkspace(normalizedUrl, hostname);
        setStatusNote(`Opened ${hostname} inside this studio.`);
        return;
      }

      // Use the server-side search API which properly handles DuckDuckGo parsing,
      // instead of trying to iframe DuckDuckGo's HTML page (which gets blocked by anti-bot measures).
      const response = await fetch("/api/sources/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query, engine: "duckduckgo" })
      });
      const json = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to search."));
      }

      const results: WebSourceItem[] = Array.isArray(json.results) ? json.results : [];
      if (!results.length) {
        setWorkspaceSearchError("No results found for that query. Try different wording.");
        setWorkspaceSearchLoading(false);
        return;
      }

      // Open the results in a search workspace tab
      const tabId = `search-${Date.now()}`;
      upsertWorkspaceTab({
        id: tabId,
        label: `Search: ${clipText(query, 28)}`,
        kind: "search",
        query,
        results,
        closable: true
      });
      setStatusNote(`Found ${results.length} result(s) for “${query}”.`);
    } catch (error) {
      setWorkspaceSearchError((error as Error).message || "Unable to search sources right now.");
    } finally {
      setWorkspaceSearchLoading(false);
    }
  };

  void searchWebSources;

  const removeFile = async (file: FileItem) => {
    setDeletingFileId(file.id);
    setStatusNote("");

    try {
      const response = await fetch(`/api/files/${file.id}`, {
        method: "DELETE"
      });
      const json = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to remove this source."));
      }

      const sessionId = activeSessionId;
      if (!sessionId) return;

      setFilesBySession((current) => ({
        ...current,
        [sessionId]: (current[sessionId] ?? []).filter((currentFile) => currentFile.id !== file.id)
      }));
      setStatusNote(`${file.file_name} was removed from this studio.`);

      if (preview.file?.id === file.id) {
        closePreview();
      }
    } catch (error) {
      setStatusNote((error as Error).message || "Unable to remove this source.");
    } finally {
      setDeletingFileId(null);
    }
  };

  const importWebSource = async (source: WebSourceItem) => {
    const sessionId = await ensureActiveSession();
    if (!sessionId) return;

    setImportingSourceId(source.id);
    setSourceModalError("");

    try {
      const response = await fetch("/api/sources/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          title: source.title,
          url: source.url,
          snippet: source.snippet,
          source: source.source,
          trustLabel: source.trustLabel
        })
      });
      const json = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to import this web source."));
      }

      setActiveSessionId(sessionId);
      setFilesBySession((current) => ({
        ...current,
        [sessionId]: Array.isArray(json.files) ? json.files : current[sessionId] ?? []
      }));
      openBrowseInWorkspace(source.url, source.title);
      setStatusNote(`${source.title} was added to this studio and opened in the workspace browser.`);
      setSourceModalOpen(false);
      setTab("tools");
    } catch (error) {
      setSourceModalError((error as Error).message || "Unable to import this web source.");
    } finally {
      setImportingSourceId(null);
    }
  };

  const saveBrowseAsNote = useCallback(
    async (url: string, label: string) => {
      await importWebSource({
        id: `browse-save-${Date.now()}`,
        title: label || url,
        url,
        snippet: `Saved from workspace browser on ${new Date().toLocaleDateString()}.`,
        source: "Workspace browser",
        trustLabel: "Web"
      });
    },
    [importWebSource]
  );

  const copySourcesFromStudio = (sourceSessionId: string, sourceStudioTitle: string) => {
    if (sourceSessionId === activeSessionId) {
      setStatusNote("You are already inside that studio.");
      return;
    }

    setCopiedSourceClipboard({
      sourceSessionId,
      sourceStudioTitle,
      copiedAt: Date.now()
    });
    setShowStudioBrowser(false);
    setTab("files");
    setStatusNote(`Copied ${sourceStudioTitle} into your source clipboard. Open a studio and paste it into Files when you're ready.`);
  };

  const pasteCopiedSourcesIntoStudio = async () => {
    const targetSessionId = await ensureActiveSession();
    if (!targetSessionId || !copiedSourceClipboard) return;

    if (copiedSourceClipboard.sourceSessionId === targetSessionId) {
      setStatusNote("Those copied sources already belong to this studio.");
      return;
    }

    setCopyingStudioId(copiedSourceClipboard.sourceSessionId);
    setStatusNote(`Pasting sources from ${copiedSourceClipboard.sourceStudioTitle} into this studio...`);

    try {
      const response = await fetch("/api/sessions/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceSessionId: copiedSourceClipboard.sourceSessionId,
          targetSessionId
        })
      });
      const json = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to paste copied sources."));
      }

      setFilesBySession((current) => ({
        ...current,
        [targetSessionId]: json.files ?? current[targetSessionId] ?? []
      }));
      setTab("files");
      setStatusNote(
        json.message ||
          `Copied ${typeof json.copiedCount === "number" ? json.copiedCount : 0} source(s) into this studio.`
      );
    } catch (error) {
      setStatusNote(formatSupabaseSetupError((error as Error).message || "Unable to paste copied sources."));
    } finally {
      setCopyingStudioId(null);
    }
  };

  const toggleFileSource = async (file: FileItem) => {
    const sessionId = activeSessionId;
    if (!sessionId) return;

    setTogglingFileId(file.id);

    try {
      const response = await fetch(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceEnabled: file.source_enabled === false
        })
      });
      const json = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to update this source."));
      }

      setFilesBySession((current) => ({
        ...current,
        [sessionId]: (current[sessionId] ?? []).map((item) => (item.id === file.id ? json.file ?? item : item))
      }));

      if (preview.file?.id === file.id) {
        setPreview((current) => ({
          ...current,
          file: json.file ?? current.file
        }));
      }

      setStatusNote(
        file.source_enabled === false
          ? `${file.file_name} is source-enabled again for tutor chat, tools, and revision plans.`
          : `${file.file_name} is excluded from tutor chat, study tools, and revision plans until you re-enable it.`
      );
    } catch (error) {
      setStatusNote(normalizeErrorMessage(error, "Unable to update this source."));
    } finally {
      setTogglingFileId(null);
    }
  };

  const closePreview = () => {
    setPreview({
      open: false,
      loading: false,
      file: null,
      kind: "text",
      text: "",
      url: null,
      error: ""
    });
  };

  // Legacy modal preview kept for fallback flows.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- referenced by preview modal UI below
  const openFilePreview = async (file: FileItem) => {
    setPreview({
      open: true,
      loading: true,
      file,
      kind: resolvePreviewKind(file.file_name, file.file_type, file.storage_path),
      text: "",
      url: null,
      error: ""
    });

    try {
      const response = await fetch(`/api/files/preview?fileId=${file.id}`);
      const json = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to open this file."));
      }

      setPreview({
        open: true,
        loading: false,
        file,
        kind: json.kind || "text",
        text: json.text || file.extracted_text || "",
        url: json.url || null,
        error: ""
      });
    } catch (error) {
      setPreview({
        open: true,
        loading: false,
        file,
        kind: "text",
        text: file.extracted_text || "",
        url: null,
        error: (error as Error).message || "Unable to open this file."
      });
    }
  };

  const handleQuickImportDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragDepth((current) => current + 1);
    setDragOver(true);
  };

  const handleQuickImportDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  };

  const handleQuickImportDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragDepth((current) => {
      const nextDepth = Math.max(0, current - 1);
      if (!nextDepth) {
        setDragOver(false);
      }
      return nextDepth;
    });
  };

  const handleQuickImportDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragDepth(0);
    setDragOver(false);

    if (!event.dataTransfer.files?.length) {
      setStatusNote("No files were detected in that drop. Try dropping the files directly into the quick import area.");
      return;
    }

    uploadFiles(Array.from(event.dataTransfer.files));
  };

  const runAI = useCallback(async (action: AIAction, prompt: string) => {
    setActiveAction(action);
    setLoading(true);
    setOutput("");
    setTab("tools");
    setStatusNote("");

    const context = buildContextForPrompt(prompt, action);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          prompt,
          context,
          examMode: action === "exam" ? toolDraft.examMode || "full" : undefined,
          sessionId: activeSessionId ?? undefined
        })
      });
      const json = await readJsonResponse(response);
      if (!response.ok) {
        // When response.ok is false but json.error is empty, the platform
        // likely killed the function before it sent its own error JSON.
        // This normally means the AI took longer than the platform timeout.
        const errorMessage = json.error
          ? normalizeErrorMessage(json.error, "No response")
          : "The AI took too long to respond. Try again — the first provider attempt is usually faster.";
        throw new Error(errorMessage);
      }

      const rawText = normalizeAIResponseText(json.text ?? json.error ?? "");
      const normalized = sanitizeDisplayText(extractStructuredOutput(rawText), "No response");
      const finalText = normalized || sanitizeDisplayText(rawText, "No response");
      if (!normalized || normalized === "No response") {
        setStatusNote(`${actionButtons.find((item) => item.key === action)?.label || "Tool"} generated an empty response. Try uploading different sources or rephrasing your focus.`);
      }
      setOutput(finalText);
      saveToolResult(action, finalText, action === toolDraft.action ? toolDraft.focus : "");
      openGeneratedResultInWorkspaceTab(action, finalText, action === toolDraft.action ? toolDraft.focus : "");
      updateMetrics((current) => ({

        ...current,
        toolRuns: {
          ...current.toolRuns,
          [action]: (current.toolRuns[action] ?? 0) + 1
        }
      }));
      const remainingUsage =
        typeof json.usage?.dailyRemaining === "number"
          ? ` ${json.usage.dailyRemaining} study tool run(s) left today.`
          : "";
      const examUsage =
        action === "exam" && typeof json.usage?.examWeeklyRemaining === "number"
          ? toolDraft.examMode === "practice"
            ? ` ${json.usage.examWeeklyRemaining} practice question set(s) left this week.`
            : ` ${json.usage.examWeeklyRemaining} full mock exam(s) left this week.`
          : "";
      setStatusNote(
        `${actionButtons.find((item) => item.key === action)?.label || "Tool"} ready from ${sourceEnabledCount} source-enabled file(s).${remainingUsage}${examUsage}`
      );
      return finalText;
    } catch (error) {
      const errorMsg = normalizeErrorMessage(error, "Generation failed");
      setStatusNote(`${actionButtons.find((item) => item.key === action)?.label || "Tool"} failed: ${errorMsg}`);
      setOutput("");
      return null;
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, buildContextForPrompt, openGeneratedResultInWorkspaceTab, saveToolResult, sourceEnabledCount, toolDraft.action, toolDraft.examMode, toolDraft.focus, updateMetrics]);

  const applyCanvasAssist = useCallback(
    (question: string) => {
      const assist = detectCanvasAssistRequest(question);
      if (!assist) return false;

      const targetTab =
        workspaceTabs.find((tab) => tab.id === workspaceTab) ??
        workspaceTabs.find((tab) => tab.kind === "canvas-source" || tab.kind === "source") ??
        null;
      if (!targetTab) {
        setStatusNote("Open a note or source tab first, then ask me to highlight or annotate it.");
        return false;
      }

      setWorkspaceTab(targetTab.id);
      setTab("tools");
      setCanvasTool(assist);
      const selected = typeof window !== "undefined" ? window.getSelection()?.toString().trim() || "" : "";
      const assistText = selected || clipText(question.replace(/^(please|can you|could you)\s+/i, "").trim(), 180);
      addCanvasAnnotation(
        targetTab.id,
        assist,
        { x: 20 + Math.random() * 36, y: 16 + Math.random() * 28 },
        assistText || undefined
      );
      setStatusNote(
        assist === "highlight"
          ? "Added a highlight box on your open note. Drag it anywhere on the canvas."
          : "Added a text box on your open note. Drag it anywhere on the canvas."
      );
      return true;
    },
    [addCanvasAnnotation, workspaceTab, workspaceTabs]
  );

  const executeWorkspaceNavigation = useCallback(
    (question: string) => {
      const lower = question.toLowerCase();
      if (!/\b(open|show|switch to|go to|bring up|display|pull up)\b/.test(lower)) return false;

      if (/\b(files?|sources?|uploads?|notes?)\b/.test(lower) && !/\b(ai notes|textbook)\b/.test(lower)) {
        setTab("files");
        setWorkspaceTab("sources");
        setStatusNote("Opened your studio sources.");
        return true;
      }

      if (/\b(chat|tutor|messages?)\b/.test(lower)) {
        setTab("chat");
        setStatusNote("Opened AI chat.");
        return true;
      }

      if (/\b(study tools?|tools?)\b/.test(lower)) {
        setTab("tools");
        setStatusNote("Opened study tools.");
        return true;
      }

      const toolMatch = actionButtons.find(
        (item) => lower.includes(item.label.toLowerCase()) || lower.includes(item.key.replace(/_/g, " "))
      );
      if (toolMatch) {
        setActiveAction(toolMatch.key);
        setTab("tools");
        const saved = currentToolHistory.find((item) => item.action === toolMatch.key);
        if (saved) openSavedToolResult(saved);
        setStatusNote(`Opened ${toolMatch.label}.`);
        return true;
      }

      const url = extractUrlFromText(question);
      if (url) {
        try {
          openBrowseInWorkspace(url, new URL(url).hostname);
        } catch {
          openBrowseInWorkspace(url, clipText(url, 24));
        }
        setStatusNote("Opened that website inside the studio workspace.");
        return true;
      }

      const matchedFile = currentFiles.find((file) => lower.includes(file.file_name.toLowerCase().slice(0, 24)));
      if (matchedFile) {
        void openFileInWorkspaceTab(matchedFile);
        setStatusNote(`Opened ${matchedFile.file_name}.`);
        return true;
      }

      const matchedTab = workspaceTabs.find((tab) => lower.includes(tab.label.toLowerCase()));
      if (matchedTab) {
        setWorkspaceTab(matchedTab.id);
        setTab("tools");
        setStatusNote(`Switched to ${matchedTab.label}.`);
        return true;
      }

      return false;
    },
    [currentFiles, currentToolHistory, openBrowseInWorkspace, openFileInWorkspaceTab, openSavedToolResult, workspaceTabs]
  );

  const submitChatQuestion = useCallback(async (questionInput: string) => {
    const question = questionInput.trim();
    if (!question || loading || chatLoading) return false;
    const smallTalk = isTutorSmallTalk(question);
    const requestedTool = detectChatToolRequest(question);
    const lowerQuestion = question.toLowerCase();
    const timerCommand =
      /\b(start|set|begin|run)\b.*\b(timer|pomodoro|focus session|study session)\b/.test(lowerQuestion) ||
      /\b(timer|pomodoro)\b.*\b(start|set|begin|run)\b/.test(lowerQuestion);
    const playMusicCommand = /\b(play|start|put on)\b.*\b(music|lofi|lo-fi|focus track|playlist)\b/.test(lowerQuestion);
    const pauseMusicCommand = /\b(pause|stop)\b.*\b(music|song|track|playlist)\b/.test(lowerQuestion);

    if (timerCommand) {
      const minuteMatch = question.match(/(\d{1,3})\s*(?:min|mins|minute|minutes|m)\b/i);
      const nextMinutes = minuteMatch ? Number(minuteMatch[1]) : timerMinutes;
      startStudyTimer(nextMinutes);
      setMessages((current) => [
        ...current,
        { role: "user", content: question },
        {
          role: "ai",
          content: `Timer started for ${Math.max(1, Math.min(240, nextMinutes))} minute(s). I’ll ping softly for breaks and when the full session is done.`
        }
      ]);
      setTab("tools");
      return true;
    }

    if (playMusicCommand || pauseMusicCommand) {
      setMusicPlaying(playMusicCommand);
      setMessages((current) => [
        ...current,
        { role: "user", content: question },
        {
          role: "ai",
          content: playMusicCommand
            ? "Open the music panel to connect Spotify."
            : "Focus music is paused."
        }
      ]);
      setTab("tools");
      return true;
    }

    if (executeWorkspaceNavigation(question)) {
      setMessages((current) => [
        ...current,
        { role: "user", content: question },
        { role: "ai", content: "Done — I updated the studio workspace for you." }
      ]);
      return true;
    }

    if (applyCanvasAssist(question)) {
      setMessages((current) => [
        ...current,
        { role: "user", content: question },
        {
          role: "ai",
          content:
            "I added that annotation on your open note. I can also see your canvas marks, open tabs, and browsing context while we chat."
        }
      ]);
      setTab("tools");
      return true;
    }

    if (!sourceEnabledCount && !smallTalk) {
      const message = "Upload sources or files to continue. AI answers stay locked to uploaded material in this workspace.";
      setStatusNote(message);
      openSourceModal(message);
      setTab("chat");
      return false;
    }

    if (requestedTool && sourceEnabledCount) {
      const actionLabel = actionButtons.find((item) => item.key === requestedTool)?.label || "tool";
      const nextDraft = {
        ...createToolDraft(requestedTool),
        focus: question
      };

      setMessages((current) => [
        ...current,
        { role: "user", content: question },
        { role: "ai", content: `Generating your ${actionLabel.toLowerCase()} from the current sources now.` }
      ]);
      setToolDraft(nextDraft);
      setChatLoading(true);

      const toolPrompt = buildToolPrompt(nextDraft, sourceEnabledFiles);
      const generated = await runAI(requestedTool, toolPrompt);

      setMessages((current) => {
        const next = [...current];
        const lastIndex = next.length - 1;
        if (lastIndex >= 0 && next[lastIndex]?.role === "ai") {
          next[lastIndex] = {
            role: "ai",
            content: generated
              ? `${actionLabel} is ready. I opened it as a Studio tab and saved it under Study Tools.`
              : `I couldn't finish that ${actionLabel.toLowerCase()} yet. Please try again.`
          };
        }
        return next;
      });

      setChatLoading(false);
      setTab("tools");
      return Boolean(generated);
    }

    const historySnapshot = messages.slice(-6);
    const hasStudyHistory =
      currentMetrics.quizAnswered > 0 ||
      currentMetrics.flashcardsFlipped > 0 ||
      Object.values(currentMetrics.toolRuns).some((count) => count > 0);
    const studyProfile = hasStudyHistory ? buildPerformanceSummary(currentMetrics) : "";
    const studentProfile = onboardingSummary(onboarding);
    const chatContext = buildStudyContext(sourceEnabledFiles, question, {
      maxCharacters: 6500,
      maxChunks: 8
    });
    const enrichedPrompt = historySnapshot.length
      ? [
          currentSession?.title ? `Current studio: ${currentSession.title}` : "",
          studentProfile ? `Student profile:\n${studentProfile}` : "",
          studyProfile ? `How this student has been working so far:\n${studyProfile}` : "",
          "Conversation so far:",
          ...historySnapshot.map(
            (message) => `${message.role === "user" ? "User" : "Assistant"}: ${clipText(message.content.replace(/\n+/g, " "), 420)}`
          ),
          "",
          `Latest user question: ${question}`,
          "",
          "Answer the latest user question directly and only add extra study help after the answer. If this is quiz/exam/practice-question help, guide with hints and method first without revealing the final answer unless the user explicitly asks for the final answer. If the user asks to be quizzed in chat, ask one mini question and wait."
        ]
          .filter(Boolean)
          .join("\n")
      : [
          currentSession?.title ? `Current studio: ${currentSession.title}` : "",
          studentProfile ? `Student profile:\n${studentProfile}` : "",
          studyProfile ? `How this student has been working so far:\n${studyProfile}` : "",
          `Latest user question: ${question}`,
          smallTalk
            ? "Reply warmly in 1-2 short sentences, then invite the student to share what they are revising."
            : "Answer the question directly, use only the uploaded sources, and finish with one small next step. If this is quiz/exam/practice-question help, guide with hints and method first without revealing the final answer unless the user explicitly asks for the final answer. If the user asks to be quizzed in chat, ask one mini question and wait."
        ]
          .filter(Boolean)
          .join("\n\n");

    setMessages((current) => [...current, { role: "user", content: question }]);
    setChatLoading(true);
    setScreenAwarePulse(true);
    setTab("chat");
    setStatusNote("");

    try {
      setMessages((current) => [...current, { role: "ai", content: "" }]);

      const providerHistory = historySnapshot.map((message) => ({
        role: message.role === "ai" ? "assistant" : "user",
        content: message.content
      }));

      const streamResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            message: enrichedPrompt,
            history: providerHistory,
            context: chatContext,
            screenContext: buildScreenContext(),
            mode: "chat",
            sessionId: activeSessionId ?? undefined
          }
        })
      });

      if (!streamResponse.ok) {
        const json = await readJsonResponse(streamResponse);
        const errorMessage = normalizeErrorMessage(
          json.error,
          `Stream request failed: ${streamResponse.status}`
        );
        throw new Error(errorMessage);
      }

      const reader = streamResponse.body?.getReader();
      if (!reader) {
        throw new Error("No streaming body available.");
      }

      const decoder = new TextDecoder();
      let accumulated = "";
      let streamBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamBuffer += decoder.decode(value, { stream: true });
        const parts = streamBuffer.split(/\n\n/);
        streamBuffer = parts.pop() || "";

        for (const part of parts) {
          accumulated += parseSSEChunk(part);
        }

        const safeAccumulated = sanitizeDisplayText(accumulated, "");
        setMessages((current) => {
          const next = [...current];
          const lastIndex = next.length - 1;
          if (lastIndex >= 0 && next[lastIndex]?.role === "ai") {
            next[lastIndex] = { ...next[lastIndex], content: safeAccumulated };
          }
          return next;
        });
      }

      if (streamBuffer) {
        accumulated += parseSSEChunk(streamBuffer);
      }

      setStatusNote("");
    } catch (error) {
      const message = sanitizeDisplayText(error, "Unable to generate a reply.");
      setMessages((current) => {
        const next = [...current];
        const lastIndex = next.length - 1;
        if (lastIndex >= 0 && next[lastIndex]?.role === "ai" && !next[lastIndex]?.content) {
          next[lastIndex] = { ...next[lastIndex], content: message };
          return next;
        }
        return [...current, { role: "ai", content: message }];
      });
      setStatusNote(message);
      return false;
    } finally {
      setChatLoading(false);
      setScreenAwarePulse(false);
    }
    return true;
  }, [activeSessionId, applyCanvasAssist, buildScreenContext, chatLoading, currentMetrics, currentSession?.title, executeWorkspaceNavigation, loading, messages, onboarding, runAI, sourceEnabledCount, sourceEnabledFiles, startStudyTimer, timerMinutes]);

  const sendChat = async () => {
    const question = chat.trim();
    if (!question) return;
    const sent = await submitChatQuestion(question);
    if (sent) {
      setChat("");
    }
  };

  useEffect(() => {
    const planId = searchParams.get("planId");
    const dayIndexParam = searchParams.get("day");
    const launchKey = planId ? `${planId}:${dayIndexParam || "0"}:${activeSessionId || "none"}` : null;

    if (!planId || !launchKey || planLaunchAttemptRef.current === launchKey || !activeSessionId || !hasCurrentFiles) {
      return;
    }

    if (!sourceEnabledCount) {
      setStatusNote("This revision day needs at least one uploaded source in the linked studio before it can open as a guided session.");
      return;
    }

    planLaunchAttemptRef.current = launchKey;
    let ignore = false;

    const openPlannedSession = async () => {
      try {
        const response = await fetch(`/api/revision-plans/${planId}`);
        const json = await readJsonResponse(response);
        if (!response.ok) {
          throw new Error(normalizeErrorMessage(json.error, "Unable to open this revision day."));
        }

        if (ignore) return;

        const plan = json.plan as {
          id: string;
          session_id: string;
          exam_name: string;
          current_day: number;
          days: Array<{ label?: string; focus?: string; task?: string; check?: string }>;
        };

        if (!plan || plan.session_id !== activeSessionId || !Array.isArray(plan.days) || !plan.days.length) {
          throw new Error("This revision day is no longer linked to the current studio.");
        }

        const targetIndex = Number.isFinite(Number(dayIndexParam))
          ? Math.max(0, Math.min(Number(dayIndexParam), plan.days.length - 1))
          : Math.max(0, Math.min(plan.current_day || 0, plan.days.length - 1));
        const day = plan.days[targetIndex];

        if (!day) {
          throw new Error("The selected revision day could not be found.");
        }

        setMessages([]);
        setChat("");
        setTab("chat");

        const opened = await submitChatQuestion(
          [
            `Start a personalised revision session for ${plan.exam_name}.`,
            `Today's schedule block: ${day.label || `Day ${targetIndex + 1}`}.`,
            `Focus: ${day.focus || "Use the most important ideas from the uploaded sources."}.`,
            `Task: ${day.task || "Teach the material clearly and help me revise it."}.`,
            `Self-check target: ${day.check || "Finish with one quick recall check."}.`,
            "Use my uploaded sources only, answer directly, adapt to how I have been studying in this studio, and end with one small next step."
          ].join(" ")
        );

        if (opened && !ignore) {
          setStatusNote(`Opened ${day.label || `Day ${targetIndex + 1}`} from your revision schedule.`);
        }
      } catch (error) {
        if (!ignore) {
          planLaunchAttemptRef.current = null;
          setStatusNote((error as Error).message || "Unable to open this revision day.");
        }
      } finally {
        if (!ignore) {
          router.replace(pathname);
        }
      }
    };

    void openPlannedSession();

    return () => {
      ignore = true;
    };
  }, [activeSessionId, hasCurrentFiles, pathname, router, searchParams, sourceEnabledCount, submitChatQuestion]);

  const createReminder = async () => {
    if (!sourceEnabledCount) {
      const message = "Upload at least one file before setting a reminder for this study stack.";
      setStatusNote(message);
      openSourceModal(message);
      return;
    }

    const sessionId = await ensureActiveSession();
    if (!sessionId) {
      return;
    }

    setStatusNote("Scheduling a spaced-review reminder...");

    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: `Time to review ${currentSession?.title || "your notes"}.`,
          daysAhead: 2
        })
      });
      const json = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to schedule reminder."));
      }

      setStatusNote("Reminder created for two days from now.");
    } catch (error) {
      setStatusNote(formatSupabaseSetupError((error as Error).message || "Unable to schedule reminder."));
    }
  };

  const openTool = (action: AIAction) => {
    setActiveAction(action);
    setToolDraft(createToolDraft(action));
    setOutput("");
    setTab("tools");

    if (toolsLocked) {
      const message = "Upload at least one file or add a web source to unlock summaries, quizzes, flashcards, exam generation, and the other study tools.";
      setStatusNote(message);
      openSourceModal(message);
    } else {
      setStatusNote("");
      setToolModalView("setup");
      setToolModalOpen(true);
    }
  };

  const generateSelectedTool = async () => {
    if (toolsLocked) {
      const message = "Upload at least one file or import a web source before generating study tools from the workspace.";
      setStatusNote(message);
      openSourceModal(message);
      return;
    }

    const performanceNote =
      toolDraft.action === "insights"
        ? `\n\nPerformance data from this studio:\n${buildPerformanceSummary(currentMetrics)}`
        : "";
    const result = await runAI(toolDraft.action, `${buildToolPrompt(toolDraft, sourceEnabledFiles)}${performanceNote}`);
    if (result) {
      setToolModalOpen(false);
      setToolModalView("setup");
    }
  };

  const onChatKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    sendChat();
  };

  const openRevisionSchedule = () => {
    if (toolsLocked) {
      const message = "Upload at least one file or add a web source before building a revision schedule.";
      setStatusNote(message);
      openSourceModal(message);
      return;
    }

    const params = new URLSearchParams();
    if (activeSessionId) {
      params.set("sessionId", activeSessionId);
    }
    setStatusNote("");
    router.push(`/schedule${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const renderWorkspaceDynamicTab = (workspaceItem: WorkspaceDynamicTab) => {
    const isCanvas =
      workspaceItem.kind === "canvas-source" || workspaceItem.kind === "canvas-output";
    const isOutput =
      workspaceItem.kind === "output" || (workspaceItem.kind === "canvas-output" && Boolean(workspaceItem.action && workspaceItem.output));
    const isSearch = workspaceItem.kind === "search";
    const isBrowse = workspaceItem.kind === "browse" || workspaceItem.kind === "canvas-browse";
    const interactiveOutputAction = workspaceItem.action;
    const tabAnnotations = canvasAnnotations.filter((annotation) => annotation.tabId === workspaceItem.id);
    const tabStrokes = canvasStrokes.filter((stroke) => stroke.tabId === workspaceItem.id);
    const drawableStrokes = activeCanvasStroke?.tabId === workspaceItem.id ? [activeCanvasStroke, ...tabStrokes] : tabStrokes;
    const canvasCanInteract = isCanvas && (canvasTool === "draw" || canvasTool === "highlight" || canvasTool === "eraser");

    return (
      <motion.div
        key={workspaceItem.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isCanvas ? "min-h-[66vh]" : ""} relative space-y-4`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-white/8 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
              {isBrowse ? "Studio browser" : isSearch ? "Web search" : isCanvas ? "Open workspace" : isOutput ? "Generated output" : "Source preview"}
            </p>
            <h3 className="mt-1 truncate text-lg font-semibold">{workspaceItem.label}</h3>
            <p className="muted mt-1 text-xs">
              {isBrowse
                ? "Browse, annotate, and save pages as notes inside this studio."
                : isSearch
                ? "DuckDuckGo results stay inside this studio. Add useful sources so the tutor can read them."
                : isCanvas
                ? "Open fullscreen, annotate, highlight, draw, and erase inside the workspace."
                : "Quick preview tab. Use Open for the full workspace view."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {workspaceItem.file && workspaceItem.kind === "source" ? (
              <Button onClick={() => openFileInCanvas(workspaceItem.file as FileItem)} variant="secondary" size="sm">
                <Maximize2 className="h-4 w-4" />
                Open
              </Button>
            ) : null}
            {isOutput && workspaceItem.kind === "output" ? (
              <Button onClick={openCurrentResultInCanvas} variant="secondary" size="sm">
                <Maximize2 className="h-4 w-4" />
                Open
              </Button>
            ) : null}
            {isBrowse && workspaceItem.url ? (
              <>
                <Button
                  onClick={() =>
                    setBrowseReloadKeys((current) => ({
                      ...current,
                      [workspaceItem.id]: (current[workspaceItem.id] ?? 0) + 1
                    }))
                  }
                  variant="secondary"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload
                </Button>
                <Button
                  onClick={() => void saveBrowseAsNote(workspaceItem.url!, workspaceItem.label)}
                  variant="secondary"
                  size="sm"
                  disabled={Boolean(importingSourceId)}
                >
                  {importingSourceId ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                  Save as note
                </Button>
                <Button onClick={() => window.open(workspaceItem.url!, "_blank", "noopener,noreferrer")} variant="ghost" size="sm">
                  <ExternalLink className="h-4 w-4" />
                  External
                </Button>
              </>
            ) : null}
            <Button onClick={() => closeWorkspaceTab(workspaceItem.id)} variant="ghost" size="sm">
              <X className="h-4 w-4" />
              Close
            </Button>
          </div>
        </div>

        {isCanvas ? (
          <div className="space-y-3 rounded-[22px] bg-white/8 px-4 py-3 text-xs">
            <div className="flex flex-wrap gap-2">
            {[
              { key: "mouse", label: "Mouse", icon: MousePointer2 },
              { key: "text", label: "Text box", icon: PenLine },
              { key: "highlight", label: "Highlight", icon: Highlighter },
              { key: "draw", label: "Draw / working", icon: Pencil },
              { key: "eraser", label: "Eraser", icon: Eraser }
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setCanvasTool(item.key as CanvasTool);
                  if (item.key === "text" || item.key === "highlight") {
                    addCanvasAnnotation(workspaceItem.id, item.key as Exclude<CanvasTool, "mouse">);
                  }
                }}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 transition ${
                  canvasTool === item.key
                    ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.24),rgba(57,208,255,0.2))] text-[var(--fg)]"
                    : "bg-white/10 text-[var(--muted)] hover:bg-white/16"
                }`}
              >
                <item.icon className="h-3.5 w-3.5 text-[var(--accent-sky)]" />
                {item.label}
              </button>
            ))}
            <span className="inline-flex items-center rounded-full bg-[rgba(121,247,199,0.12)] px-3 py-2 text-[var(--accent-mint)]">
              Pencil and S-Pen ready
            </span>
            {tabStrokes.length ? (
              <button
                type="button"
                onClick={() => setCanvasStrokes((current) => current.filter((stroke) => stroke.tabId !== workspaceItem.id))}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[var(--muted)] transition hover:bg-white/16"
              >
                <Trash2 className="h-3.5 w-3.5 text-[var(--accent-coral)]" />
                Clear drawings
              </button>
            ) : null}
            </div>
          </div>
        ) : null}

        {isCanvas && tabAnnotations.length ? (
          <div className="pointer-events-none absolute inset-0 z-30" data-annotation-layer>
            {tabAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                data-annotation-root
                className={`pointer-events-auto absolute rounded-[16px] border px-3 py-2 shadow-[0_16px_40px_rgba(6,10,24,0.28)] ${
                  annotation.tool === "highlight"
                    ? "border-[rgba(255,226,105,0.45)] bg-[rgba(255,226,105,0.28)]"
                    : "border-white/20 bg-[rgba(8,12,24,0.82)]"
                }`}
                style={{
                  left: `${annotation.x}%`,
                  top: `${annotation.y}%`,
                  width: annotation.width,
                  minHeight: annotation.height
                }}
              >
                <div
                  className="mb-2 flex cursor-move items-center justify-between gap-2"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    const container = (event.currentTarget.closest("[data-annotation-layer]") as HTMLElement) || event.currentTarget.parentElement;
                    if (!container) return;
                    const startX = event.clientX;
                    const startY = event.clientY;
                    const rect = container.getBoundingClientRect();
                    const originX = annotation.x;
                    const originY = annotation.y;

                    const onMove = (moveEvent: PointerEvent) => {
                      const nextX = originX + ((moveEvent.clientX - startX) / rect.width) * 100;
                      const nextY = originY + ((moveEvent.clientY - startY) / rect.height) * 100;
                      setCanvasAnnotations((current) =>
                        current.map((item) =>
                          item.id === annotation.id
                            ? {
                                ...item,
                                x: Math.max(0, Math.min(96, nextX)),
                                y: Math.max(0, Math.min(96, nextY))
                              }
                            : item
                        )
                      );
                    };

                    const onUp = () => {
                      window.removeEventListener("pointermove", onMove);
                      window.removeEventListener("pointerup", onUp);
                    };

                    window.addEventListener("pointermove", onMove);
                    window.addEventListener("pointerup", onUp);
                  }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-gold)]">
                    {annotation.tool}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCanvasAnnotations((current) => current.filter((item) => item.id !== annotation.id))}
                    className="rounded-full bg-white/10 p-1 transition hover:bg-white/16"
                    aria-label="Remove annotation"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <textarea
                  value={annotation.text}
                  onChange={(event) =>
                    setCanvasAnnotations((current) =>
                      current.map((item) => (item.id === annotation.id ? { ...item, text: event.target.value } : item))
                    )
                  }
                  className="min-h-[3rem] w-full resize both bg-transparent text-xs leading-5 outline-none"
                />
              </div>
            ))}
          </div>
        ) : null}

        {isCanvas ? (
          <div
            className={`absolute inset-x-0 bottom-0 top-[10.5rem] z-20 rounded-[24px] ${
              canvasCanInteract
                ? canvasTool === "eraser"
                  ? "cursor-cell touch-none"
                  : "cursor-crosshair touch-none"
                : "pointer-events-none"
            }`}
            onPointerDown={(event) => beginCanvasStroke(workspaceItem.id, event)}
            onPointerMove={moveCanvasStroke}
            onPointerUp={finishCanvasStroke}
            onPointerCancel={finishCanvasStroke}
          >
            <svg className="h-full w-full overflow-visible" aria-hidden="true">
              {drawableStrokes.map((stroke) => (
                <path
                  key={stroke.id}
                  d={strokePath(stroke.points)}
                  fill="none"
                  stroke={stroke.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={stroke.width}
                  opacity={stroke.tool === "highlight" ? 0.72 : 0.95}
                  style={{ filter: stroke.tool === "draw" ? "drop-shadow(0 0 8px rgba(105,232,238,0.28))" : undefined }}
                />
              ))}
            </svg>
          </div>
        ) : null}

        {isBrowse && workspaceItem.url ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-white/10 bg-white/8 px-4 py-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  const stack = browseHistory[workspaceItem.id] || [workspaceItem.url];
                  const idx = (browseHistoryIndex[workspaceItem.id] ?? 0) - 1;
                  if (idx < 0) return;
                  const prevUrl = stack[idx];
                  setBrowseHistoryIndex((cur) => ({ ...cur, [workspaceItem.id]: idx }));
                  setBrowseUrlInputs((cur) => ({ ...cur, [workspaceItem.id]: prevUrl }));
                  setBrowseReloadKeys((cur) => ({ ...cur, [workspaceItem.id]: (cur[workspaceItem.id] ?? 0) + 1 }));
                }}
                disabled={(browseHistoryIndex[workspaceItem.id] ?? 0) <= 0}
                className="rounded-full bg-white/10 px-2 py-1 transition hover:bg-white/16 disabled:opacity-40"
                aria-label="Back"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const stack = browseHistory[workspaceItem.id] || [workspaceItem.url];
                  const idx = (browseHistoryIndex[workspaceItem.id] ?? 0) + 1;
                  if (idx >= stack.length) return;
                  const nextUrl = stack[idx];
                  setBrowseHistoryIndex((cur) => ({ ...cur, [workspaceItem.id]: idx }));
                  setBrowseUrlInputs((cur) => ({ ...cur, [workspaceItem.id]: nextUrl }));
                  setBrowseReloadKeys((cur) => ({ ...cur, [workspaceItem.id]: (cur[workspaceItem.id] ?? 0) + 1 }));
                }}
                disabled={(browseHistoryIndex[workspaceItem.id] ?? 0) >= (browseHistory[workspaceItem.id]?.length ?? 1) - 1}
                className="rounded-full bg-white/10 px-2 py-1 transition hover:bg-white/16 disabled:opacity-40"
                aria-label="Forward"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const input = browseUrlInputs[workspaceItem.id] || workspaceItem.url || "";
                  let normalizedUrl = input.trim();
                  if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) {
                    normalizedUrl = `https://${normalizedUrl}`;
                  }
                  if (!normalizedUrl) return;
                  const stack = browseHistory[workspaceItem.id] || [workspaceItem.url || ""];
                  const idx = (browseHistoryIndex[workspaceItem.id] ?? 0) + 1;
                  const newStack = [...stack.slice(0, idx), normalizedUrl];
                  setBrowseHistory((cur) => ({ ...cur, [workspaceItem.id]: newStack }));
                  setBrowseHistoryIndex((cur) => ({ ...cur, [workspaceItem.id]: idx }));
                  setBrowseReloadKeys((cur) => ({ ...cur, [workspaceItem.id]: (cur[workspaceItem.id] ?? 0) + 1 }));
                  recordRecentWebsite(normalizedUrl, workspaceItem.label);
                }}
                className="flex min-w-0 flex-[3] items-center gap-1 rounded-full bg-black/10 px-3 py-1"
              >
                <input
                  value={browseUrlInputs[workspaceItem.id] ?? workspaceItem.url ?? ""}
                  onChange={(event) =>
                    setBrowseUrlInputs((cur) => ({ ...cur, [workspaceItem.id]: event.target.value }))
                  }
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                  placeholder="Enter a URL..."
                />
                <button
                  type="submit"
                  className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium transition hover:bg-white/16"
                >
                  Go
                </button>
              </form>
              <p className="muted hidden text-[11px] md:inline">Some sites block embedding — use Save as note or External.</p>
            </div>
            <iframe
              key={`${workspaceItem.id}-${browseReloadKeys[workspaceItem.id] ?? 0}`}
              src={`/api/browse-proxy?url=${encodeURIComponent(workspaceItem.url)}`}
              title={workspaceItem.label}
              loading="lazy"
              className="h-[min(72vh,900px)] w-full rounded-[24px] border border-white/10 bg-white"
              sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        ) : isSearch ? (
          <div className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">DuckDuckGo results</p>
              <p className="mt-2 text-lg font-semibold">{workspaceItem.query || "Search"}</p>
              <p className="muted mt-1 text-xs">Results open inside this studio. Import a page to make it tutor-readable.</p>
            </div>
            {(workspaceItem.results ?? []).length ? (
              (workspaceItem.results ?? []).map((result, index) => (
                <div key={`${workspaceItem.id}-${result.url || index}`} className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[var(--accent-mint)]">{result.source || (() => { try { return new URL(result.url).hostname; } catch { return "Web"; } })()}</p>
                      <p className="mt-1 text-base font-semibold text-[var(--accent-sky)]">{result.title}</p>
                      <p className="muted mt-2 text-sm leading-6">{result.snippet}</p>
                      <p className="muted mt-2 truncate text-xs">{result.url}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => openBrowseInWorkspace(result.url, result.title)}
                        size="sm"
                        variant="secondary"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </Button>
                      <Button onClick={() => importWebSource(result)} size="sm" disabled={importingSourceId === result.id}>
                        {importingSourceId === result.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Add source
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/16 bg-white/8 p-8 text-center text-sm">
                No results yet for {workspaceItem.query ? `“${workspaceItem.query}”` : "this search"}.
              </div>
            )}
          </div>
        ) : isOutput ? (
          interactiveOutputAction === "notes" ? (
            <AINotesConsole content={workspaceItem.output || ""} />
          ) : ["flashcards", "quiz", "exam"].includes(interactiveOutputAction || "") ? (
            renderToolResults()
          ) : (
            <article className={`${isCanvas ? "min-h-[58vh]" : ""} rounded-[28px] bg-white/8 p-5`}>
              <RichStudyText content={workspaceItem.output || "No output found for this tab."} />
            </article>
          )
        ) : workspaceItem.previewKind === "pdf" || workspaceItem.previewKind === "image" || workspaceItem.previewKind === "table" || workspaceItem.previewKind === "presentation" || workspaceItem.previewKind === "text" ? (
          <FileViewer
            url={workspaceItem.url}
            fileName={workspaceItem.file?.file_name || workspaceItem.label}
            previewKind={workspaceItem.previewKind}
            text={workspaceItem.text}
          />
        ) : null}
      </motion.div>
    );
  };

  const renderToolResults = () => {
    const renderDeckHeader = ({
      total,
      index,
      eyebrow,
      caption
    }: {
      total: number;
      index: number;
      eyebrow: string;
      caption: string;
    }) => (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">{eyebrow}</p>
          <p className="muted mt-2 text-sm">{caption}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium">
            {index + 1} / {total}
          </div>
          <button
            type="button"
            onClick={() => shiftToolCard(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/16"
            aria-label="Previous card"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => shiftToolCard(1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/16"
            aria-label="Next card"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );

    if (activeAction === "quiz" && parsedQuiz?.length) {
      const currentIndex = Math.min(toolCardIndex, parsedQuiz.length - 1);
      const item = parsedQuiz[currentIndex];
      const isOpen = Boolean(revealedQuiz[currentIndex]);
      const selectedOption = selectedQuizOption[currentIndex] || "";
      const correctOption = item.answer || "";
      const answeredCount = quizResultRows.filter((row) => row.selected).length;
      const correctCount = quizResultRows.filter((row) => row.isCorrect).length;

      return (
        <div className="space-y-3">
          {renderDeckHeader({
            total: parsedQuiz.length,
            index: currentIndex,
            eyebrow: "Quiz Deck",
            caption: "Swipe or move through the questions one by one."
          })}
          <motion.article
            key={`${item.question}-${currentIndex}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x <= -90) shiftToolCard(1);
              if (info.offset.x >= 90) shiftToolCard(-1);
            }}
            className={`rounded-[30px] border px-5 py-5 text-sm shadow-[0_24px_60px_rgba(6,10,24,0.18)] ${toolTones.quiz}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-mint)]">
              Question {currentIndex + 1}
            </p>
            <p className="mt-4 text-lg font-semibold leading-8">{item.question}</p>
            {item.options?.length ? (
              <div className="mt-5 space-y-3">
                {item.options.map((option) => (
                  <button
                    key={`${currentIndex}-${option}`}
                    type="button"
                    onClick={() => {
                      setSelectedQuizOption((current) => ({ ...current, [currentIndex]: option }));
                      setRevealedQuiz((current) => ({ ...current, [currentIndex]: false }));
                    }}
                    className={`w-full rounded-[18px] px-4 py-3 text-left text-sm leading-7 transition ${
                      isOpen && option === correctOption
                        ? "bg-[rgba(121,247,199,0.16)] ring-1 ring-[rgba(121,247,199,0.45)]"
                        : isOpen && option === selectedOption
                          ? "bg-[rgba(255,125,89,0.16)] ring-1 ring-[rgba(255,125,89,0.45)]"
                          : selectedOption === option
                            ? "bg-[rgba(57,208,255,0.18)] ring-1 ring-[rgba(57,208,255,0.45)]"
                            : "bg-white/10 hover:bg-white/14"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  if (!selectedOption && item.options?.length) {
                    setStatusNote("Pick an answer option first.");
                    return;
                  }
                  setStatusNote("");
                  if (!quizResults[currentIndex]) {
                    const nextResult: QuizResult = {
                      question: item.question,
                      selected: selectedOption,
                      correct: correctOption,
                      isCorrect: selectedOption === correctOption,
                      explanation: item.explanation || ""
                    };
                    setQuizResults((current) => ({ ...current, [currentIndex]: nextResult }));
                    updateMetrics((current) => ({
                      ...current,
                      quizAnswered: current.quizAnswered + 1,
                      quizCorrect: current.quizCorrect + (nextResult.isCorrect ? 1 : 0),
                      recentQuizResults: [nextResult, ...current.recentQuizResults].slice(0, 12)
                    }));
                  }
                  setRevealedQuiz((current) => ({ ...current, [currentIndex]: !isOpen }));
                }}
                variant="secondary"
                size="sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isOpen ? "Hide answer" : "Check answer"}
              </Button>
              <Button onClick={() => shiftToolCard(1)} variant="ghost" size="sm">
                Next question
              </Button>
            </div>
            {isOpen ? (
              <div className="mt-4 rounded-[22px] bg-white/12 p-4 text-sm">
                {item.answer ? (
                  <p className="font-semibold">
                    {selectedOption === correctOption ? "Correct" : "Correct answer"}: {item.answer}
                  </p>
                ) : null}
                {item.explanation ? <p className="muted mt-2 leading-7">{item.explanation}</p> : null}
              </div>
            ) : null}
          </motion.article>
          <div className="rounded-[24px] bg-white/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Quiz results table</p>
                <p className="muted mt-1 text-xs">Track what you answered, what was right, and what still needs a second pass.</p>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium">
                {correctCount} / {answeredCount || 0} correct
              </div>
            </div>
            <div className="mt-4 overflow-auto rounded-[20px] border border-white/10">
              <table className="min-w-full text-left text-xs md:text-sm">
                <thead className="bg-white/10">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Question</th>
                    <th className="px-3 py-2">Your answer</th>
                    <th className="px-3 py-2">Correct</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {quizResultRows.map((row) => (
                    <tr key={`quiz-row-${row.number}`} className="border-t border-white/10">
                      <td className="px-3 py-2 align-top">{row.number}</td>
                      <td className="px-3 py-2 align-top">{clipText(row.question, 120)}</td>
                      <td className="px-3 py-2 align-top">{row.selected || "Pending"}</td>
                      <td className="px-3 py-2 align-top">{row.correct || "—"}</td>
                      <td className="px-3 py-2 align-top">
                        {row.selected ? (
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                              row.isCorrect
                                ? "bg-[rgba(121,247,199,0.16)] text-[var(--accent-mint)]"
                                : "bg-[rgba(255,125,89,0.16)] text-[var(--accent-coral)]"
                            }`}
                          >
                            {row.isCorrect ? "Correct" : "Review"}
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (activeAction === "flashcards" && parsedFlashcards?.length) {
      const currentIndex = Math.min(toolCardIndex, parsedFlashcards.length - 1);
      const item = parsedFlashcards[currentIndex];
      const isOpen = Boolean(revealedFlashcards[currentIndex]);

      return (
        <div className="space-y-3">
          {renderDeckHeader({
            total: parsedFlashcards.length,
            index: currentIndex,
            eyebrow: "Flashcard Deck",
            caption: "Tap the card to flip it, then swipe or move to the next one."
          })}
          <motion.article
            key={`${item.front}-${currentIndex}-${isOpen ? "back" : "front"}`}
            initial={{ opacity: 0, y: 12, rotateY: isOpen ? 0 : 6 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x <= -90) shiftToolCard(1);
              if (info.offset.x >= 90) shiftToolCard(-1);
            }}
            whileHover={{ y: -2 }}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!isOpen) {
                updateMetrics((current) => ({
                  ...current,
                  flashcardsFlipped: current.flashcardsFlipped + 1
                }));
              }
              setRevealedFlashcards((current) => ({ ...current, [currentIndex]: !isOpen }));
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (!isOpen) {
                  updateMetrics((current) => ({
                    ...current,
                    flashcardsFlipped: current.flashcardsFlipped + 1
                  }));
                }
                setRevealedFlashcards((current) => ({ ...current, [currentIndex]: !isOpen }));
              }
            }}
            className={`w-full rounded-[34px] border px-6 py-8 text-left shadow-[0_24px_60px_rgba(6,10,24,0.22)] ${toolTones.flashcards}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--accent-gold)]">
              Flashcard {currentIndex + 1}
            </p>
            <div className="mt-8 min-h-[13rem]">
              <p className="text-2xl font-semibold leading-[1.35] md:text-[2rem]">
                {isOpen ? item.back : item.front}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="muted text-xs">{isOpen ? "Tap to flip back or press space for next" : "Tap to reveal the answer"}</p>
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  shiftToolCard(1);
                }}
                variant="secondary"
                size="sm"
              >
                Next card
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.article>
        </div>
      );
    }

    if (activeAction === "exam" && parsedExamQuestions.length) {
      const answeredCount = Object.values(examAnswers).filter((answer) => answer.trim()).length;

      return (
        <div className="space-y-3">
          <div className="rounded-[24px] border border-[rgba(255,209,102,0.18)] bg-[rgba(255,209,102,0.08)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-gold)]">Interactive exam mode</p>
                <p className="mt-2 text-sm font-semibold">Answer the paper online, then export a printable PDF when you want it on paper.</p>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium">
                {answeredCount}/{parsedExamQuestions.length} answered
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {parsedExamQuestions.map((question, index) => (
              <motion.article
                key={`exam-${question.number}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-[30px] border px-5 py-5 text-sm shadow-[0_24px_60px_rgba(6,10,24,0.18)] ${toolTones.exam}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                    Question {question.number}
                  </p>
                  {question.marks ? (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                      {question.marks}
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 whitespace-pre-wrap text-base leading-8">{question.prompt}</p>
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">Your answer</p>
                  <textarea
                    value={examAnswers[index] || ""}
                    onChange={(event) =>
                      setExamAnswers((current) => ({
                        ...current,
                        [index]: event.target.value
                      }))
                    }
                    placeholder="Write your answer here. Keep going question by question and export the paper when you want to print it."
                    className="mt-3 min-h-[10rem] w-full rounded-[22px] border border-white/14 bg-black/10 px-4 py-4 text-sm outline-none transition focus:border-[var(--accent-sky)]"
                  />
                </div>
              </motion.article>
            ))}
          </div>

          <details className="rounded-[24px] bg-white/10 px-4 py-4 text-sm">
            <summary className="cursor-pointer font-semibold">Show the full printable paper and mark scheme</summary>
            <div className="mt-4 rounded-[20px] border border-white/10 px-4 py-4">
              <RichStudyText content={output} />
            </div>
          </details>
        </div>
      );
    }

    if (activeAction === "insights") {
      return (
        <div className="space-y-3">
          <div className="rounded-[24px] border border-[rgba(255,125,89,0.18)] bg-[rgba(255,125,89,0.08)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">Study report</p>
                <p className="mt-2 text-sm font-semibold">Performance snapshot from this studio</p>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium">
                {currentMetrics.quizCorrect}/{currentMetrics.quizAnswered || 0} quiz correct
              </div>
            </div>
            <div className="mt-4 overflow-auto rounded-[20px] border border-white/10">
              <table className="min-w-full text-left text-xs md:text-sm">
                <thead className="bg-white/10">
                  <tr>
                    <th className="px-3 py-2">Signal</th>
                    <th className="px-3 py-2">What it says</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-white/10">
                    <td className="px-3 py-2 align-top">Quiz accuracy</td>
                    <td className="px-3 py-2 align-top">
                      {currentMetrics.quizAnswered
                        ? `${Math.round((currentMetrics.quizCorrect / currentMetrics.quizAnswered) * 100)}% across ${currentMetrics.quizAnswered} checked answer(s).`
                        : "No quiz answers checked yet."}
                    </td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="px-3 py-2 align-top">Flashcard activity</td>
                    <td className="px-3 py-2 align-top">{currentMetrics.flashcardsFlipped} card flip(s) recorded so far.</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="px-3 py-2 align-top">Most-used tools</td>
                    <td className="px-3 py-2 align-top">
                      {Object.entries(currentMetrics.toolRuns)
                        .filter(([, count]) => count > 0)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([action, count]) => `${action.replace(/_/g, " ")} (${count})`)
                        .join(", ") || "No tool runs yet."}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          {output ? (
            <motion.article
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-[26px] border px-5 py-5 ${toolTones[activeAction]}`}
            >
              <RichStudyText content={output} />
            </motion.article>
          ) : null}
        </div>
      );
    }

    if (activeAction === "summary" && output) {
      return (
        <motion.article
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-[26px] border px-5 py-5 ${toolTones[activeAction]}`}
        >
          <RichStudyText content={output} />
        </motion.article>
      );
    }

    if (activeAction === "notes" && output) {
      return <AINotesConsole content={output} />;
    }

    if (output && (looksRichOutput(output) || activeAction !== "summary")) {
      return (
        <motion.article
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-[26px] border px-5 py-5 ${toolTones[activeAction]}`}
        >
          <RichStudyText content={output} />
        </motion.article>
      );
    }

    if (parsedCards.length) {
      const currentIndex = Math.min(toolCardIndex, parsedCards.length - 1);
      const card = parsedCards[currentIndex];

      return (
        <div className="space-y-3">
          {renderDeckHeader({
            total: parsedCards.length,
            index: currentIndex,
            eyebrow: "Study Card",
            caption: "Move through one generated revision card at a time."
          })}
          <motion.article
            key={`${card.title}-${currentIndex}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x <= -90) shiftToolCard(1);
              if (info.offset.x >= 90) shiftToolCard(-1);
            }}
            className={`rounded-[30px] border px-6 py-6 text-sm shadow-[0_24px_60px_rgba(6,10,24,0.18)] ${toolTones[activeAction]}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
              {card.title}
            </p>
            <p className="mt-5 text-lg leading-8">{card.body}</p>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => shiftToolCard(1)} variant="ghost" size="sm">
                Next card
              </Button>
            </div>
          </motion.article>
        </div>
      );
    }

    return (
      <div className="rounded-[24px] bg-white/12 px-4 py-4 text-sm">
        <p className="font-semibold">Pick a tool to generate a study result.</p>
        <p className="muted mt-2">
          {toolsLocked
            ? "Upload a file first, then generate quizzes, flashcards, exams, summaries, and the rest from your own sources."
            : "Choose a tool, tailor it to the current studio, and the result stack will appear here."}
        </p>
      </div>
    );
  };

  return (
    <div className="px-3 pb-32 pt-3 md:px-4">
      <section>
        <div className="panel panel-border rounded-[30px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-coral)]">
                Studio
              </p>
              <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
                {currentSession?.title || "Study workspace"}
              </h1>
              <p className="muted mt-3 max-w-2xl text-sm md:text-base">
                Keep one studio loaded and move between files, chat, and practice tools without breaking context.
              </p>
            </div>
            <div className="relative flex flex-wrap items-center gap-2">
              <SecurityBadge compact />
              <WorkspaceTimer
                showTimerPopover={showTimerPopover}
                onToggleTimerPopover={() => setShowTimerPopover((current) => !current)}
                timerMode={timerMode}
                onSetTimerMode={setTimerMode}
                timerMinutes={timerMinutes}
                onSetTimerMinutes={setTimerMinutes}
                breakEveryMinutes={breakEveryMinutes}
                onSetBreakEveryMinutes={setBreakEveryMinutes}
                breakMinutes={breakMinutes}
                onSetBreakMinutes={setBreakMinutes}
                timerRemaining={timerRemaining}
                timerRunning={timerRunning}
                onSetTimerRunning={setTimerRunning}
                timerPhase={timerPhase}
                onSetTimerPhase={setTimerPhase}
                breakPopupOpen={breakPopupOpen}
                onSetBreakPopupOpen={setBreakPopupOpen}
                onSetTimerRemaining={setTimerRemaining}
                onStartStudyTimer={startStudyTimer}
                fileCount={currentFiles.length}
              />
            </div>
          </div>

          {statusNote ? (
            <div className="mt-4 rounded-[24px] bg-[rgba(57,208,255,0.12)] px-4 py-3 text-sm">
              {sanitizeDisplayText(statusNote, "Something went wrong. Please try again.")}
            </div>
          ) : null}
        </div>
      </section>

      <div className="mt-4 flex gap-2 lg:hidden">
        {(["chat", "tools"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-full px-3 py-2 text-xs font-medium capitalize transition ${
              tab === item ? "bg-[var(--fg)] text-[var(--bg)]" : "bg-white/15"
            }`}
          >
            {item === "chat" ? "Studio Workspace" : "AI Chat"}
          </button>
        ))}
      </div>

      <div
        ref={workspaceGridRef}
        className="mt-4 grid gap-4 lg:items-start"
        style={desktopGridStyle}
      >
        <aside className="hidden">
          <div className="panel panel-border rounded-[30px] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Studio</p>
                <p className="muted text-xs">Keep the current notebook focused and pull in other sources only when you need them.</p>
              </div>
              <div className="glass rounded-full px-3 py-1 text-xs font-medium">{sessionList.length} total</div>
            </div>

            <div className="rounded-[24px] bg-[linear-gradient(135deg,rgba(255,125,89,0.16),rgba(57,208,255,0.18))] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                <FolderOpen className="mt-0.5 h-4 w-4 text-[var(--accent-coral)]" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
                    Current studio
                  </p>
                  <p className="mt-2 truncate text-sm font-semibold">
                    {currentSession?.title || "Preparing your studio..."}
                  </p>
                  <p className="muted mt-1 text-xs">
                    {sourceEnabledCount} source-enabled file(s) ready in this notebook.
                  </p>
                </div>
                </div>
                {currentSession ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => renameStudio(currentSession.id, currentSession.title)}
                      disabled={renamingStudioId === currentSession.id || deletingStudioId === currentSession.id}
                      className="rounded-full bg-white/12 p-2 text-white/80 transition hover:bg-white/18 disabled:opacity-50"
                      aria-label="Rename current studio"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteStudio(currentSession.id, currentSession.title)}
                      disabled={deletingStudioId === currentSession.id || renamingStudioId === currentSession.id}
                      className="rounded-full bg-white/12 p-2 text-[var(--accent-coral)] transition hover:bg-white/18 disabled:opacity-50"
                      aria-label="Delete current studio"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[24px] bg-white/10 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-sm font-semibold">
                      <Timer className="h-4 w-4 text-[var(--accent-sky)]" />
                      Study timer
                    </p>
                    <p className="muted mt-1 text-xs">
                      {timerPhase === "break" ? "Break time" : timerPhase === "done" ? "Complete" : "Focus block"}
                    </p>
                  </div>
                  <div className="rounded-full bg-white/12 px-3 py-2 text-sm font-semibold tabular-nums">
                    {timerRemaining ? timerDisplay : `${timerMinutes}m`}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <label className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    Total
                    <input
                      value={timerMinutes}
                      onChange={(event) => setTimerMinutes(Math.max(1, Math.min(240, Number(event.target.value) || 1)))}
                      className="mt-1 w-full rounded-[14px] border border-white/10 bg-white/10 px-2 py-2 text-xs text-[var(--fg)] outline-none"
                      type="number"
                      min={1}
                      max={240}
                    />
                  </label>
                  <label className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    Break at
                    <input
                      value={breakEveryMinutes}
                      onChange={(event) => setBreakEveryMinutes(Math.max(1, Math.min(120, Number(event.target.value) || 1)))}
                      className="mt-1 w-full rounded-[14px] border border-white/10 bg-white/10 px-2 py-2 text-xs text-[var(--fg)] outline-none"
                      type="number"
                      min={1}
                      max={120}
                    />
                  </label>
                  <label className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    Break
                    <input
                      value={breakMinutes}
                      onChange={(event) => setBreakMinutes(Math.max(1, Math.min(60, Number(event.target.value) || 1)))}
                      className="mt-1 w-full rounded-[14px] border border-white/10 bg-white/10 px-2 py-2 text-xs text-[var(--fg)] outline-none"
                      type="number"
                      min={1}
                      max={60}
                    />
                  </label>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => startStudyTimer(timerMinutes)} size="sm" className="flex-1 justify-center">
                    <Play className="h-4 w-4" />
                    Start
                  </Button>
                  <Button onClick={() => setTimerRunning((current) => !current)} variant="secondary" size="sm" className="flex-1 justify-center">
                    {timerRunning ? "Pause" : "Resume"}
                  </Button>
                  <Button
                    onClick={() => {
                      setTimerRunning(false);
                      setTimerRemaining(0);
                      setTimerPhase("focus");
                    }}
                    variant="ghost"
                    size="sm"
                    className="px-3"
                  >
                    Reset
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-[24px] bg-white/10 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-sm font-semibold">
                      <Music className="h-4 w-4 text-[var(--accent-gold)]" />
                      Focus music
                    </p>
                    <p className="muted mt-1 text-xs">Connect accounts or use a quiet focus queue.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMusicPlaying((current) => !current)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                      musicPlaying ? "bg-[rgba(121,247,199,0.18)] text-[var(--accent-mint)]" : "bg-white/12 text-[var(--muted)]"
                    }`}
                  >
                    {musicPlaying ? "Playing" : "Paused"}
                  </button>
                </div>
                <div className="mt-3 rounded-[20px] border border-white/10 bg-black/10 px-3 py-3">
                  <p className="text-sm font-semibold">{selectedTrack?.title || "No music playing"}</p>
                  <p className="muted mt-1 text-xs">
            {selectedTrack ? `${selectedTrack.artist} • ${selectedTrack.mood}` : "Connect Spotify from the music panel. Free Spotify accounts may have limited playback."}
                  </p>
                </div>
                <div className="mt-3 flex gap-2">
                  <a
                    href={spotifyLoginHref}
                    className="flex-1 rounded-[16px] bg-white/10 px-3 py-2 text-center text-xs font-medium transition hover:bg-white/16"
                  >
                    {spotifyConnected ? "Spotify connected" : "Connect Spotify"}
                  </a>
                </div>
              </motion.div>
            </div>

            <div className="mt-4 grid gap-2">
              <Button onClick={() => createStudio()} variant="secondary" size="sm" className="w-full justify-center">
                <Plus className="h-4 w-4" />
                New studio
              </Button>
              <Button
                onClick={async () => {
                  const nextValue = !showStudioBrowser;
                  setShowStudioBrowser(nextValue);
                  if (nextValue) {
                    await refreshStudios();
                  }
                }}
                variant="ghost"
                size="sm"
                className="w-full justify-center rounded-[22px] bg-white/10"
              >
                {showStudioBrowser ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showStudioBrowser ? "Hide studios" : "Show more studios"}
              </Button>
            </div>

            {showStudioBrowser ? (
              <div className="hide-scrollbar mt-4 max-h-[18rem] space-y-2 overflow-auto pr-1">
                {studioBrowserRefreshing ? (
                  <div className="rounded-[22px] bg-white/12 px-4 py-4 text-sm">Refreshing your studios...</div>
                ) : sessionList.length ? (
                  sessionList.map((session) => {
                    const knownFileCount = getKnownFileCount(session.id);
                    const isCurrentStudio = activeSessionId === session.id;

                    return (
                      <div key={session.id} className="rounded-[22px] bg-white/12 px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{session.title}</p>
                            <p className="muted mt-1 text-xs">
                              {knownFileCount === null ? "Saved studio" : `${knownFileCount} source(s) known in this studio`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isCurrentStudio ? (
                              <div className="rounded-full bg-[rgba(57,208,255,0.16)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">
                                Current
                              </div>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => renameStudio(session.id, session.title)}
                              disabled={renamingStudioId === session.id || deletingStudioId === session.id}
                              className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/18 disabled:opacity-50"
                              aria-label={`Rename ${session.title}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteStudio(session.id, session.title)}
                              disabled={deletingStudioId === session.id || renamingStudioId === session.id}
                              className="rounded-full bg-white/10 p-2 text-[var(--accent-coral)] transition hover:bg-white/18 disabled:opacity-50"
                              aria-label={`Delete ${session.title}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {!isCurrentStudio ? (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => openStudio(session.id)}
                              className="rounded-[16px] bg-white/12 px-3 py-2 text-xs font-medium transition hover:bg-white/18"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => copySourcesFromStudio(session.id, session.title)}
                              disabled={copyingStudioId === session.id}
                              className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,rgba(255,125,89,0.2),rgba(57,208,255,0.18))] px-3 py-2 text-xs font-medium transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {copyingStudioId === session.id ? "Pasting..." : "Copy sources"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[22px] bg-white/12 px-4 py-4 text-sm">
                    Saved studios will appear here once studio storage is connected.
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-5">
              <Button
                onClick={() =>
                  openSourceModal(
                    sourceEnabledCount
                      ? "Add more files or search verified sources to expand this studio."
                      : "Add a file or a verified web source to unlock chat and tools.",
                    sourceEnabledCount ? "web" : "upload"
                  )
                }
                variant="secondary"
                size="sm"
                className="w-full justify-center"
              >
                <Upload className="h-4 w-4" />
                Add notes
              </Button>
            </div>

            <motion.div
              role="button"
              tabIndex={0}
              animate={dragOver ? { scale: 1.01 } : { scale: 1 }}
              onClick={() => quickImportInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  quickImportInputRef.current?.click();
                }
              }}
              onDragEnter={handleQuickImportDragEnter}
              onDragOver={handleQuickImportDragOver}
              onDragLeave={handleQuickImportDragLeave}
              onDrop={handleQuickImportDrop}
              className={`mt-4 rounded-[24px] border border-dashed p-4 text-center text-xs transition ${
                dragOver
                  ? "border-[rgba(57,208,255,0.6)] bg-[rgba(57,208,255,0.12)]"
                  : "border-white/20 bg-white/10"
              }`}
            >
              <p className="font-medium">{dragOver ? "Drop to import into this studio" : "Drop notes here for a quick import"}</p>
              <p className="muted mt-2">You can also click this area to browse files. Max {defaultMaxUploadFileSizeMb} MB per file.</p>
              <input
                ref={quickImportInputRef}
                type="file"
                multiple
                accept={uploadAcceptAttribute}
                className="hidden"
                onChange={(event) => {
                  uploadFiles(Array.from(event.target.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
            </motion.div>

            {uploading ? (
              <div className="mt-4 rounded-[22px] bg-white/10 p-3">
                <p className="mb-2 text-xs font-medium">Uploading files...</p>
                <div className="h-2 overflow-hidden rounded-full bg-black/10">
                  <motion.div
                    className="h-full bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-sky))]"
                    animate={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Files</p>
                  {copiedSourceClipboard && copiedSourceClipboard.sourceSessionId !== activeSessionId ? (
                    <button
                      type="button"
                      onClick={pasteCopiedSourcesIntoStudio}
                      disabled={copyingStudioId === copiedSourceClipboard.sourceSessionId}
                      className="inline-flex items-center gap-1 rounded-full bg-[rgba(57,208,255,0.14)] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--accent-sky)] transition hover:bg-[rgba(57,208,255,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Copy className="h-3 w-3" />
                      {copyingStudioId === copiedSourceClipboard.sourceSessionId
                        ? "Pasting..."
                        : `Paste from ${copiedSourceClipboard.sourceStudioTitle}`}
                    </button>
                  ) : null}
                </div>
                {fetchingFiles ? <p className="muted text-xs">Loading...</p> : null}
              </div>
              <div className="hide-scrollbar max-h-[24rem] space-y-2 overflow-auto pr-1">
                {currentFiles.length ? (
                  currentFiles.map((file) => (
                    <motion.div
                      key={file.id}
                      whileHover={{ y: -2 }}
                      className="rounded-[22px] bg-white/14 p-3 transition hover:bg-white/18"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button type="button" onClick={() => openFileInCanvas(file)} className="min-w-0 flex-1 text-left">
                          <p className="text-sm font-semibold">
                            <FileText className="mr-2 inline h-4 w-4 text-[var(--accent-sky)]" />
                            {file.file_name}
                          </p>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFileSource(file);
                            }}
                            disabled={togglingFileId === file.id}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              file.source_enabled === false
                                ? "bg-white/10 text-white/70 hover:bg-white/16"
                                : "bg-[rgba(121,247,199,0.14)] text-[var(--accent-mint)] hover:bg-[rgba(121,247,199,0.22)]"
                            }`}
                          >
                            {togglingFileId === file.id ? <LoaderCircle className="h-3 w-3 animate-spin" /> : null}
                            {file.source_enabled === false ? "Excluded" : "Source enabled"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openFileInCanvas(file)}
                            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em]"
                          >
                            <Eye className="h-3 w-3" />
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeFile(file);
                            }}
                            disabled={deletingFileId === file.id}
                            className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,125,89,0.14)] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--accent-coral)] transition hover:bg-[rgba(255,125,89,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingFileId === file.id ? (
                              <LoaderCircle className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            Remove
                          </button>
                        </div>
                      </div>
                      <button type="button" onClick={() => openFileInWorkspaceTab(file)} className="mt-2 w-full text-left">
                        {file.source_enabled === false ? (
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                            Excluded from tutor, tools, and revision plans
                          </p>
                        ) : null}
                        <p className="muted line-clamp-3 text-xs">{file.extracted_text}</p>
                      </button>
                    </motion.div>
                  ))
                ) : (
                  <div className="rounded-[22px] bg-white/12 px-4 py-4 text-sm">
                    No files yet. Upload lecture notes, a PDF, or screenshots to unlock the study tools.
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {false && desktopLayoutEnabled ? (
          <div className="hidden lg:flex lg:items-stretch">
            <button
              type="button"
              aria-label="Resize left panel"
              onMouseDown={() => setDraggingDivider("left")}
              className="group flex w-full cursor-col-resize items-center justify-center"
            >
              <span className="h-20 w-[4px] rounded-full bg-white/10 transition group-hover:bg-[rgba(57,208,255,0.36)]" />
            </button>
          </div>
        ) : null}

        <section
          className={`min-w-0 ${
            workspaceFullscreen
              ? "fixed inset-3 z-40 block lg:inset-5"
              : tab !== "chat"
                ? "hidden lg:block"
                : "block"
          }`}
        >
          <div
            className={`panel panel-border relative overflow-hidden rounded-[30px] p-4 transition ${
              screenAwarePulse ? "shadow-[0_0_0_2px_rgba(57,208,255,0.38),0_0_55px_rgba(255,125,89,0.22)]" : ""
            }`}
          >
            {screenAwarePulse ? (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[30px] opacity-80"
                animate={{
                  background: [
                    "radial-gradient(circle at 12% 20%, rgba(255,125,89,0.22), transparent 28%), radial-gradient(circle at 88% 18%, rgba(57,208,255,0.24), transparent 30%)",
                    "radial-gradient(circle at 82% 30%, rgba(121,247,199,0.22), transparent 30%), radial-gradient(circle at 20% 80%, rgba(255,209,102,0.18), transparent 28%)",
                    "radial-gradient(circle at 12% 20%, rgba(255,125,89,0.22), transparent 28%), radial-gradient(circle at 88% 18%, rgba(57,208,255,0.24), transparent 30%)"
                  ]
                }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : null}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Studio Workspace</p>
                <p className="muted text-xs">Open sources, notes, practice, and saved study results without losing your place.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setWorkspaceFullscreen((current) => !current)} variant="ghost" size="sm">
                  {workspaceFullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  {workspaceFullscreen ? "Exit workspace" : "Fullscreen"}
                </Button>
                <Button
                  onClick={() => setSplitPickerOpen((current) => !current)}
                  variant="ghost"
                  size="sm"
                  disabled={!activeWorkspaceDynamicTab && workspaceTab !== "home" && workspaceTab !== "sources"}
                >
                  <Copy className="h-4 w-4" />
                  Split view
                </Button>
                <Button onClick={() => setChatFullscreen(true)} variant="ghost" size="sm">
                  <Maximize2 className="h-4 w-4" />
                  Tutor focus
                </Button>
              </div>
            </div>

            <div className="relative z-10 mt-4 overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(5,10,22,0.18)]">
              <div className="flex gap-1 overflow-x-auto border-b border-white/10 bg-white/6 px-3 pt-3">
                {[
                  { key: "home", label: "Home" },
                  { key: "sources", label: `Notes (${sourceEnabledCount})` },
                  ...workspaceTabs.map((item) => ({ key: item.id, label: item.label, dynamic: item }))
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    draggable={"dynamic" in item && !!item.dynamic}
                    onDragStart={(event) => {
                      if (!("dynamic" in item) || !item.dynamic) return;
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", item.key);
                      setSplitDragTabId(item.key);
                      setSplitDropSide(null);
                    }}
                    onDragEnd={() => {
                      setSplitDragTabId(null);
                      setSplitDropSide(null);
                    }}
                    onClick={() => {
                      setWorkspaceTab(item.key);
                      if ("dynamic" in item && item.dynamic?.kind.includes("output") && item.dynamic.output) {
                        setActiveAction(item.dynamic.action ?? "summary");
                        setOutput(item.dynamic.output);
                      }
                    }}
                    onContextMenu={(event) => {
                      if (!("dynamic" in item) || !item.dynamic) return;
                      event.preventDefault();
                      setSplitWorkspaceTabId((current) => (current === item.key ? null : item.key));
                      setStatusNote(
                        splitWorkspaceTabId === item.key
                          ? "Split view closed."
                          : `${item.label} pinned to split view. Open another tab to compare side by side.`
                      );
                    }}
                    className={`group inline-flex items-center gap-2 rounded-t-[18px] px-4 py-2 text-xs font-semibold transition ${
                      workspaceTab === item.key
                        ? "bg-[rgba(255,255,255,0.16)] text-[var(--fg)]"
                        : splitWorkspaceTabId === item.key
                          ? "bg-[rgba(57,208,255,0.12)] text-[var(--accent-sky)]"
                          : "text-[var(--muted)] hover:bg-white/8 hover:text-[var(--fg)]"
                    } ${"dynamic" in item && item.dynamic ? "cursor-grab active:cursor-grabbing" : ""}`}
                    title={"dynamic" in item && item.dynamic ? "Drag left/right to split, or right-click to pin split view" : undefined}
                  >
                    {item.label}
                    {"dynamic" in item && item.dynamic ? (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          closeWorkspaceTab(item.key);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            closeWorkspaceTab(item.key);
                          }
                        }}
                        className="rounded-full p-0.5 opacity-60 transition hover:bg-white/12 hover:opacity-100"
                        aria-label={`Close ${item.label}`}
                      >
                        <X className="h-3 w-3" />
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
              {splitPickerOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-b border-white/10 bg-[rgba(8,14,28,0.78)] px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Choose a tab to compare</p>
                      <p className="muted mt-1 text-xs">Open a source, canvas, search, or output beside the current tab.</p>
                    </div>
                    <Button onClick={() => setSplitPickerOpen(false)} variant="ghost" size="sm">
                      <X className="h-4 w-4" />
                      Close
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {workspaceTabs.length ? workspaceTabs.map((item) => (
                      <button
                        key={`split-${item.id}`}
                        type="button"
                        onClick={() => {
                          setSplitWorkspaceTabId(item.id);
                          setSplitPickerOpen(false);
                          setStatusNote(`${item.label} opened in split view. Use the slider to adjust the workspace.`);
                        }}
                        disabled={item.id === workspaceTab}
                        className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                          item.id === workspaceTab
                            ? "cursor-not-allowed bg-white/6 text-white/40"
                            : "bg-white/10 hover:bg-white/16"
                        }`}
                      >
                        {item.label}
                      </button>
                    )) : (
                      <p className="muted text-sm">Open a note, search result, or AI output first, then split it beside another tab.</p>
                    )}
                  </div>
                </motion.div>
              ) : null}

              {splitDragTabId ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-x-3 top-16 z-30 grid min-h-[20rem] grid-cols-2 gap-3 rounded-[28px] border border-white/10 bg-[rgba(4,9,20,0.72)] p-3 backdrop-blur-xl"
                >
                  {(["left", "right"] as const).map((side) => (
                    <div
                      key={`split-drop-${side}`}
                      role="button"
                      tabIndex={0}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setSplitDropSide(side);
                      }}
                      onDragLeave={() => setSplitDropSide((current) => (current === side ? null : current))}
                      onDrop={(event) => {
                        event.preventDefault();
                        const draggedId = event.dataTransfer.getData("text/plain") || splitDragTabId;
                        openDraggedWorkspaceSplit(draggedId, side);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openDraggedWorkspaceSplit(splitDragTabId, side);
                        }
                      }}
                      className={`grid place-items-center rounded-[24px] border border-dashed p-6 text-center transition ${
                        splitDropSide === side
                          ? "border-[var(--accent-sky)] bg-[rgba(57,208,255,0.18)] shadow-[0_0_45px_rgba(57,208,255,0.16)]"
                          : "border-white/18 bg-white/8"
                      }`}
                    >
                      <motion.div
                        animate={{ y: splitDropSide === side ? -4 : 0, scale: splitDropSide === side ? 1.03 : 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 22 }}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-coral)]">
                          Split {side}
                        </p>
                        <p className="mt-2 text-lg font-semibold">
                          Drop tab on the {side}
                        </p>
                        <p className="muted mt-2 max-w-xs text-sm">
                          ScholarMind will keep another open workspace tab on the other side for comparison.
                        </p>
                      </motion.div>
                    </div>
                  ))}
                </motion.div>
              ) : null}

              <div ref={workspaceScrollRef} className="hide-scrollbar min-h-[38rem] max-h-[72vh] overflow-auto p-5">
                {workspaceTab === "home" ? (
                  <div className="space-y-5">
                    <div className="rounded-[30px] bg-[radial-gradient(circle_at_18%_20%,rgba(255,143,107,0.24),transparent_32%),radial-gradient(circle_at_86%_20%,rgba(107,221,255,0.2),transparent_30%),rgba(255,255,255,0.08)] p-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent-coral)]">
                        Personal AI tutor studio
                      </p>
                      <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
                        Turn notes into guided learning, not just outputs.
                      </h2>
                      <p className="muted mt-3 max-w-2xl text-sm leading-7">
                        Upload notes, open AI Notes for long textbook-style learning, then practise with quizzes, flashcards, exams, and tutor chat that stays grounded in this studio.
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button onClick={() => openTool("notes")} disabled={toolsLocked}>
                          <BookOpen className="h-4 w-4" />
                          Generate AI Notes
                        </Button>
                        <Button onClick={() => openTool("quiz")} variant="secondary" disabled={toolsLocked}>
                          Build Quiz
                        </Button>
                        <Button onClick={() => openSourceModal("Add notes to start this Studio.", "upload")} variant="ghost">
                          Add Notes
                        </Button>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2 text-xs">
                        {[
                          { label: "Select text", icon: MousePointer2 },
                          { label: "Annotate", icon: PenLine },
                          { label: "Highlight", icon: Highlighter }
                        ].map((item) => (
                          <span key={item.label} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[var(--muted)]">
                            <item.icon className="h-3.5 w-3.5 text-[var(--accent-sky)]" />
                            {item.label} in Open view
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[26px] border border-white/10 bg-white/8 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">Search the web inside this studio</p>
                          <p className="muted mt-1 text-xs">
                            Search the web via DuckDuckGo or paste a URL. Everything opens as a workspace tab inside this studio.
                          </p>
                        </div>
                        <div className="flex flex-[1.2] items-center gap-2 rounded-[22px] border border-white/10 bg-black/10 px-3 py-2">
                          <Search className="h-4 w-4 text-[var(--accent-sky)]" />
                          <input
                            value={workspaceSearchQuery}
                            onChange={(event) => setWorkspaceSearchQuery(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void searchWorkspaceSources();
                              }
                            }}
                            placeholder="Search DuckDuckGo or paste a URL..."
                            className="w-full bg-transparent text-sm outline-none"
                          />
                          <Button onClick={searchWorkspaceSources} size="sm" disabled={workspaceSearchLoading}>
                            {workspaceSearchLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            Search
                          </Button>
                        </div>
                      </div>
                      {workspaceSearchError ? (
                        <p className="mt-3 rounded-[18px] bg-[rgba(255,125,89,0.14)] px-3 py-2 text-xs">{workspaceSearchError}</p>
                      ) : null}
                    </div>

                    <div className="rounded-[26px] bg-white/8 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">Study tools</p>
                          <p className="muted mt-1 text-xs">Generate from enabled sources, then open results as Studio tabs.</p>
                        </div>
                        <Button onClick={() => openSourceModal("Add more notes.", "upload")} variant="ghost" size="sm">
                          <Plus className="h-4 w-4" />
                          Add note
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                        {actionButtons.map((action) => (
                          <button
                            key={`workspace-tool-${action.key}`}
                            type="button"
                            onClick={() => openTool(action.key)}
                            className={`rounded-[20px] px-3 py-3 text-left transition ${
                              activeAction === action.key
                                ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.22),rgba(57,208,255,0.2))]"
                                : "bg-white/10 hover:bg-white/16"
                            }`}
                          >
                            <p className="text-sm font-semibold">{action.label}</p>
                            <p className="muted mt-1 line-clamp-2 text-xs">{action.copy}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[26px] bg-white/8 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="font-semibold">Recent outputs</p>
                        <button type="button" onClick={openCurrentResultInWorkspaceTab} disabled={!output} className="muted text-xs hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-50">
                          Open latest
                        </button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {currentToolHistory.length ? (
                          currentToolHistory.slice(0, 4).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                openSavedToolResult(item);
                              }}
                              className="rounded-[22px] bg-white/10 p-4 text-left transition hover:bg-white/16"
                            >
                              <p className="text-sm font-semibold">{item.title}</p>
                              <p className="muted mt-2 line-clamp-2 text-xs">{item.preview}</p>
                            </button>
                          ))
                        ) : (
                          <div className="rounded-[22px] bg-white/10 p-4 text-sm md:col-span-2">
                            Generate AI Notes, a quiz, or flashcards and the output boxes will appear here.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[26px] bg-white/8 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="font-semibold">Recently viewed websites</p>
                        <span className="muted text-xs">Up to {maxRecentWebsites}</span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {recentWebsites.length ? (
                          recentWebsites.map((site) => (
                            <button
                              key={`${site.url}-${site.visitedAt}`}
                              type="button"
                              onClick={() => openBrowseInWorkspace(site.url, site.label)}
                              className="rounded-[22px] bg-white/10 p-4 text-left transition hover:bg-white/16"
                            >
                              <p className="text-sm font-semibold">{site.label}</p>
                              <p className="muted mt-2 truncate text-xs">{site.url}</p>
                            </button>
                          ))
                        ) : (
                          <div className="rounded-[22px] bg-white/10 p-4 text-sm md:col-span-2">
                            Search the web or paste a URL above. Sites you open will appear here for quick return visits.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {workspaceTab === "sources" ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Note tabs</p>
                        <p className="muted text-xs">Open a note preview, or exclude files from the AI when they should not count.</p>
                      </div>
                      <Button onClick={() => openSourceModal("Add more notes.", "upload")} size="sm">
                        <Plus className="h-4 w-4" />
                        Add note
                      </Button>
                    </div>
                    {currentFiles.length ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {currentFiles.map((file) => (
                          <div
                            key={`workspace-source-${file.id}`}
                            className="rounded-[24px] bg-white/10 p-4 transition hover:bg-white/16"
                          >
                            <button type="button" onClick={() => openFileInCanvas(file)} className="w-full text-left">
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-semibold">
                                <FileText className="mr-2 inline h-4 w-4 text-[var(--accent-sky)]" />
                                {file.file_name}
                                </p>
                                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                file.source_enabled === false ? "bg-white/10 text-white/60" : "bg-[rgba(121,247,199,0.14)] text-[var(--accent-mint)]"
                              }`}>
                                  {file.source_enabled === false ? "Excluded" : "Enabled"}
                                </span>
                              </div>
                              <p className="muted mt-3 line-clamp-4 text-xs">{file.extracted_text}</p>
                            </button>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button onClick={() => openFileInCanvas(file)} variant="secondary" size="sm">
                                <Maximize2 className="h-3.5 w-3.5" />
                                Open
                              </Button>
                              <Button
                                onClick={() => removeFile(file)}
                                variant="ghost"
                                size="sm"
                                disabled={deletingFileId === file.id}
                              >
                                {deletingFileId === file.id ? (
                                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5 text-[var(--accent-coral)]" />
                                )}
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-white/16 bg-white/8 p-8 text-center text-sm">
                        Upload files or import web sources to fill this tab.
                      </div>
                    )}
                  </div>
                ) : null}

                {workspaceTab === "result" ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {output ? actionButtons.find((item) => item.key === activeAction)?.label || "Generated result" : "AI Output"}
                        </p>
                        <p className="muted text-xs">Generated study results open here and can be reopened as workspace tabs.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={openCurrentResultInWorkspaceTab} variant="ghost" size="sm" disabled={!output}>
                          Open tab
                        </Button>
                        <Button onClick={openCurrentResultInCanvas} variant="secondary" size="sm" disabled={!output}>
                          <Maximize2 className="h-4 w-4" />
                          Open
                        </Button>
                        <Button onClick={exportCurrentResultAsJson} variant="ghost" size="sm" disabled={!output}>
                          Export JSON
                        </Button>
                        <Button onClick={exportCurrentResultAsPdf} variant="ghost" size="sm" disabled={!output}>
                          Export PDF
                        </Button>
                      </div>
                    </div>
                    {loading ? (
                      <div className="rounded-[26px] bg-white/10 p-6">
                        <LoaderCircle className="h-5 w-5 animate-spin text-[var(--accent-sky)]" />
                        <p className="mt-3 font-semibold">Generating inside the Studio workspace...</p>
                        <p className="muted mt-2 text-sm">The result will appear in this tab and be saved under Study Tools.</p>
                      </div>
                    ) : (
                      renderToolResults()
                    )}
                  </div>
                ) : null}

                {activeWorkspaceDynamicTab && splitWorkspaceTab && splitWorkspaceTab.id !== activeWorkspaceDynamicTab.id ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-white/8 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">Split workspace</p>
                        <p className="muted mt-1 text-xs">Comparing {activeWorkspaceDynamicTab.label} with {splitWorkspaceTab.label}. Right-click the pinned tab to close split view.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          aria-label="Adjust split view width"
                          type="range"
                          min={35}
                          max={65}
                          value={splitRatio}
                          onChange={(event) => setSplitRatio(Number(event.target.value))}
                        />
                        <Button onClick={() => setSplitWorkspaceTabId(null)} variant="ghost" size="sm">
                          <X className="h-4 w-4" />
                          Close split
                        </Button>
                      </div>
                    </div>
                    <div
                      className="grid gap-4"
                      style={{ gridTemplateColumns: `${splitRatio}% minmax(0,1fr)` }}
                    >
                      <div className="min-w-0">{renderWorkspaceDynamicTab(activeWorkspaceDynamicTab)}</div>
                      <div className="min-w-0">{renderWorkspaceDynamicTab(splitWorkspaceTab)}</div>
                    </div>
                  </div>
                ) : activeWorkspaceDynamicTab ? (
                  renderWorkspaceDynamicTab(activeWorkspaceDynamicTab)
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {desktopLayoutEnabled ? (
          <div className="hidden lg:flex lg:items-stretch">
            <button
              type="button"
              aria-label="Resize right panel"
              onMouseDown={() => setDraggingDivider("right")}
              className="group flex w-full cursor-col-resize items-center justify-center"
            >
              <span className="h-20 w-[4px] rounded-full bg-white/10 transition group-hover:bg-[rgba(57,208,255,0.36)]" />
            </button>
          </div>
        ) : null}

        <aside
          className={`min-w-0 ${
            chatFullscreen
              ? "fixed inset-3 z-40 block lg:inset-5"
              : tab !== "tools"
                ? "hidden lg:block"
                : "block"
          }`}
        >
          <div className="space-y-4">
          <div className="panel panel-border rounded-[30px] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">AI Tutor</p>
                <p className="muted text-xs">Step-by-step help grounded to enabled sources and your study profile.</p>
              </div>
              <div className="glass rounded-full px-4 py-2 text-xs font-medium">
                {sourceEnabledCount ? "Ready" : "Upload required"}
              </div>
              <Button
                onClick={startNewChat}
                variant="ghost"
                size="sm"
              >
                New chat
              </Button>
              <Button
                onClick={() => setShowChatThreads((current) => !current)}
                variant="ghost"
                size="sm"
              >
                <BookOpen className="h-4 w-4" />
                Recent
              </Button>
              {chatFullscreen ? (
                <Button onClick={() => setChatFullscreen(false)} variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                  Exit
                </Button>
              ) : (
                <Button onClick={() => setChatFullscreen(true)} variant="ghost" size="sm">
                  <Maximize2 className="h-4 w-4" />
                  Fullscreen
                </Button>
              )}
            </div>

            {showChatThreads ? (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-[24px] border border-white/10 bg-white/8 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Recent chats</p>
                    <p className="muted mt-1 text-xs">Restore or delete saved tutor conversations for this studio.</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{chatThreads.length} saved</span>
                </div>
                <div className="mt-3 grid gap-2">
                  {chatThreads.length ? chatThreads.map((thread) => (
                    <div key={thread.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[18px] bg-black/10 px-3 py-2">
                      <button type="button" onClick={() => restoreChatThread(thread)} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-semibold">{thread.title}</p>
                        <p className="muted mt-1 text-[11px]">
                          {thread.messages.length} messages • {new Date(thread.updatedAt).toLocaleDateString()}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteChatThread(thread.id)}
                        className="rounded-full bg-[rgba(255,125,89,0.14)] p-2 text-[var(--accent-coral)] transition hover:bg-[rgba(255,125,89,0.22)]"
                        aria-label={`Delete ${thread.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )) : (
                    <div className="rounded-[18px] border border-dashed border-white/14 bg-white/6 p-4 text-sm">
                      No saved chats yet. Start a new chat after a conversation and it will appear here.
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}

            <div
              ref={chatViewportRef}
              className={`hide-scrollbar mt-4 space-y-3 overflow-auto rounded-[26px] bg-[rgba(12,18,34,0.12)] p-4 ${
                chatFullscreen ? "min-h-[calc(100vh-12rem)] max-h-[calc(100vh-12rem)]" : "min-h-[34rem] lg:max-h-[calc(100vh-18rem)]"
              }`}
            >
              {!sourceEnabledCount ? (
                <div className="rounded-[24px] border border-[rgba(255,125,89,0.2)] bg-[linear-gradient(135deg,rgba(255,125,89,0.16),rgba(57,208,255,0.14))] p-4 text-sm">
                  <p className="font-semibold">Upload sources or files to continue</p>
                  <p className="muted mt-2">
                    Tutor chat and tools unlock after this studio has at least one source-enabled file.
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="rounded-[24px] bg-white/16 p-5 text-sm">
                  <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.9),rgba(57,208,255,0.35)_28%,rgba(255,125,89,0.22)_58%,transparent_70%)] shadow-[0_0_50px_rgba(57,208,255,0.28)]">
                    <motion.div
                      className="h-12 w-12 rounded-full border border-white/40 bg-white/12"
                      animate={{ scale: [0.92, 1.08, 0.92], rotate: [0, 8, -8, 0] }}
                      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  <p className="mt-5 font-semibold">Ask your tutor</p>
                  <div className="mt-3 grid gap-2">
                    {[
                      "Can you please explain what’s on my screen?",
                      "Teach this step by step.",
                      "Quiz me on the hardest part."
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setChat(prompt)}
                        className="rounded-[16px] bg-white/10 px-3 py-2 text-left text-xs transition hover:bg-white/16"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <motion.div
                    key={`${message.role}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-[24px] px-4 py-3 ${
                      message.role === "user"
                        ? "ml-auto max-w-[88%] bg-[linear-gradient(135deg,rgba(255,125,89,0.18),rgba(57,208,255,0.2))]"
                        : "max-w-[95%] bg-white/16"
                    }`}
                  >
                    {message.role === "user" ? (
                      <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                    ) : !message.content.trim() ? (
                      <div className="flex items-center gap-2 text-sm">
                        <LoaderCircle className="h-4 w-4 animate-spin text-[var(--accent-sky)]" />
                        <p className="font-semibold">Thinking through the sources...</p>
                      </div>
                    ) : (
                      <RichStudyText content={sanitizeDisplayText(message.content, "Unable to generate that reply.")} />
                    )}
                  </motion.div>
                ))
              )}
              {chatLoading ? (
                <div className="rounded-[24px] bg-white/16 px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin text-[var(--accent-sky)]" />
                    <p className="font-semibold">Building a guided answer...</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={chat}
                onChange={(event) => setChat(event.target.value)}
                onKeyDown={onChatKeyDown}
                placeholder={sourceEnabledCount ? "Ask your tutor..." : "Say hi, or upload files for source-grounded tutoring"}
                className="w-full rounded-[20px] border border-white/20 bg-white/20 px-4 py-3 text-sm outline-none transition focus:border-[var(--accent-sky)] focus:bg-white/35"
              />
              <Button onClick={sendChat} className="shrink-0 px-4" disabled={loading || chatLoading}>
                {chatLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Study Tools</p>
                <p className="muted text-xs">Pick a tool and generate from the uploaded sources.</p>
              </div>
              <div className="glass rounded-full px-3 py-1 text-xs font-medium capitalize">
                {actionButtons.find((item) => item.key === activeAction)?.label || activeAction.replace("_", " ")}
              </div>
            </div>

            <div className="mt-4 rounded-[24px] bg-white/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
                    Source stack
                  </p>
                  <p className="mt-2 text-sm font-semibold">{sourceEnabledCount} source-enabled file(s)</p>
                  <p className="muted mt-2 text-xs">{currentFilesLabel}</p>
                </div>
                {!toolsLocked ? (
                  <div className="rounded-full bg-[rgba(121,247,199,0.14)] px-3 py-1 text-xs font-medium text-[var(--accent-mint)]">
                    Ready
                  </div>
                ) : (
                  <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">Upload required</div>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {actionButtons.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => openTool(action.key)}
                  className={`rounded-[20px] px-3 py-3 text-left transition ${
                    activeAction === action.key
                      ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.22),rgba(57,208,255,0.2))]"
                      : "bg-white/12 hover:bg-white/18"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{action.label}</p>
                    {action.key === "exam" ? (
                      <span className="rounded-full bg-[rgba(255,209,102,0.14)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-gold)]">
                        {effectiveSiteSettings.examWeeklyLimit}/week
                      </span>
                    ) : action.key === "concepts" ? (
                      <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                        uses quota
                      </span>
                    ) : null}
                  </div>
                  <p className="muted mt-1 text-xs">{action.copy}</p>
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-[22px] bg-white/10 px-4 py-3 text-xs">
              <p className="font-semibold">Free preview limits</p>
              <p className="muted mt-2">
                Up to {effectiveSiteSettings.aiDailyLimit} AI runs per day. Full exam papers are heavier and capped at {effectiveSiteSettings.examWeeklyLimit} per week.
              </p>
            </div>

            <div className="mt-4 rounded-[24px] border border-[rgba(255,209,102,0.16)] bg-[linear-gradient(135deg,rgba(255,209,102,0.08),rgba(57,208,255,0.08))] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                    Research Mode
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {effectiveSiteSettings.researchModeLocked ? "Locked for Pro" : "Available soon in this workspace"}
                  </p>
                  <p className="muted mt-2 text-xs">
                    {effectiveSiteSettings.researchModeLocked
                      ? "Multi-source web research, cross-checking, and deeper scholar-style briefs are coming soon."
                      : "Host settings have unlocked this panel, but the deeper research workflow is still being finished."}
                  </p>
                </div>
                <div className="rounded-full bg-[rgba(255,209,102,0.12)] px-3 py-1 text-xs font-medium text-[var(--accent-gold)]">
                  {effectiveSiteSettings.researchModeLocked ? "Pro" : "Live setting"}
                </div>
              </div>
              <Button
                onClick={() =>
                  setStatusNote(
                    effectiveSiteSettings.researchModeLocked
                      ? "Research Mode is a Pro feature and is coming soon."
                      : "Research Mode has been unlocked in settings, but the deeper workflow is still coming soon."
                  )
                }
                variant="ghost"
                size="sm"
                className="mt-4 w-full justify-center rounded-[18px] bg-white/10"
              >
                <Lock className="h-4 w-4" />
                {effectiveSiteSettings.researchModeLocked ? "Coming soon" : "Preview status"}
              </Button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button onClick={createReminder} variant="secondary" className="flex-1 justify-center" disabled={loading || toolsLocked}>
                <Timer className="h-4 w-4" />
                Set reminder
              </Button>
              <Button onClick={openRevisionSchedule} variant="ghost" className="flex-1 justify-center rounded-[18px] bg-white/10">
                <CalendarDays className="h-4 w-4" />
                Revision schedule
              </Button>
            </div>

              {loading ? (
                <div className="mt-4 rounded-[22px] border border-white/12 bg-[rgba(12,18,34,0.26)] p-4">
                  <p className="text-sm font-semibold">Generating from your uploaded sources...</p>
                  <p className="muted mt-2 text-xs">
                    The result will land in the studio and stay tied to this notebook.
                  </p>
                  <div className="mt-4 flex gap-2">
                    {[0, 1, 2].map((item) => (
                      <motion.div
                        key={item}
                        className="h-2 flex-1 rounded-full bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-sky))]"
                        animate={{ opacity: [0.25, 1, 0.25], scaleX: [0.96, 1.02, 0.96] }}
                        transition={{ duration: 1.1, delay: item * 0.14, repeat: Infinity }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Generated in this studio</p>
                  <p className="muted text-xs">Clickable study outputs stay here so you can reopen them quickly.</p>
                </div>
                <div className="glass rounded-full px-3 py-1 text-xs font-medium">{currentToolHistory.length} saved</div>
              </div>
              <div className="hide-scrollbar max-h-[16rem] space-y-2 overflow-auto pr-1">
                {currentToolHistory.length ? (
                  currentToolHistory.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openSavedToolResult(item)}
                      className="w-full rounded-[22px] bg-white/12 p-3 text-left transition hover:bg-white/18"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{item.title}</p>
                          <p className="muted mt-1 text-xs">
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em]">
                          {item.label}
                        </div>
                      </div>
                      <p className="muted mt-2 line-clamp-3 text-xs">{item.preview}</p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[22px] bg-white/10 px-4 py-4 text-sm">
                    Saved study outputs will appear here once you generate a summary, quiz, flashcard deck, concept map, study plan, or exam.
                  </div>
                )}
              </div>
            </div>

            <div className="playful-bob mt-4 rounded-[24px] bg-[linear-gradient(135deg,rgba(255,125,89,0.16),rgba(57,208,255,0.14))] p-4 text-sm">
              <div className="flex items-start gap-3">
                {toolsLocked ? (
                  <Upload className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-coral)]" />
                ) : (
                  <Brain className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-coral)]" />
                )}
                <div>
                  <p className="font-semibold">{toolsLocked ? "Next step" : "Source-first workflow"}</p>
                  <p className="mt-2">
                    {toolsLocked
                      ? "Upload lecture notes, PDFs, or screenshots in the files panel first. The generators stay tied to uploaded sources so the outputs are based on your material."
                      : "The quiz, flashcard, summary, and concept tools are now generated directly from the files in this workspace instead of acting like generic one-click buttons."}
                  </p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </aside>
      </div>

      <footer className="mt-6 text-center text-xs text-[var(--muted)]">
        Need help? Email{" "}
        <a href="mailto:hello.minddevelopment@gmail.com" className="font-semibold text-[var(--accent-sky)] hover:underline">
          hello.minddevelopment@gmail.com
        </a>
      </footer>

      <SpotifyPlaybackProvider connected={spotifyConnected}>
        <DynamicIslandMusicPlayer />
      </SpotifyPlaybackProvider>

      {sourceModalOpen ? (
        <SourceModal
          sourceModalReason={sourceModalReason}
          sourceModalMode={sourceModalMode}
          sourceSearchResults={sourceSearchResults}
          sourceModalLoading={sourceModalLoading}
          sourceModalError={sourceModalError}
          sourceSearchWarning={sourceSearchWarning}
          sourceResultFilter={sourceResultFilter}
          filteredSourceResults={filteredSourceResults}
          visibleSourceResults={visibleSourceResults}
          visibleSourceSearchResults={visibleSourceSearchResults}
          importingSourceId={importingSourceId}
          uploading={uploading}
          uploadProgress={uploadProgress}
          onClose={closeSourceModal}
          onSetSourceModalMode={setSourceModalMode}
          onSetSourceResultFilter={setSourceResultFilter}
          onSetVisibleSourceResults={setVisibleSourceResults}
          onImportWebSource={importWebSource}
          onUploadFiles={uploadFiles}
        />
      ) : null}

      {false /* SourceModal inline JSX removed — see SourceModal.tsx */ ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(2,6,23,0.6)] px-4 py-6 backdrop-blur-sm">
          <div className="panel panel-border relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
                  Add Notes
                </p>
                <h3 className="mt-1 text-lg font-semibold">Upload notes, PDFs, documents, or screenshots</h3>
                <p className="muted mt-2 text-sm">{sourceModalReason}</p>
              </div>
              <button
                type="button"
                onClick={closeSourceModal}
                className="glass inline-flex rounded-full p-2.5"
                aria-label="Close source modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="hide-scrollbar flex-1 overflow-auto p-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSourceModalMode("upload")}
                  className="rounded-full bg-[linear-gradient(135deg,rgba(255,125,89,0.22),rgba(57,208,255,0.18))] px-4 py-2 text-sm font-medium transition"
                >
                  <Upload className="mr-2 inline h-4 w-4" />
                  Upload notes
                </button>
              </div>

              <div className="mt-4 rounded-[26px] bg-white/8 p-4">
                <div className="flex flex-col gap-3 md:flex-row">
                  <button
                    type="button"
                    onClick={() => quickImportInputRef.current?.click()}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-[20px] bg-white/12 px-4 py-8 text-sm font-medium transition hover:bg-white/18"
                  >
                    <Upload className="h-4 w-4" />
                    Browse files
                  </button>
                  <div className="flex-[1.4] rounded-[20px] border border-dashed border-white/16 bg-black/10 p-4 text-sm">
                    <p className="font-semibold">Supported study notes</p>
                    <p className="muted mt-2">
                      Upload PDFs, images, text files, and common documents here. Web research stays inside the Studio search tab so it does not mix with note uploads.
                    </p>
                  </div>
                </div>

                {uploading ? (
                  <div className="mt-4 rounded-[20px] bg-white/10 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <p className="font-semibold">Uploading sources...</p>
                      <p className="muted text-xs">{Math.round(uploadProgress)}%</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/10">
                      <motion.div
                        className="h-full bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-sky))]"
                        animate={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                {sourceModalError ? (
                  <div className="mt-4 rounded-[20px] bg-[rgba(255,125,89,0.14)] px-4 py-3 text-sm">
                    {sourceModalError}
                  </div>
                ) : null}

                {sourceSearchWarning ? (
                  <div className="mt-4 rounded-[20px] bg-[rgba(255,209,102,0.12)] px-4 py-3 text-sm text-[rgba(255,248,229,0.96)]">
                    {sourceSearchWarning}
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {sourceModalMode === "web" && sourceSearchResults.length ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: "all", label: "All sources" },
                          { key: "verified", label: "Verified only" },
                          { key: "scholar", label: "Scholar + trusted" },
                          { key: "open_web", label: "Open web" }
                        ].map((filter) => (
                          <button
                            key={filter.key}
                            type="button"
                            onClick={() => {
                              setSourceResultFilter(filter.key as typeof sourceResultFilter);
                              setVisibleSourceResults(12);
                            }}
                            className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                              sourceResultFilter === filter.key
                                ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.24),rgba(57,208,255,0.2))]"
                                : "bg-white/10"
                            }`}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-3 text-xs">
                        <p className="muted">
                          {filteredSourceResults.length} result{filteredSourceResults.length === 1 ? "" : "s"} after filters
                        </p>
                        {sourceResultFilter !== "all" ? (
                          <button
                            type="button"
                            onClick={() => setSourceResultFilter("all")}
                            className="rounded-full bg-white/10 px-3 py-2 font-medium transition hover:bg-white/14"
                          >
                            Clear filter
                          </button>
                        ) : null}
                      </div>

                      {visibleSourceSearchResults.length ? visibleSourceSearchResults.map((result, index) => (
                      <div key={`${result.id}-${result.url}-${index}`} className="rounded-[22px] border border-white/10 bg-white/8 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold">{result.title}</p>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${trustBadgeTone(result.trustLabel)}`}
                              >
                                {(result.trustLabel === "Verified" || result.trustLabel === "Scholar") ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <Globe2 className="h-3 w-3" />
                                )}
                                {result.trustLabel}
                              </span>
                              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px]">{result.source}</span>
                            </div>
                            <p className="muted mt-2 text-xs leading-5">{result.snippet}</p>
                            {result.trustLabel === "Web" ? (
                              <p className="mt-2 text-[11px] text-[rgba(255,248,229,0.82)]">
                                Open-web result. Double-check it before revising from it.
                              </p>
                            ) : null}
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noreferrer"
                              className="muted mt-3 inline-flex items-center gap-2 text-xs hover:text-[var(--fg)]"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              {result.url}
                            </a>
                          </div>
                          <Button
                            onClick={() => importWebSource(result)}
                            className="justify-center md:min-w-[9rem]"
                            disabled={importingSourceId === result.id}
                          >
                            {importingSourceId === result.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
                            Add source
                          </Button>
                        </div>
                      </div>
                      )) : (
                        <div className="rounded-[22px] border border-dashed border-white/12 bg-white/6 px-4 py-6 text-sm">
                          <p className="font-semibold">No sources match this filter yet.</p>
                          <p className="muted mt-2">
                            Try another filter, switch the search engine, or broaden the search wording so Scholar mode can return stronger results.
                          </p>
                        </div>
                      )}

                      {filteredSourceResults.length > visibleSourceResults ? (
                        <div className="flex justify-center pt-1">
                          <Button
                            onClick={() => setVisibleSourceResults((current) => current + 12)}
                            variant="secondary"
                            size="sm"
                          >
                            More sources
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </>
                  ) : sourceModalMode === "web" && !sourceModalLoading ? (
                    <div className="rounded-[22px] border border-dashed border-white/12 bg-white/6 px-4 py-6 text-sm">
                      <p className="font-semibold">Search for a scholar-style source, trusted explainer, article, or reference page.</p>
                      <p className="muted mt-2">
Scholar mode is the default, and you can switch to DuckDuckGo if you want a wider search. Imported web sources become part of this studio just like uploaded notes, so chat and tools stay source-grounded.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toolModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(2,6,23,0.6)] px-4 py-6 backdrop-blur-sm">
          <div className="panel panel-border relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[30px]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-sky)]">
                  Customize Tool
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  {actionButtons.find((item) => item.key === toolDraft.action)?.label || "Tool"} generator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setToolModalOpen(false)}
                className="glass inline-flex rounded-full p-2.5"
                aria-label="Close tool modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="hide-scrollbar flex-1 overflow-auto p-5">
              {toolModalView === "result" && !loading ? (
                <div>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Generated inside this studio</p>
                      <p className="muted mt-1 text-xs">The result below is tied to your current uploaded sources.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button onClick={openCurrentResultInCanvas} variant="secondary" size="sm">
                        <Maximize2 className="h-4 w-4" />
                        Open
                      </Button>
                      <Button onClick={exportCurrentResultAsJson} variant="ghost" size="sm">
                        Export JSON
                      </Button>
                      <Button onClick={exportCurrentResultAsPdf} variant="ghost" size="sm">
                        Export PDF
                      </Button>
                      <Button onClick={() => setToolModalView("setup")} variant="secondary" size="sm">
                        Tune again
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">{renderToolResults()}</div>
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-[1.2fr_0.9fr]">
                  <div className="rounded-[26px] bg-white/10 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
                      Generator setup
                    </p>

                    <div className="mt-5">
                      <p className="text-sm font-medium">Number of items</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          { label: "Fewer", value: Math.max(3, createToolDraft(toolDraft.action).count - 2) },
                          { label: "Standard", value: createToolDraft(toolDraft.action).count },
                          {
                            label: "More",
                            value: Math.min(toolDraft.action === "exam" ? 18 : 12, createToolDraft(toolDraft.action).count + 3)
                          }
                        ].map((option) => (
                          <button
                            key={`${toolDraft.action}-${option.label}`}
                            type="button"
                            onClick={() => setToolDraft((current) => ({ ...current, count: option.value }))}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                              toolDraft.count === option.value
                                ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.24),rgba(57,208,255,0.2))]"
                                : "bg-white/10"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {toolDraft.action === "exam" ? (
                      <div className="mt-5">
                        <p className="text-sm font-medium">Exam mode</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {[
                            { value: "practice", label: "Few practice questions" },
                            { value: "full", label: "Full mock exam" }
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                setToolDraft((current) => ({
                                  ...current,
                                  examMode: option.value as "practice" | "full",
                                  count: option.value === "practice" ? Math.min(current.count, 8) : Math.max(current.count, 14)
                                }))
                              }
                              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                toolDraft.examMode === option.value
                                  ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.24),rgba(57,208,255,0.2))]"
                                  : "bg-white/10"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-5">
                      <p className="text-sm font-medium">Difficulty</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(["foundation", "exam"] as const).map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setToolDraft((current) => ({ ...current, difficulty: level }))}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                              toolDraft.difficulty === level
                                ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.24),rgba(57,208,255,0.2))]"
                                : "bg-white/10"
                            }`}
                          >
                            {level === "foundation" ? "Foundation" : "Exam"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="text-sm font-medium">What should it focus on?</p>
                      <textarea
                        value={toolDraft.focus}
                        onChange={(event) => setToolDraft((current) => ({ ...current, focus: event.target.value }))}
                        placeholder="Try: chapter 4 definitions, likely exam traps, formulas, key dates..."
                        className="mt-3 min-h-[10rem] w-full rounded-[22px] border border-white/14 bg-black/10 px-4 py-4 text-sm outline-none transition focus:border-[var(--accent-sky)]"
                      />
                    </div>
                  </div>

                  <div className="rounded-[26px] bg-white/8 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-sky)]">
                      Live preview
                    </p>
                    <p className="mt-3 text-sm font-semibold">
                      {actionButtons.find((item) => item.key === toolDraft.action)?.label || "Tool"} will use {sourceEnabledCount} source-enabled file(s)
                    </p>
                    <p className="muted mt-2 text-sm">{currentFilesLabel}</p>

                    {loading ? (
                      <div className="mt-6 rounded-[22px] border border-white/12 bg-[rgba(12,18,34,0.26)] p-4">
                        <p className="text-sm font-semibold">Generating from your uploaded sources...</p>
                        <div className="mt-4 flex gap-2">
                          {[0, 1, 2].map((item) => (
                            <motion.div
                              key={item}
                              className="h-2 flex-1 rounded-full bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-sky))]"
                              animate={{ opacity: [0.25, 1, 0.25], scaleX: [0.96, 1.02, 0.96] }}
                              transition={{ duration: 1.1, delay: item * 0.14, repeat: Infinity }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 rounded-[22px] bg-[linear-gradient(135deg,rgba(255,125,89,0.12),rgba(57,208,255,0.12))] p-4 text-sm">
                        <p className="font-semibold">What happens next</p>
                        <p className="mt-2">
                          Generate here, then use the interactive result stack to quiz yourself, flip flashcards, or skim the summary without leaving the studio.
                        </p>
                        {toolDraft.action === "exam" ? (
                          <p className="mt-3 text-xs text-[rgba(255,248,229,0.88)]">
                            Full exam generation is capped at {defaultExamGeneratorWeeklyLimit} times per week in the free preview.
                          </p>
                        ) : null}
                      </div>
                    )}

                    <div className="mt-6 flex items-center gap-2">
                      <Button onClick={generateSelectedTool} className="flex-1 justify-center" disabled={loading}>
                        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                        Generate
                      </Button>
                      <Button onClick={() => setToolModalOpen(false)} variant="secondary" className="shrink-0 px-4">
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {preview.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(2,6,23,0.56)] px-4 py-6 backdrop-blur-sm">
          <div className="panel panel-border relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px]">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
                  Source preview
                </p>
                <h3 className="mt-1 truncate text-lg font-semibold">{preview.file?.file_name || "File preview"}</h3>
              </div>
              <div className="flex items-center gap-2">
                {preview.file ? (
                  <button
                    type="button"
                    onClick={() => removeFile(preview.file as FileItem)}
                    disabled={deletingFileId === preview.file.id}
                    className="inline-flex items-center gap-2 rounded-full bg-[rgba(255,125,89,0.14)] px-3 py-2 text-xs font-medium text-[var(--accent-coral)] transition hover:bg-[rgba(255,125,89,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingFileId === preview.file.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Remove
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={closePreview}
                  className="glass inline-flex rounded-full p-2.5"
                  aria-label="Close source preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="hide-scrollbar flex-1 overflow-auto p-5">
              {preview.loading ? (
                <div className="flex min-h-[20rem] flex-col items-center justify-center gap-3 text-sm">
                  <LoaderCircle className="h-6 w-6 animate-spin text-[var(--accent-sky)]" />
                  Opening source preview...
                </div>
              ) : preview.kind === "pdf" || preview.kind === "image" || preview.kind === "table" || preview.kind === "presentation" || preview.kind === "text" ? (
                <FileViewer
                  url={preview.url}
                  fileName={preview.file?.file_name || undefined}
                  previewKind={preview.kind}
                  text={preview.text}
                />
              ) : null}

              {preview.error ? (
                <div className="mt-4 rounded-[20px] bg-[rgba(255,125,89,0.14)] px-4 py-3 text-sm">
                  {preview.error}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
