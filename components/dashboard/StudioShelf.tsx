"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, NotebookPen, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
        throw new Error(json.error || "Unable to create a studio.");
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
      setError((createError as Error).message || "Unable to create a studio.");
    } finally {
      setCreating(false);
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
            <Link
              key={studio.id}
              href={`/dashboard/workspace/${studio.id}`}
              onClick={() => rememberStudio(studio.id)}
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
                <ArrowRight className="h-4 w-4 text-[var(--accent-sky)]" />
              </div>
              <p className="text-lg font-semibold">{studio.title}</p>
              <p className="muted mt-2 text-sm">Open this studio and continue building notes, tools, and recall practice.</p>
            </Link>
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
