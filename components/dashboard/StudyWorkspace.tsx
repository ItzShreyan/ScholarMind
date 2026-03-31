"use client";

import { DragEvent as ReactDragEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Copy,
  Eye,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe2,
  LoaderCircle,
  Plus,
  Search,
  SendHorizonal,
  Timer,
  Upload,
  WandSparkles,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
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
  | "insights"
  | "eli10"
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

const actionButtons: { key: AIAction; label: string; copy: string }[] = [
  { key: "summary", label: "Summary", copy: "Condense the uploaded material into fast revision notes." },
  { key: "flashcards", label: "Flashcards", copy: "Turn the notes into quick active-recall prompts." },
  { key: "quiz", label: "Quiz", copy: "Generate multiple-choice questions from the uploaded sources." },
  { key: "insights", label: "Insights", copy: "Spot weak areas and decide what to review next." },
  { key: "eli10", label: "ELI10", copy: "Re-explain the source material in simple language." },
  { key: "hard_mode", label: "Hard Mode", copy: "Push the material into tougher exam-style prompts." },
  { key: "study_plan", label: "Study Plan", copy: "Split the uploaded notes into a practical review sequence." },
  { key: "concepts", label: "Concept Map", copy: "Pull out the ideas that should anchor the study session." }
];

const toolTones: Record<AIAction, string> = {
  summary: "border-[rgba(57,208,255,0.22)] bg-[rgba(57,208,255,0.1)]",
  flashcards: "border-[rgba(255,209,102,0.24)] bg-[rgba(255,209,102,0.1)]",
  quiz: "border-[rgba(121,247,199,0.24)] bg-[rgba(121,247,199,0.1)]",
  insights: "border-[rgba(255,125,89,0.24)] bg-[rgba(255,125,89,0.1)]",
  eli10: "border-[rgba(255,255,255,0.18)] bg-white/10",
  hard_mode: "border-[rgba(255,125,89,0.26)] bg-[rgba(255,125,89,0.12)]",
  study_plan: "border-[rgba(57,208,255,0.22)] bg-[rgba(57,208,255,0.08)]",
  concepts: "border-[rgba(121,247,199,0.24)] bg-[rgba(121,247,199,0.08)]"
};

function createToolDraft(action: AIAction): ToolDraft {
  return {
    action,
    count: action === "flashcards" ? 8 : action === "quiz" ? 6 : action === "study_plan" ? 7 : 5,
    difficulty: action === "hard_mode" ? "exam" : "foundation",
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
      return `${preface} Generate ${count} multiple-choice questions. Return only JSON with this exact shape: [{"question":"...","options":["A","B","C","D"],"answer":"...","explanation":"..."}].`;
    case "flashcards":
      return `${preface} Generate ${count} flashcards. Return only JSON with this exact shape: [{"front":"...","back":"..."}].`;
    case "summary":
      return `${preface} Return ${count} short bullet points, one per line, each highlighting a key revision takeaway.`;
    case "insights":
      return `${preface} Return ${count} short bullet points showing weak spots, misconceptions, or next-best study actions.`;
    case "eli10":
      return `${preface} Return ${count} short bullet points that explain the material in simple language without losing accuracy.`;
    case "hard_mode":
      return `${preface} Return ${count} difficult recall or exam-style prompts, one per line, that test understanding rather than memorization.`;
    case "study_plan":
      return `${preface} Return a ${count}-step study plan as one line per day using the format "Day 1: ...".`;
    case "concepts":
      return `${preface} Return ${count} lines in the format "Concept: why it matters" so the result can be turned into a concept deck.`;
    default:
      return preface;
  }
}

function buildAiContext(files: FileItem[]) {
  const maxTotalCharacters = 16000;
  const maxCharactersPerFile = 2600;
  let remaining = maxTotalCharacters;

  return files
    .slice(0, 8)
    .map((file) => {
      if (remaining <= 0) return "";

      const header = `Source: ${file.file_name}\n`;
      const body = (file.extracted_text || "").trim();
      const sliceLimit = Math.max(0, Math.min(maxCharactersPerFile, remaining - header.length));
      if (!sliceLimit) return "";

      const excerpt = body.slice(0, sliceLimit).trim();
      remaining -= header.length + excerpt.length + 2;

      return excerpt ? `${header}${excerpt}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
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
  const [revealedFlashcards, setRevealedFlashcards] = useState<Record<number, boolean>>({});
  const [restoredStudio, setRestoredStudio] = useState(false);
  const [showStudioBrowser, setShowStudioBrowser] = useState(false);
  const [studioBrowserRefreshing, setStudioBrowserRefreshing] = useState(false);
  const [copyingStudioId, setCopyingStudioId] = useState<string | null>(null);
  const [toolModalOpen, setToolModalOpen] = useState(false);
  const [toolModalView, setToolModalView] = useState<"setup" | "result">("setup");
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [sourceModalMode, setSourceModalMode] = useState<"upload" | "web">("upload");
  const [sourceModalQuery, setSourceModalQuery] = useState("");
  const [sourceModalLoading, setSourceModalLoading] = useState(false);
  const [sourceModalError, setSourceModalError] = useState("");
  const [sourceModalReason, setSourceModalReason] = useState("Add a file or a verified web source to unlock chat and tools.");
  const [sourceSearchResults, setSourceSearchResults] = useState<WebSourceItem[]>([]);
  const [importingSourceId, setImportingSourceId] = useState<string | null>(null);
  const [sourcePromptedForStudio, setSourcePromptedForStudio] = useState<string | null>(null);
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
  const currentFilesLabel = useMemo(() => {
    if (!currentFiles.length) return "No uploaded sources yet";
    if (currentFiles.length === 1) return currentFiles[0].file_name;
    const preview = currentFiles.slice(0, 2).map((file) => file.file_name).join(", ");
    return currentFiles.length > 2 ? `${preview} +${currentFiles.length - 2} more` : preview;
  }, [currentFiles]);
  const toolsLocked = currentFiles.length === 0;

  const context = useMemo(() => buildAiContext(currentFiles), [currentFiles]);

  const closeSourceModal = () => {
    setSourceModalOpen(false);
    setSourceModalError("");
  };

  const openSourceModal = (
    reason = "Add a file or a verified web source to unlock chat and tools.",
    mode: "upload" | "web" = "upload"
  ) => {
    setSourceModalReason(reason);
    setSourceModalMode(mode);
    setSourceModalError("");
    setSourceModalOpen(true);
  };

  const parsedQuiz = useMemo(
    () => (activeAction === "quiz" ? parseJsonBlock<QuizItem[]>(output) : null),
    [activeAction, output]
  );
  const parsedFlashcards = useMemo(
    () => (activeAction === "flashcards" ? parseJsonBlock<FlashcardItem[]>(output) : null),
    [activeAction, output]
  );
  const parsedCards = useMemo(() => parseOutputCards(output, activeAction), [activeAction, output]);

  useEffect(() => {
    setRevealedQuiz({});
    setRevealedFlashcards({});
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

    try {
      const response = await fetch("/api/sources/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Unable to search the web right now.");
      }

      setSourceSearchResults(Array.isArray(json.results) ? json.results : []);
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
      const remainingUsage =
        typeof json.usage?.dailyRemaining === "number"
          ? ` ${json.usage.dailyRemaining} AI run(s) left today in the free preview.`
          : "";
      setStatusNote(
        `${actionButtons.find((item) => item.key === action)?.label || "Tool"} ready from ${currentFiles.length} uploaded source(s).${remainingUsage}`
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
      const text = json.text || json.error || "No response";
      setMessages((current) => [...current, { role: "ai", content: text }]);
    } catch (error) {
      const message = (error as Error).message || "Unable to generate a reply.";
      setMessages((current) => [...current, { role: "ai", content: message }]);
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
      const message = "Upload at least one file or add a web source to unlock summaries, quizzes, flashcards, and the other study tools.";
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
    if (activeAction === "quiz" && parsedQuiz?.length) {
      return parsedQuiz.map((item, index) => {
        const isOpen = Boolean(revealedQuiz[index]);
        return (
          <motion.article
            key={`${item.question}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[24px] border px-4 py-4 text-sm ${toolTones.quiz}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-mint)]">
              Question {index + 1}
            </p>
            <p className="mt-3 font-semibold">{item.question}</p>
            {item.options?.length ? (
              <div className="mt-3 space-y-2">
                {item.options.map((option) => (
                  <div key={option} className="rounded-[16px] bg-white/10 px-3 py-2 text-xs">
                    {option}
                  </div>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setRevealedQuiz((current) => ({ ...current, [index]: !isOpen }))}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-2 text-xs font-medium"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isOpen ? "Hide answer" : "Reveal answer"}
            </button>
            {isOpen ? (
              <div className="mt-3 rounded-[18px] bg-white/12 p-3 text-xs">
                {item.answer ? <p className="font-semibold">Answer: {item.answer}</p> : null}
                {item.explanation ? <p className="muted mt-2">{item.explanation}</p> : null}
              </div>
            ) : null}
          </motion.article>
        );
      });
    }

    if (activeAction === "flashcards" && parsedFlashcards?.length) {
      return parsedFlashcards.map((item, index) => {
        const isOpen = Boolean(revealedFlashcards[index]);
        return (
          <motion.button
            key={`${item.front}-${index}`}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            onClick={() => setRevealedFlashcards((current) => ({ ...current, [index]: !isOpen }))}
            className={`w-full rounded-[24px] border px-4 py-4 text-left text-sm ${toolTones.flashcards}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
              Flashcard {index + 1}
            </p>
            <p className="mt-3 font-semibold">{isOpen ? item.back : item.front}</p>
            <p className="muted mt-3 text-xs">{isOpen ? "Tap to flip back" : "Tap to reveal the answer"}</p>
          </motion.button>
        );
      });
    }

    if (parsedCards.length) {
      return parsedCards.map((card, index) => (
        <motion.article
          key={`${card.title}-${index}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-[24px] border px-4 py-4 text-sm ${toolTones[activeAction]}`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
            {card.title}
          </p>
          <p className="mt-3">{card.body}</p>
        </motion.article>
      ));
    }

    return (
      <div className="rounded-[24px] bg-white/12 px-4 py-4 text-sm">
        <p className="font-semibold">Pick a tool to open the mini generator.</p>
        <p className="muted mt-2">
          {toolsLocked
            ? "Upload a file first, then generate quizzes, flashcards, summaries, and the rest from your own sources."
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

      <div className="mt-4 grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)_24rem]">
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
              <label className="glass smooth-hover flex cursor-pointer items-center justify-center gap-2 rounded-[22px] px-4 py-3 text-sm font-medium">
                <Upload className="h-4 w-4" />
                Upload files
                <input
                  type="file"
                  multiple
                  accept={uploadAcceptAttribute}
                  className="hidden"
                  onChange={(event) => {
                    uploadFiles(Array.from(event.target.files ?? []));
                    event.currentTarget.value = "";
                  }}
                />
              </label>
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
                    <motion.button
                      key={file.id}
                      type="button"
                      whileHover={{ y: -2 }}
                      onClick={() => openFilePreview(file)}
                      className="w-full rounded-[22px] bg-white/14 p-3 text-left transition hover:bg-white/18"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold">
                          <FileText className="mr-2 inline h-4 w-4 text-[var(--accent-sky)]" />
                          {file.file_name}
                        </p>
                        <div className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em]">
                          <Eye className="h-3 w-3" />
                          Open
                        </div>
                      </div>
                      <p className="muted mt-2 line-clamp-3 text-xs">{file.extracted_text}</p>
                    </motion.button>
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

            <div className="hide-scrollbar mt-4 max-h-[34rem] min-h-[28rem] space-y-3 overflow-auto rounded-[26px] bg-[rgba(12,18,34,0.12)] p-4">
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
                    className={`max-w-[85%] rounded-[24px] px-4 py-3 text-sm ${
                      message.role === "user"
                        ? "ml-auto bg-[linear-gradient(135deg,rgba(255,125,89,0.18),rgba(57,208,255,0.2))]"
                        : "bg-white/16"
                    }`}
                  >
                    {message.content}
                  </motion.div>
                ))
              )}
              {chatLoading ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-[18rem] rounded-[24px] bg-white/16 px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin text-[var(--accent-sky)]" />
                    <p className="font-semibold">Reading your sources...</p>
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

            <div className="mt-4 rounded-[24px] bg-white/12 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-sky)]">
                    Mini Generator
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {actionButtons.find((item) => item.key === toolDraft.action)?.label || "Tool"} settings open in a popup
                  </p>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                  {toolDraft.difficulty === "exam" ? "Exam level" : "Foundation level"}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <div className="rounded-full bg-white/10 px-3 py-2">Count: {toolDraft.count}</div>
                <div className="rounded-full bg-white/10 px-3 py-2">
                  Difficulty: {toolDraft.difficulty === "exam" ? "Exam" : "Foundation"}
                </div>
                <div className="rounded-full bg-white/10 px-3 py-2">
                  Focus: {toolDraft.focus.trim() || "General coverage"}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button onClick={() => openTool(activeAction)} className="flex-1 justify-center" disabled={loading}>
                  <WandSparkles className="h-4 w-4" />
                  Open Generator
                </Button>
                <Button onClick={createReminder} variant="secondary" className="shrink-0 px-4" disabled={loading || toolsLocked}>
                  <Timer className="h-4 w-4" />
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
            </div>

            <div className="hide-scrollbar mt-4 max-h-[34rem] space-y-3 overflow-auto pr-1">
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
                        placeholder="Search the web for a topic or chapter..."
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
                      Verified and trusted web results can be imported straight into this studio if you do not have notes yet.
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

                <div className="mt-4 space-y-3">
                  {sourceModalMode === "web" && sourceSearchResults.length ? (
                    sourceSearchResults.map((result) => (
                      <div key={result.id} className="rounded-[22px] border border-white/10 bg-white/8 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold">{result.title}</p>
                              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                                {result.trustLabel}
                              </span>
                              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px]">{result.source}</span>
                            </div>
                            <p className="muted mt-2 text-xs leading-5">{result.snippet}</p>
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
                    ))
                  ) : sourceModalMode === "web" && !sourceModalLoading ? (
                    <div className="rounded-[22px] border border-dashed border-white/12 bg-white/6 px-4 py-6 text-sm">
                      <p className="font-semibold">Search for a trusted explainer, article, or reference page.</p>
                      <p className="muted mt-2">
                        Imported web sources become part of this studio just like uploaded notes, so chat and tools stay source-grounded.
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
              <button
                type="button"
                onClick={closePreview}
                className="glass inline-flex rounded-full p-2.5"
                aria-label="Close source preview"
              >
                <X className="h-4 w-4" />
              </button>
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
