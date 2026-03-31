import Link from "next/link";
import { BookOpen, Brain, FileStack, MessageSquare } from "lucide-react";

type Session = { id: string; title: string };

export function DashboardHome({
  sessions,
  fileCount
}: {
  sessions: Session[];
  fileCount: number;
}) {
  const featured = sessions.slice(0, 4);

  return (
    <main className="mx-auto max-w-7xl p-4">
      <section className="mb-6 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="glass rounded-3xl p-6">
          <p className="text-xs text-indigo-200">Welcome back</p>
          <h1 className="mt-2 text-3xl font-semibold">Build mastery, not just notes.</h1>
          <p className="muted mt-3 max-w-xl text-sm">
            Launch a focused workspace with your sessions, chat context, and adaptive learning tools.
          </p>
          <div className="mt-5 flex gap-3">
            <Link href="/dashboard/workspace" className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium">
              Enter Workspace
            </Link>
            <button className="rounded-xl border border-white/20 px-4 py-2 text-sm">
              Account Settings
            </button>
          </div>
        </div>
        <div className="glass rounded-3xl p-6">
          <p className="mb-3 text-sm font-medium">Account Snapshot</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between rounded-lg bg-white/5 px-3 py-2">
              <span>Sessions</span>
              <span>{sessions.length}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-white/5 px-3 py-2">
              <span>Uploaded files</span>
              <span>{fileCount}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-white/5 px-3 py-2">
              <span>Mode</span>
              <span>Pro Workspace</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-medium">Main Features</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { icon: BookOpen, label: "Summaries" },
            { icon: MessageSquare, label: "Document Chat" },
            { icon: Brain, label: "Hard-mode Quizzes" },
            { icon: FileStack, label: "Flashcard Engine" }
          ].map((item) => (
            <article key={item.label} className="glass rounded-2xl p-4">
              <item.icon className="mb-2 h-5 w-5 text-cyan-300" />
              <p className="text-sm">{item.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent Study Sessions</h2>
          <Link href="/dashboard/workspace" className="text-sm text-cyan-200">
            Open workspace
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {featured.length ? (
            featured.map((session) => (
              <Link
                key={session.id}
                href={`/dashboard/workspace/${session.id}`}
                className="glass rounded-2xl p-4 transition hover:-translate-y-0.5"
              >
                <p className="text-sm font-medium">{session.title}</p>
                <p className="muted mt-1 text-xs">Open in workspace</p>
              </Link>
            ))
          ) : (
            <div className="glass rounded-2xl p-4 text-sm">No sessions yet.</div>
          )}
        </div>
      </section>
    </main>
  );
}
