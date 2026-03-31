"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  Brain,
  CheckCircle2,
  FileText,
  FolderOpen,
  SendHorizonal,
  Timer,
  Upload,
  WandSparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { formatSupabaseSetupError } from "@/lib/supabase/setup";

type Session = { id: string; title: string };
type FileItem = { id: string; file_name: string; extracted_text: string };
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
      return { title: `Session ${index + 1}`, body: line };
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

  useEffect(() => {
    setSessionList(sessions);
  }, [sessions]);

  useEffect(() => {
    if (!initialSessionId) return;
    setFilesBySession((current) => ({ ...current, [initialSessionId]: initialFiles }));
  }, [initialFiles, initialSessionId]);

  useEffect(() => {
    if (initialSessionId) {
      setActiveSessionId(initialSessionId);
      return;
    }

    if (!activeSessionId && sessionList[0]) {
      setActiveSessionId(sessionList[0].id);
    }
  }, [activeSessionId, initialSessionId, sessionList]);

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

  const context = useMemo(
    () => currentFiles.map((file) => `${file.file_name}\n${file.extracted_text}`).join("\n\n"),
    [currentFiles]
  );

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
    setStatusNote("");
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
          throw new Error(json.error || "Unable to load files for this session.");
        }
        if (ignore) return;

        setFilesBySession((current) => ({
          ...current,
          [activeSessionId]: json.files ?? []
        }));
      } catch (error) {
        if (!ignore) {
          setStatusNote(formatSupabaseSetupError((error as Error).message || "Unable to load files for this session."));
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

  const ensureActiveSession = async () => {
    if (activeSessionId) return activeSessionId;

    setStatusNote("Preparing a study session...");

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Study Session" })
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Unable to prepare a study session.");
      }

      const nextSession = { id: json.id as string, title: json.title as string };
      setSessionList((current) =>
        current.some((session) => session.id === nextSession.id) ? current : [nextSession, ...current]
      );
      setFilesBySession((current) => ({ ...current, [nextSession.id]: current[nextSession.id] ?? [] }));
      setActiveSessionId(nextSession.id);
      setStatusNote("Study session ready.");
      return nextSession.id;
    } catch (error) {
      setStatusNote(formatSupabaseSetupError((error as Error).message || "Unable to prepare a study session."));
      return null;
    }
  };

  const uploadFiles = async (incoming: FileList | null) => {
    if (!incoming) return;

    const sessionId = await ensureActiveSession();
    if (!sessionId) {
      return;
    }

    setActiveSessionId(sessionId);
    setUploading(true);
    setUploadProgress(10);
    setStatusNote("");

    try {
      const form = new FormData();
      Array.from(incoming).forEach((file) => form.append("files", file));
      form.append("sessionId", sessionId);

      setUploadProgress(40);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Upload failed.");
      }

      const nextFiles = Array.isArray(json.files) ? json.files : [];
      if (!nextFiles.length) {
        const refreshResponse = await fetch(`/api/sessions?sessionId=${sessionId}`);
        const refreshJson = await refreshResponse.json();
        if (!refreshResponse.ok) {
          throw new Error(refreshJson.error || "Upload finished, but the files could not be refreshed.");
        }
        json.files = refreshJson.files ?? [];
      }

      setUploadProgress(92);
      setFilesBySession((current) => ({
        ...current,
        [sessionId]: json.files ?? []
      }));
      setUploadProgress(100);
      if (json.files?.length) {
        setStatusNote(`${json.files.length} file(s) added. The study tools are now ready to use.`);
      } else {
        setStatusNote(
          "Upload finished, but no saved files came back from Supabase. Re-run supabase/schema.sql and confirm the storage policies were created."
        );
      }
      setTab("tools");
    } catch (error) {
      setStatusNote(formatSupabaseSetupError((error as Error).message || "Upload failed."));
    } finally {
      window.setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 360);
    }
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
      setStatusNote(`${actionButtons.find((item) => item.key === action)?.label || "Tool"} ready from ${currentFiles.length} uploaded source(s).`);
    } catch (error) {
      setStatusNote((error as Error).message || "No response");
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async () => {
    const question = chat.trim();
    if (!question || loading) return;

    setChat("");
    setMessages((current) => [...current, { role: "user", content: question }]);
    setLoading(true);
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
      setLoading(false);
    }
  };

  const createReminder = async () => {
    if (!currentFiles.length) {
      setStatusNote("Upload at least one file before setting a reminder for this study stack.");
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
      setStatusNote("Upload at least one file to unlock summaries, quizzes, flashcards, and the other study tools.");
    } else {
      setStatusNote("");
    }
  };

  const generateSelectedTool = async () => {
    if (toolsLocked) {
      setStatusNote("Upload at least one file before generating study tools from the workspace.");
      return;
    }

    await runAI(toolDraft.action, buildToolPrompt(toolDraft, currentFiles));
  };

  const onChatKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    sendChat();
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
                Keep one study stack loaded and move between files, chat, and practice tools without breaking context.
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
                <p className="text-sm font-semibold">Sessions</p>
                <p className="muted text-xs">Switch context instantly.</p>
              </div>
              <div className="glass rounded-full px-3 py-1 text-xs font-medium">{sessionList.length} total</div>
            </div>

            <div className="hide-scrollbar max-h-[18rem] space-y-2 overflow-auto pr-1">
              {sessionList.length ? (
                sessionList.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setTab("files");
                    }}
                    className={`w-full rounded-[22px] px-3 py-3 text-left transition ${
                      activeSessionId === session.id
                        ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.2),rgba(57,208,255,0.22))]"
                        : "bg-white/12 hover:bg-white/18"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <FolderOpen className="mt-0.5 h-4 w-4 text-[var(--accent-coral)]" />
                      <div>
                        <p className="text-sm font-semibold">{session.title}</p>
                        <p className="muted mt-1 text-xs">
                          {(filesBySession[session.id] ?? []).length} file(s) in this stack
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[22px] bg-white/12 px-4 py-4 text-sm">
                  Saved sessions will appear here once session storage is connected.
                </div>
              )}
            </div>

            <div className="mt-5">
              <label className="glass smooth-hover flex cursor-pointer items-center justify-center gap-2 rounded-[22px] px-4 py-3 text-sm font-medium">
                <Upload className="h-4 w-4" />
                Upload files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    uploadFiles(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            <motion.div
              animate={dragOver ? { scale: 1.01 } : { scale: 1 }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                uploadFiles(event.dataTransfer.files);
              }}
              className={`mt-4 rounded-[24px] border border-dashed p-4 text-center text-xs transition ${
                dragOver
                  ? "border-[rgba(57,208,255,0.6)] bg-[rgba(57,208,255,0.12)]"
                  : "border-white/20 bg-white/10"
              }`}
            >
              Drop notes here for a quick import
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
                    <motion.article
                      key={file.id}
                      whileHover={{ y: -2 }}
                      className="rounded-[22px] bg-white/14 p-3"
                    >
                      <p className="text-sm font-semibold">
                        <FileText className="mr-2 inline h-4 w-4 text-[var(--accent-sky)]" />
                        {file.file_name}
                      </p>
                      <p className="muted mt-2 line-clamp-3 text-xs">{file.extracted_text}</p>
                    </motion.article>
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
                <p className="muted text-xs">Ask about uploaded notes, or use it as a quick study sounding board.</p>
              </div>
              <div className="glass rounded-full px-4 py-2 text-xs font-medium">
                {currentSession?.title || "Quick chat mode"}
              </div>
            </div>

            <div className="hide-scrollbar mt-4 max-h-[34rem] min-h-[28rem] space-y-3 overflow-auto rounded-[26px] bg-[rgba(12,18,34,0.12)] p-4">
              {messages.length === 0 ? (
                <div className="rounded-[24px] bg-white/16 p-4 text-sm">
                  <p className="font-semibold">Start with a grounded question</p>
                  <p className="muted mt-2">
                    {currentFiles.length
                      ? "Ask for explanations, summaries, comparisons, or likely exam questions based on the uploaded notes."
                      : "General study questions work right now. Upload notes or PDFs when you want answers grounded in your own material."}
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
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={chat}
                onChange={(event) => setChat(event.target.value)}
                onKeyDown={onChatKeyDown}
                placeholder="Ask about your notes or any study topic..."
                className="w-full rounded-[22px] border border-white/20 bg-white/20 px-4 py-3 outline-none transition focus:border-[var(--accent-sky)] focus:bg-white/35"
              />
              <Button onClick={sendChat} className="shrink-0 px-4" disabled={loading}>
                <SendHorizonal className="h-4 w-4" />
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-sky)]">
                    Tool Setup
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {actionButtons.find((item) => item.key === toolDraft.action)?.label || "Tool"} generator
                  </p>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                  {toolDraft.difficulty === "exam" ? "Exam level" : "Foundation level"}
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
                    Output count
                  </span>
                  <input
                    type="number"
                    min={3}
                    max={12}
                    value={toolDraft.count}
                    disabled={toolsLocked}
                    onChange={(event) =>
                      setToolDraft((current) => ({
                        ...current,
                        count: Number.isNaN(Number(event.target.value)) ? current.count : Number(event.target.value)
                      }))
                    }
                    className="w-full rounded-[18px] border border-white/20 bg-white/14 px-4 py-3 text-sm outline-none transition focus:border-[var(--accent-sky)]"
                  />
                </label>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">Difficulty</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["foundation", "exam"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        disabled={toolsLocked}
                        onClick={() => setToolDraft((current) => ({ ...current, difficulty: level }))}
                        className={`rounded-[18px] px-3 py-3 text-sm font-medium transition ${
                          toolDraft.difficulty === level
                            ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.2),rgba(57,208,255,0.18))]"
                            : "bg-white/10"
                        }`}
                      >
                        {level === "foundation" ? "Foundation" : "Exam"}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
                    Focus area
                  </span>
                  <input
                    value={toolDraft.focus}
                    disabled={toolsLocked}
                    onChange={(event) => setToolDraft((current) => ({ ...current, focus: event.target.value }))}
                    placeholder="Optional: formulas, chapter 4, definitions..."
                    className="w-full rounded-[18px] border border-white/20 bg-white/14 px-4 py-3 text-sm outline-none transition focus:border-[var(--accent-sky)]"
                  />
                </label>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button onClick={generateSelectedTool} className="flex-1 justify-center" disabled={loading || toolsLocked}>
                  <WandSparkles className="h-4 w-4" />
                  Generate
                </Button>
                <Button onClick={createReminder} variant="secondary" className="shrink-0 px-4" disabled={loading || toolsLocked}>
                  <Timer className="h-4 w-4" />
                </Button>
              </div>

              {loading ? (
                <div className="mt-4 rounded-[22px] border border-white/12 bg-[rgba(12,18,34,0.26)] p-4">
                  <p className="text-sm font-semibold">Generating from your uploaded sources...</p>
                  <p className="muted mt-2 text-xs">
                    The result will land in this panel as soon as the study deck is ready.
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
              {activeAction === "quiz" && parsedQuiz?.length
                ? parsedQuiz.map((item, index) => {
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
                  })
                : activeAction === "flashcards" && parsedFlashcards?.length
                  ? parsedFlashcards.map((item, index) => {
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
                    })
                  : parsedCards.length
                    ? parsedCards.map((card, index) => (
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
                      ))
                    : (
                      <div className="rounded-[24px] bg-white/12 px-4 py-4 text-sm">
                        <p className="font-semibold">Pick a tool to open the mini generator.</p>
                        <p className="muted mt-2">
                          {toolsLocked
                            ? "Upload a file first, then generate quizzes, flashcards, summaries, and the rest from your own sources."
                            : "Choose a tool, set the focus, and the output will be turned into an interactive result stack here."}
                        </p>
                      </div>
                    )}
            </div>

            <div className="mt-4 rounded-[24px] bg-[linear-gradient(135deg,rgba(255,125,89,0.16),rgba(57,208,255,0.14))] p-4 text-sm">
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
    </div>
  );
}
