"use client";

import { DragEvent as ReactDragEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CheckCircle2,
  Copy,
  Eye,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe2,
  LoaderCircle,
  Lock,
  Plus,
  Search,
  SendHorizonal,
  Timer,
  Trash2,
  Upload,
  WandSparkles,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import { RichStudyText } from "@/components/dashboard/RichStudyText";
import { Button } from "@/components/ui/Button";
import { defaultExamGeneratorDailyLimit } from "@/lib/ai/preview";
import { buildStudyContext } from "@/lib/ai/source-context";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";
import {
  defaultMaxUploadFileSizeMb,
  resolvePreviewKind,
  uploadAcceptAttribute
} from "@/lib/documents/formats";

type Session = { id: string; title: string };
type FileItem = { id: string; file_name: string; extracted_text: string; file_type: string; storage_path: string };
type ChatMessage = { role: "user" | "ai"; content: string };
type AIAction =
  | "summary"
  | "flashcards"
  | "quiz"
  | "exam"
  | "insights"
  | "hard_mode"
  | "study_plan"
  | "concepts";

type ToolDraft = {
  action: AIAction;
  count: number;
  difficulty: "foundation" | "exam";
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

type OutputCard = {
  title: string;
  body: string;
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

type PreviewState = {
  open: boolean;
  loading: boolean;
  file: FileItem | null;
  kind: "text" | "table" | "pdf" | "image";
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

type SourceSearchEngine = "scholar" | "google" | "duckduckgo";

const sourceEngineOptions: Array<{
  key: SourceSearchEngine;
  label: string;
  copy: string;
}> = [
  {
    key: "scholar",
    label: "Scholar",
    copy: "Academic papers and trusted learning sources first."
  },
  {
    key: "google",
    label: "Google",
    copy: "Broader web search with a source-quality warning."
  },
  {
    key: "duckduckgo",
    label: "DuckDuckGo",
    copy: "Open-web search for quick explainers and references."
  }
];

const actionButtons: { key: AIAction; label: string; copy: string }[] = [
  { key: "summary", label: "Summary", copy: "Condense the uploaded material into fast revision notes." },
  { key: "flashcards", label: "Flashcards", copy: "Turn the notes into quick active-recall prompts." },
  { key: "quiz", label: "Quiz", copy: "Generate multiple-choice questions from the uploaded sources." },
  { key: "exam", label: "Exam Generator", copy: "Build a full GCSE, A-Level, or custom mock paper from the source stack." },
  { key: "insights", label: "Insights", copy: "Spot weak areas and decide what to review next." },
  { key: "hard_mode", label: "Exam Trap Radar", copy: "Surface likely mistakes, hidden traps, and the corrections that matter." },
  { key: "study_plan", label: "Study Plan", copy: "Split the uploaded notes into a practical review sequence." },
  { key: "concepts", label: "Concept Map", copy: "Pull out the ideas, links, tables, or diagrams that anchor the session." }
];

const toolTones: Record<AIAction, string> = {
  summary: "border-[rgba(57,208,255,0.22)] bg-[rgba(57,208,255,0.1)]",
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
    count: action === "flashcards" ? 8 : action === "quiz" ? 6 : action === "study_plan" ? 7 : action === "exam" ? 8 : 5,
    difficulty: action === "hard_mode" || action === "exam" ? "exam" : "foundation",
    focus: ""
  };
}

function parseJsonBlock<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (!match) return null;
    try {
      return JSON.parse(match[1]) as T;
    } catch {
      return null;
    }
  }
}

function cleanGeneratedText(text: string) {
  return text
    .replace(/^Local fallback response\s*/i, "")
    .replace(/```(?:json)?/gi, "")
    .trim();
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
  const count = Math.max(3, Math.min(draft.count, 12));
  const sourceList = files.map((file) => file.file_name).join(", ");
  const focus = draft.focus.trim() || "the most important ideas across all uploaded files";
  const difficulty = draft.difficulty === "exam" ? "exam-level" : "foundation-level";
  const preface = `Use only the uploaded study sources. Base the output on these files: ${sourceList}. Focus on ${focus}. Keep the output ${difficulty}.`;

  switch (draft.action) {
    case "quiz":
      return `${preface} Generate ${count} multiple-choice questions. Base each question on a real fact, concept, method, or formula from the uploaded material. Avoid generic options like "source", "definition", or "example". Keep each option short, give exactly 4 options, make the answer match one option exactly, and keep the explanation brief. Return only JSON with this exact shape: [{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":"A. ...","explanation":"..."}].`;
    case "flashcards":
      return `${preface} Generate ${count} flashcards. Each front should be a real term, question, formula, or recall cue from the sources, not a generic word. Keep each front under 12 words and each back under 35 words. Do not paste raw source paragraphs or repeat the file name. Return only JSON with this exact shape: [{"front":"...","back":"..."}].`;
    case "exam":
      return `${preface} Generate a long full ${focus} mock exam in markdown. Include a title, short instructions, clearly numbered questions, mark allocations, multiple sections, and a compact mark scheme table at the end. Aim for the length of a normal school exam, not a short worksheet. Keep it realistic for GCSE, A-Level, or the level named in the focus. If the material is mathematical, include method-based questions and require working.`;
    case "summary":
      return `${preface} Return ${count} short bullet points, one per line, each highlighting a key revision takeaway. If the difficulty is foundation-level, keep the wording clearer and simpler. Where the sources contain formulas, dates, or comparisons, prefer compact table-friendly wording over vague prose.`;
    case "insights":
      return `${preface} Return ${count} short bullet points showing weak spots, misconceptions, or next-best study actions.`;
    case "hard_mode":
      return `${preface} Return a markdown table with ${count} likely exam traps. Use the columns Trap | Why students fall for it | Correct move | Self-check.`;
    case "study_plan":
      return `${preface} Return a ${count}-step study plan as one line per day using the format "Day 1: ...".`;
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

export function StudyWorkspace({
  sessions,
  initialSessionId,
  initialFiles
}: {
  sessions: Session[];
  initialSessionId: string | null;
  initialFiles: FileItem[];
}) {
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
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState<"files" | "chat" | "tools">("chat");
  const [statusNote, setStatusNote] = useState("");
  const [revealedQuiz, setRevealedQuiz] = useState<Record<number, boolean>>({});
  const [selectedQuizOption, setSelectedQuizOption] = useState<Record<number, string>>({});
  const [revealedFlashcards, setRevealedFlashcards] = useState<Record<number, boolean>>({});
  const [toolCardIndex, setToolCardIndex] = useState(0);
  const [toolHistoryBySession, setToolHistoryBySession] = useState<Record<string, ToolHistoryItem[]>>({});
  const [restoredStudio, setRestoredStudio] = useState(false);
  const [showStudioBrowser, setShowStudioBrowser] = useState(false);
  const [studioBrowserRefreshing, setStudioBrowserRefreshing] = useState(false);
  const [copyingStudioId, setCopyingStudioId] = useState<string | null>(null);
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
  const quickImportInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSessionList(sessions);
  }, [sessions]);

  useEffect(() => {
    if (!initialSessionId) return;
    setFilesBySession((current) => ({ ...current, [initialSessionId]: initialFiles }));
  }, [initialFiles, initialSessionId]);

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
    if (restoredStudio || !sessionList.length) return;

    try {
      if (localStorage.getItem("scholarmind_remember_last_studio") === "off") {
        setRestoredStudio(true);
        return;
      }

      const rememberedStudio = localStorage.getItem("scholarmind_last_studio");
      if (rememberedStudio && sessionList.some((session) => session.id === rememberedStudio)) {
        setActiveSessionId(rememberedStudio);
      }
    } catch {
      // Ignore browser storage errors and keep the current default studio.
    } finally {
      setRestoredStudio(true);
    }
  }, [restoredStudio, sessionList]);

  const currentFiles = useMemo(
    () => (activeSessionId ? filesBySession[activeSessionId] ?? [] : []),
    [activeSessionId, filesBySession]
  );
  const hasCurrentFiles = activeSessionId ? activeSessionId in filesBySession : false;
  const currentSession = sessionList.find((session) => session.id === activeSessionId) ?? null;
  const currentToolHistory = activeSessionId ? toolHistoryBySession[activeSessionId] ?? [] : [];
  const currentFilesLabel = useMemo(() => {
    if (!currentFiles.length) return "No uploaded sources yet";
    if (currentFiles.length === 1) return currentFiles[0].file_name;
    const preview = currentFiles.slice(0, 2).map((file) => file.file_name).join(", ");
    return currentFiles.length > 2 ? `${preview} +${currentFiles.length - 2} more` : preview;
  }, [currentFiles]);
  const toolsLocked = currentFiles.length === 0;

  const closeSourceModal = () => {
    setSourceModalOpen(false);
    setSourceModalError("");
    setSourceSearchWarning("");
  };

  const openSourceModal = (
    reason = "Add a file or a verified web source to unlock chat and tools.",
    mode: "upload" | "web" = "upload"
  ) => {
    setSourceModalReason(reason);
    setSourceModalMode(mode);
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
        ? normalizeFlashcards(parseJsonBlock<FlashcardItem[]>(output) ?? parseFlashcardsFallback(output))
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

  useEffect(() => {
    setRevealedQuiz({});
    setSelectedQuizOption({});
    setRevealedFlashcards({});
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
    if (currentFiles.length) {
      setSourceModalOpen(false);
      setSourceModalError("");
    }
  }, [currentFiles.length]);

  useEffect(() => {
    if (!activeSessionId || currentFiles.length || sourcePromptedForStudio === activeSessionId) return;

    const timeoutId = window.setTimeout(() => {
      openSourceModal("Upload a source or import a web source before you start chatting or generating tools.");
      setSourcePromptedForStudio(activeSessionId);
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [activeSessionId, currentFiles.length, sourcePromptedForStudio]);

  useEffect(() => {
    try {
      const storedTool = localStorage.getItem("scholarmind_default_tool") as AIAction | null;
      if (
        storedTool &&
        actionButtons.some((item) => item.key === storedTool)
      ) {
        setActiveAction(storedTool);
        setToolDraft(createToolDraft(storedTool));
      }
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;

    try {
      if (localStorage.getItem("scholarmind_remember_last_studio") === "off") return;
      localStorage.setItem("scholarmind_last_studio", activeSessionId);
    } catch {
      return;
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId || hasCurrentFiles) return;

    let ignore = false;

    const fetchFiles = async () => {
      setFetchingFiles(true);

      try {
        const response = await fetch(`/api/sessions?sessionId=${activeSessionId}`);
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error || "Unable to load files for this studio.");
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

  const buildContextForPrompt = useCallback(
    (hint: string, action: AIAction) =>
      buildStudyContext(currentFiles, hint, {
        maxCharacters: 18000,
        maxChunks: action === "exam" ? 24 : 16
      }),
    [currentFiles]
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
    setToolModalView("result");
    setToolModalOpen(true);
    setTab("tools");
  }, []);

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
            return { ...current, [toolCardIndex]: true };
          }

          shiftToolCard(1);
          return current;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeAction, shiftToolCard, toolCardIndex, toolModalOpen, toolModalView]);

  const refreshStudios = async () => {
    setStudioBrowserRefreshing(true);

    try {
      const response = await fetch("/api/sessions");
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Unable to refresh the studio list.");
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
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Unable to prepare a studio.");
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

      for (const [index, file] of allowedFiles.entries()) {
        const form = new FormData();
        form.append("files", file);
        form.append("sessionId", sessionId);

        const response = await fetch("/api/upload", { method: "POST", body: form });
        const json = await response.json();

        if (!response.ok) {
          rejectedFiles.push(
            ...(Array.isArray(json.rejectedFiles) ? json.rejectedFiles : []),
            {
              fileName: file.name,
              reason: json.error || "Upload failed."
            }
          );
          setUploadProgress(20 + ((index + 1) / allowedFiles.length) * 70);
          continue;
        }

        nextFiles = Array.isArray(json.files) ? json.files : nextFiles;
        warnings.push(...(Array.isArray(json.warnings) ? json.warnings : []));
        rejectedFiles.push(...(Array.isArray(json.rejectedFiles) ? json.rejectedFiles : []));
        setUploadProgress(20 + ((index + 1) / allowedFiles.length) * 70);
      }

      if (!nextFiles.length) {
        const refreshResponse = await fetch(`/api/sessions?sessionId=${sessionId}`);
        const refreshJson = await refreshResponse.json();
        if (!refreshResponse.ok) {
          throw new Error(refreshJson.error || "Upload finished, but the files could not be refreshed.");
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
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Unable to search the web right now.");
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

  const removeFile = async (file: FileItem) => {
    setDeletingFileId(file.id);
    setStatusNote("");

    try {
      const response = await fetch(`/api/files/${file.id}`, {
        method: "DELETE"
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Unable to remove this source.");
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
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Unable to import this web source.");
      }

      setActiveSessionId(sessionId);
      setFilesBySession((current) => ({
        ...current,
        [sessionId]: Array.isArray(json.files) ? json.files : current[sessionId] ?? []
      }));
      setStatusNote(`${source.title} was added to this studio as a web source.`);
      setSourceModalOpen(false);
      setTab("files");
    } catch (error) {
      setSourceModalError((error as Error).message || "Unable to import this web source.");
    } finally {
      setImportingSourceId(null);
    }
  };

  const copySourcesFromStudio = async (sourceSessionId: string) => {
    const targetSessionId = await ensureActiveSession();
    if (!targetSessionId) return;

    if (sourceSessionId === targetSessionId) {
      setStatusNote("You are already inside that studio.");
      return;
    }

    setCopyingStudioId(sourceSessionId);
    setStatusNote("Copying sources into the current studio...");

    try {
      const response = await fetch("/api/sessions/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceSessionId,
          targetSessionId
        })
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Unable to copy sources.");
      }

      setFilesBySession((current) => ({
        ...current,
        [targetSessionId]: json.files ?? current[targetSessionId] ?? []
      }));
      setTab("files");
      setShowStudioBrowser(false);
      setStatusNote(
        json.message ||
          `Copied ${typeof json.copiedCount === "number" ? json.copiedCount : 0} source(s) into this studio.`
      );
    } catch (error) {
      setStatusNote(formatSupabaseSetupError((error as Error).message || "Unable to copy sources."));
    } finally {
      setCopyingStudioId(null);
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
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Unable to open this file.");
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

  const runAI = async (action: AIAction, prompt: string) => {
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
          sessionId: activeSessionId ?? undefined
        })
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "No response");
      }

      setOutput(json.text || "No response");
      saveToolResult(action, json.text || "No response", action === toolDraft.action ? toolDraft.focus : "");
      const providerNote =
        json.provider === "local"
          ? " Local fallback mode is active, so results are more heuristic until a valid hosted AI key is configured."
          : json.provider === "cache"
            ? " Cached result reused for speed."
            : "";
      const remainingUsage =
        typeof json.usage?.dailyRemaining === "number"
          ? ` ${json.usage.dailyRemaining} AI run(s) left today in the free preview.`
          : "";
      const examUsage =
        action === "exam" && typeof json.usage?.examDailyRemaining === "number"
          ? ` ${json.usage.examDailyRemaining} full exam generation(s) left today.`
          : "";
      setStatusNote(
        `${actionButtons.find((item) => item.key === action)?.label || "Tool"} ready from ${currentFiles.length} uploaded source(s).${remainingUsage}${examUsage}${providerNote}`
      );
      return true;
    } catch (error) {
      setStatusNote((error as Error).message || "No response");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async () => {
    const question = chat.trim();
    if (!question || loading || chatLoading) return;

    if (!currentFiles.length) {
      const message = "Upload sources or files to continue. AI answers stay locked to uploaded material in this workspace.";
      setStatusNote(message);
      openSourceModal(message);
      setTab("chat");
      return;
    }

    setChat("");
    setMessages((current) => [...current, { role: "user", content: question }]);
    setChatLoading(true);
    setTab("chat");
    setStatusNote("");

    const context = buildContextForPrompt(question, "chat" as AIAction);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          prompt: question,
          context,
          sessionId: activeSessionId ?? undefined
        })
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Unable to generate a reply.");
      }
      const text = json.text || json.error || "No response";
      setMessages((current) => [...current, { role: "ai", content: text }]);
      setStatusNote(
        json.provider === "local"
          ? "Chat is running in local fallback mode, so answers are simpler until a valid hosted AI key is configured."
          : ""
      );
    } catch (error) {
      const message = (error as Error).message || "Unable to generate a reply.";
      setMessages((current) => [...current, { role: "ai", content: message }]);
      setStatusNote(message);
    } finally {
      setChatLoading(false);
    }
  };

  const createReminder = async () => {
    if (!currentFiles.length) {
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
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Unable to schedule reminder.");
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

    const success = await runAI(toolDraft.action, buildToolPrompt(toolDraft, currentFiles));
    if (success) {
      setToolModalView("result");
    }
  };

  const onChatKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    sendChat();
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
                    key={option}
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
          <motion.button
            key={`${item.front}-${currentIndex}-${isOpen ? "back" : "front"}`}
            type="button"
            initial={{ opacity: 0, y: 12, rotateY: isOpen ? 0 : 6 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x <= -90) shiftToolCard(1);
              if (info.offset.x >= 90) shiftToolCard(-1);
            }}
            whileHover={{ y: -2 }}
            onClick={() => setRevealedFlashcards((current) => ({ ...current, [currentIndex]: !isOpen }))}
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
              <Button onClick={() => shiftToolCard(1)} variant="secondary" size="sm">
                Next card
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.button>
        </div>
      );
    }

    if (output && looksRichOutput(output)) {
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
        <p className="font-semibold">Pick a tool to open the mini generator.</p>
        <p className="muted mt-2">
          {toolsLocked
            ? "Upload a file first, then generate quizzes, flashcards, exams, summaries, and the rest from your own sources."
            : "Choose a tool, customise it in the popup, and the result stack will appear here."}
        </p>
      </div>
    );
  };

  return (
    <div className="px-3 pb-4 pt-3 md:px-4">
      <section>
        <div className="panel panel-border rounded-[30px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-coral)]">
                Study Studio
              </p>
              <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
                {currentSession?.title || "Study workspace"}
              </h1>
              <p className="muted mt-3 max-w-2xl text-sm md:text-base">
                Keep one studio loaded and move between files, chat, and practice tools without breaking context.
              </p>
            </div>
            <div className="glass rounded-[24px] px-4 py-3 text-sm">
              <p className="muted text-xs">Current context</p>
              <p className="mt-2 font-semibold">{currentFiles.length} files in view</p>
            </div>
          </div>

          {statusNote ? (
            <div className="mt-4 rounded-[24px] bg-[rgba(57,208,255,0.12)] px-4 py-3 text-sm">{statusNote}</div>
          ) : null}
        </div>
      </section>

      <div className="mt-4 flex gap-2 lg:hidden">
        {(["files", "chat", "tools"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-full px-3 py-2 text-xs font-medium capitalize transition ${
              tab === item ? "bg-[var(--fg)] text-[var(--bg)]" : "bg-white/15"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[18.5rem_minmax(0,0.92fr)_27rem] xl:grid-cols-[19rem_minmax(0,0.88fr)_27.5rem]">
        <aside className={`${tab !== "files" ? "hidden lg:block" : "block"}`}>
          <div className="panel panel-border rounded-[30px] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Studios</p>
                <p className="muted text-xs">Keep the current notebook focused and pull in other sources only when you need them.</p>
              </div>
              <div className="glass rounded-full px-3 py-1 text-xs font-medium">{sessionList.length} total</div>
            </div>

            <div className="rounded-[24px] bg-[linear-gradient(135deg,rgba(255,125,89,0.16),rgba(57,208,255,0.18))] p-4">
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
                    {currentFiles.length} source(s) ready in this notebook.
                  </p>
                </div>
              </div>
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
                          {isCurrentStudio ? (
                            <div className="rounded-full bg-[rgba(57,208,255,0.16)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">
                              Current
                            </div>
                          ) : null}
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
                              onClick={() => copySourcesFromStudio(session.id)}
                              disabled={copyingStudioId === session.id}
                              className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,rgba(255,125,89,0.2),rgba(57,208,255,0.18))] px-3 py-2 text-xs font-medium transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {copyingStudioId === session.id ? "Copying..." : "Copy sources"}
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
                    currentFiles.length
                      ? "Add more files or search verified sources to expand this studio."
                      : "Add a file or a verified web source to unlock chat and tools.",
                    currentFiles.length ? "web" : "upload"
                  )
                }
                variant="secondary"
                size="sm"
                className="w-full justify-center"
              >
                <Upload className="h-4 w-4" />
                Add sources
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
                <p className="text-sm font-semibold">Files</p>
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
                        <button type="button" onClick={() => openFilePreview(file)} className="min-w-0 flex-1 text-left">
                          <p className="text-sm font-semibold">
                            <FileText className="mr-2 inline h-4 w-4 text-[var(--accent-sky)]" />
                            {file.file_name}
                          </p>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openFilePreview(file)}
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
                      <button type="button" onClick={() => openFilePreview(file)} className="mt-2 w-full text-left">
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

        <section className={`${tab !== "chat" ? "hidden lg:block" : "block"}`}>
          <div className="panel panel-border rounded-[30px] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">AI Chat</p>
                <p className="muted text-xs">Ask about uploaded notes once the source files are inside this studio.</p>
              </div>
              <div className="glass rounded-full px-4 py-2 text-xs font-medium">
                {currentFiles.length ? currentSession?.title || "Study chat" : "Upload required"}
              </div>
            </div>

            <div className="hide-scrollbar mt-4 max-h-[30rem] min-h-[23rem] space-y-3 overflow-auto rounded-[26px] bg-[rgba(12,18,34,0.12)] p-4">
              {!currentFiles.length ? (
                <div className="rounded-[24px] border border-[rgba(255,125,89,0.2)] bg-[linear-gradient(135deg,rgba(255,125,89,0.16),rgba(57,208,255,0.14))] p-4 text-sm">
                  <p className="font-semibold">Upload sources or files to continue</p>
                  <p className="muted mt-2">
                    Chat, quizzes, summaries, and the other AI tools unlock after this studio has at least one uploaded source.
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="rounded-[24px] bg-white/16 p-4 text-sm">
                  <p className="font-semibold">Start with a grounded question</p>
                  <p className="muted mt-2">
                    Ask for explanations, summaries, comparisons, or likely exam questions based on the uploaded notes.
                  </p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <motion.div
                    key={`${message.role}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`max-w-[82%] rounded-[28px] px-5 py-4 ${
                      message.role === "user"
                        ? "ml-auto bg-[linear-gradient(135deg,rgba(255,125,89,0.18),rgba(57,208,255,0.2))]"
                        : "bg-white/16"
                    }`}
                  >
                    {message.role === "user" ? (
                      <p className="whitespace-pre-wrap text-[15px] leading-8 md:text-base">{message.content}</p>
                    ) : (
                      <RichStudyText content={message.content} />
                    )}
                  </motion.div>
                ))
              )}
              {chatLoading ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-[20rem] rounded-[28px] bg-white/16 px-5 py-4 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin text-[var(--accent-sky)]" />
                    <p className="font-semibold">Reading your sources and shaping the answer...</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {[0, 1, 2].map((item) => (
                      <motion.span
                        key={item}
                        className="h-2 w-2 rounded-full bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-sky))]"
                        animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
                        transition={{ duration: 0.9, delay: item * 0.12, repeat: Infinity }}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={chat}
                onChange={(event) => setChat(event.target.value)}
                onKeyDown={onChatKeyDown}
                placeholder={currentFiles.length ? "Ask about your uploaded notes..." : "Upload files to unlock AI chat"}
                disabled={!currentFiles.length}
                className="w-full rounded-[22px] border border-white/20 bg-white/20 px-4 py-3 outline-none transition focus:border-[var(--accent-sky)] focus:bg-white/35"
              />
              <Button onClick={sendChat} className="shrink-0 px-4" disabled={loading || chatLoading || !currentFiles.length}>
                {chatLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </section>

        <aside className={`${tab !== "tools" ? "hidden lg:block" : "block"}`}>
          <div className="panel panel-border rounded-[30px] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Study Tools</p>
                <p className="muted text-xs">Pick a tool, tune it, then generate from the uploaded sources.</p>
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
                  <p className="mt-2 text-sm font-semibold">{currentFiles.length} uploaded source(s)</p>
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
                  <p className="text-sm font-semibold">{action.label}</p>
                  <p className="muted mt-1 text-xs">{action.copy}</p>
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-[24px] border border-[rgba(255,209,102,0.16)] bg-[linear-gradient(135deg,rgba(255,209,102,0.08),rgba(57,208,255,0.08))] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                    Research Mode
                  </p>
                  <p className="mt-2 text-sm font-semibold">Locked for Pro</p>
                  <p className="muted mt-2 text-xs">
                    Multi-source web research, cross-checking, and deeper scholar-style briefs are coming soon.
                  </p>
                </div>
                <div className="rounded-full bg-[rgba(255,209,102,0.12)] px-3 py-1 text-xs font-medium text-[var(--accent-gold)]">
                  Pro
                </div>
              </div>
              <Button
                onClick={() => setStatusNote("Research Mode is a Pro feature and is coming soon.")}
                variant="ghost"
                size="sm"
                className="mt-4 w-full justify-center rounded-[18px] bg-white/10"
              >
                <Lock className="h-4 w-4" />
                Coming soon
              </Button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button onClick={createReminder} variant="secondary" className="flex-1 justify-center" disabled={loading || toolsLocked}>
                <Timer className="h-4 w-4" />
                Set reminder
              </Button>
              {activeAction === "exam" ? (
                <div className="rounded-full bg-[rgba(255,209,102,0.12)] px-3 py-2 text-xs text-[var(--accent-gold)]">
                  {defaultExamGeneratorDailyLimit} exam(s) daily
                </div>
              ) : null}
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
                    Generated summaries, quizzes, flashcards, concept maps, and exams will appear here.
                  </div>
                )}
              </div>
            </div>

            <div className="hide-scrollbar mt-4 max-h-[28rem] space-y-3 overflow-auto pr-1">
              {renderToolResults()}
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
        </aside>
      </div>

      {sourceModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(2,6,23,0.6)] px-4 py-6 backdrop-blur-sm">
          <div className="panel panel-border relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
                  Add Sources
                </p>
                <h3 className="mt-1 text-lg font-semibold">Upload files or pull in a web source</h3>
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
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    sourceModalMode === "upload"
                      ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.22),rgba(57,208,255,0.18))]"
                      : "bg-white/10"
                  }`}
                >
                  <Upload className="mr-2 inline h-4 w-4" />
                  Upload files
                </button>
                <button
                  type="button"
                  onClick={() => setSourceModalMode("web")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    sourceModalMode === "web"
                      ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.22),rgba(57,208,255,0.18))]"
                      : "bg-white/10"
                  }`}
                >
                  <Globe2 className="mr-2 inline h-4 w-4" />
                  Search the web
                </button>
              </div>

              <div className="mt-4 rounded-[26px] bg-white/8 p-4">
                <div className="flex flex-col gap-3 md:flex-row">
                  <button
                    type="button"
                    onClick={() => quickImportInputRef.current?.click()}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-[20px] bg-white/12 px-4 py-4 text-sm font-medium transition hover:bg-white/18"
                  >
                    <Upload className="h-4 w-4" />
                    Browse files
                  </button>
                  <div className="flex-[1.4] rounded-[20px] border border-white/10 bg-black/10 p-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                {sourceEngineOptions.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => {
                            setSourceSearchEngine(option.key);
                            setSourceSearchWarning("");
                          }}
                          className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                            sourceSearchEngine === option.key
                              ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.24),rgba(57,208,255,0.2))]"
                              : "bg-white/10"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <Search className="h-4 w-4 text-[var(--accent-sky)]" />
                      <input
                        value={sourceModalQuery}
                        onChange={(event) => setSourceModalQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            searchWebSources();
                          }
                        }}
                        placeholder={
                          sourceSearchEngine === "scholar"
                            ? "Search scholar-style sources for a topic, paper, or chapter..."
                            : `Search ${sourceSearchEngine === "google" ? "Google" : "DuckDuckGo"} for a topic or chapter...`
                        }
                        className="w-full bg-transparent text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={searchWebSources}
                        disabled={sourceModalLoading}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-sky))] text-[var(--bg)] transition disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Search web sources"
                      >
                        {sourceModalLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="muted mt-3 text-xs">
                      {sourceEngineOptions.find((option) => option.key === sourceSearchEngine)?.copy}
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

                      {visibleSourceSearchResults.length ? visibleSourceSearchResults.map((result) => (
                      <div key={result.id} className="rounded-[22px] border border-white/10 bg-white/8 p-4">
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
                        Scholar mode is the default, and you can switch to Google or DuckDuckGo if you want a wider search. Imported web sources become part of this studio just like uploaded notes, so chat and tools stay source-grounded.
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
                    <Button onClick={() => setToolModalView("setup")} variant="secondary" size="sm">
                      Tune again
                    </Button>
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
                          { label: "More", value: Math.min(12, createToolDraft(toolDraft.action).count + 3) }
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
                      {actionButtons.find((item) => item.key === toolDraft.action)?.label || "Tool"} will use {currentFiles.length} source(s)
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
                          Generate inside this popup, then use the interactive result stack to quiz yourself, flip flashcards, or skim the summary without leaving the studio.
                        </p>
                        {toolDraft.action === "exam" ? (
                          <p className="mt-3 text-xs text-[rgba(255,248,229,0.88)]">
                            Full exam generation is capped at {defaultExamGeneratorDailyLimit} times per day in the free preview.
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
              ) : preview.kind === "pdf" && preview.url ? (
                <iframe
                  src={preview.url}
                  title={preview.file?.file_name || "PDF preview"}
                  className="h-[72vh] w-full rounded-[24px] border border-white/10 bg-white"
                />
              ) : preview.kind === "image" && preview.url ? (
                <div className="flex min-h-[20rem] items-center justify-center rounded-[24px] bg-black/20 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.url}
                    alt={preview.file?.file_name || "Uploaded source"}
                    className="max-h-[72vh] w-auto rounded-[20px] object-contain"
                  />
                </div>
              ) : preview.kind === "table" ? (
                <div className="overflow-auto rounded-[24px] border border-white/10 bg-white/8">
                  <table className="min-w-full text-left text-sm">
                    <tbody>
                      {parseTablePreview(preview.text).map((row, rowIndex) => (
                        <tr key={`${preview.file?.id || "row"}-${rowIndex}`} className="border-b border-white/8">
                          {row.map((cell, cellIndex) => (
                            <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-3 align-top text-xs md:text-sm">
                              {cell || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap rounded-[24px] bg-white/10 p-4 text-sm leading-6">
                  {preview.text || "Preview text is not available for this file."}
                </pre>
              )}

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
