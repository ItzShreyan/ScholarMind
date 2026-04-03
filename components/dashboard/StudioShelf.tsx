"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, NotebookPen, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { normalizeErrorMessage } from "@/lib/ai/util";

type Studio = {
  id: string;
  title: string;
  created_at?: string;
};

function createStudioTitle(count: number) {
  return `Studio ${count + 1}`;
}

export function StudioShelf({ initialStudios }: { initialStudios: Studio[] }) {
  const router = useRouter();
  const [studios, setStudios] = useState(initialStudios);
  const [draftTitle, setDraftTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const latestStudio = useMemo(() => studios[0] ?? null, [studios]);

  const rememberStudio = (studioId: string) => {
    try {
      if (localStorage.getItem("scholarmind_remember_last_studio") === "off") return;
      localStorage.setItem("scholarmind_last_studio", studioId);
    } catch {
      return;
    }
  };

  const createStudio = async () => {
    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draftTitle.trim() || createStudioTitle(studios.length)
        })
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to create a studio."));
      }

      const nextStudio = {
        id: json.id as string,
        title: json.title as string,
        created_at: json.created_at as string | undefined
      };
      setStudios((current) => [nextStudio, ...current]);
      setDraftTitle("");
      rememberStudio(nextStudio.id);
      router.push(`/dashboard/workspace/${nextStudio.id}`);
    } catch (createError) {
      setError(normalizeErrorMessage(createError, "Unable to create a studio."));
    } finally {
      setCreating(false);
    }
  };

  const renameStudio = async (studio: Studio) => {
    const nextTitle = window.prompt("Rename studio", studio.title)?.trim();
    if (!nextTitle || nextTitle === studio.title) return;

    setRenamingId(studio.id);
    setError("");

    try {
      const response = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: studio.id, title: nextTitle })
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to rename this studio."));
      }

      setStudios((current) => current.map((item) => (item.id === studio.id ? { ...item, title: json.title || nextTitle } : item)));
    } catch (renameError) {
      setError(normalizeErrorMessage(renameError, "Unable to rename this studio."));
    } finally {
      setRenamingId(null);
    }
  };

  const deleteStudio = async (studio: Studio) => {
    const confirmed = window.confirm(`Delete "${studio.title}"? This will remove the studio and its uploaded sources.`);
    if (!confirmed) return;

    setDeletingId(studio.id);
    setError("");

    try {
      const response = await fetch("/api/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: studio.id })
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to delete this studio."));
      }

      setStudios(Array.isArray(json.sessions) ? json.sessions : []);
    } catch (deleteError) {
      setError(normalizeErrorMessage(deleteError, "Unable to delete this studio."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mt-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Study studios</h2>
          <p className="muted text-sm">Keep separate notebooks for different modules, exams, or topics.</p>
        </div>
        {latestStudio ? (
          <Link href={`/dashboard/workspace/${latestStudio.id}`} className="text-sm font-medium text-[var(--accent-sky)]">
            Open latest
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="panel panel-border playful-bob rounded-[26px] p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="rounded-2xl bg-[linear-gradient(135deg,rgba(255,125,89,0.18),rgba(57,208,255,0.18))] p-3">
              <NotebookPen className="h-5 w-5 text-[var(--accent-coral)]" />
            </div>
            <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">Notebook style</div>
          </div>
          <p className="text-lg font-semibold">Create a new studio</p>
          <p className="muted mt-2 text-sm">
            Start a fresh stack for a new class, chapter, or exam paper and keep the files separate.
          </p>
          <input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            placeholder={createStudioTitle(studios.length)}
            className="mt-4 w-full rounded-[18px] border border-white/20 bg-white/14 px-4 py-3 text-sm outline-none transition focus:border-[var(--accent-sky)]"
          />
          <Button onClick={createStudio} className="mt-3 w-full justify-center" disabled={creating}>
            <Plus className="h-4 w-4" />
            {creating ? "Creating..." : "Create studio"}
          </Button>
          {error ? <p className="mt-3 text-xs text-[var(--accent-coral)]">{error}</p> : null}
        </div>

        {studios.length ? (
          studios.map((studio, index) => (
            <div
              key={studio.id}
              className="panel panel-border smooth-hover rounded-[26px] p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className={`rounded-2xl p-3 ${index % 2 === 0 ? "bg-[rgba(57,208,255,0.14)]" : "bg-[rgba(255,125,89,0.14)]"}`}>
                  {index % 2 === 0 ? (
                    <Sparkles className="h-5 w-5 text-[var(--accent-sky)]" />
                  ) : (
                    <NotebookPen className="h-5 w-5 text-[var(--accent-coral)]" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => renameStudio(studio)}
                    disabled={renamingId === studio.id || deletingId === studio.id}
                    className="rounded-full bg-white/10 p-2 transition hover:bg-white/16 disabled:opacity-50"
                    aria-label={`Rename ${studio.title}`}
                  >
                    <Pencil className="h-4 w-4 text-[var(--accent-sky)]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteStudio(studio)}
                    disabled={deletingId === studio.id || renamingId === studio.id}
                    className="rounded-full bg-white/10 p-2 transition hover:bg-white/16 disabled:opacity-50"
                    aria-label={`Delete ${studio.title}`}
                  >
                    <Trash2 className="h-4 w-4 text-[var(--accent-coral)]" />
                  </button>
                </div>
              </div>
              <p className="text-lg font-semibold">{studio.title}</p>
              <p className="muted mt-2 text-sm">Open this studio and continue building notes, tools, and recall practice.</p>
              <Link
                href={`/dashboard/workspace/${studio.id}`}
                onClick={() => rememberStudio(studio.id)}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-sky)]"
              >
                Open studio
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))
        ) : (
          <div className="panel panel-border rounded-[26px] p-5 text-sm">
            No studios yet. Create one to start uploading sources and generating study tools.
          </div>
        )}
      </div>
    </section>
  );
}
