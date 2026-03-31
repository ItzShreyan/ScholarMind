import Link from "next/link";
import {
  ArrowRight,
  Brain,
  FileUp,
  MessageSquare,
  Sparkles,
  WandSparkles
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { StudioShelf } from "@/components/dashboard/StudioShelf";

type Session = { id: string; title: string; created_at?: string };

export function DashboardOverview({
  sessions,
  fileCount
}: {
  sessions: Session[];
  fileCount: number;
}) {
  return (
    <Container className="py-6">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <CardHeader className="relative space-y-5">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-[rgba(255,125,89,0.16)] blur-3xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-coral)]">
                  Dashboard
                </p>
                <h1 className="mt-3 text-4xl font-semibold md:text-5xl">Your study dashboard.</h1>
              </div>
              <div className="glass playful-pop rounded-full px-4 py-2 text-xs font-medium">Summary + quiz + flashcards</div>
            </div>
            <p className="muted relative max-w-2xl text-sm md:text-base">
              Build separate study studios for different classes, upload your notes, then move through
              summaries, chat, flashcards, quizzes, and study planning without leaving the same flow.
            </p>
            <div className="relative flex flex-wrap gap-3">
              <Link
                href="/studio"
                className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-gold),var(--accent-sky))] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(255,125,89,0.28)] transition hover:-translate-y-0.5 hover:brightness-105"
              >
                Open Studio
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/settings"
                className="glass inline-flex items-center rounded-2xl px-5 py-3 text-sm font-semibold"
              >
                Manage account
              </Link>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            {[
              { icon: Sparkles, label: "Summaries", tint: "text-[var(--accent-coral)]" },
              { icon: MessageSquare, label: "Chat", tint: "text-[var(--accent-sky)]" },
              { icon: Brain, label: "Quizzes", tint: "text-[var(--accent-mint)]" },
              { icon: FileUp, label: "Uploads", tint: "text-[var(--accent-gold)]" }
            ].map((item) => (
              <div key={item.label} className="playful-sway rounded-[24px] bg-white/20 px-4 py-4 text-sm">
                <item.icon className={`mb-3 h-5 w-5 ${item.tint}`} />
                <p className="font-semibold">{item.label}</p>
                <p className="muted mt-2 text-xs">Ready from the main workspace.</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent-sky)]">
                This week
              </p>
              <div className="grid gap-3 text-sm">
                <div className="rounded-[22px] bg-white/20 px-4 py-3">
                  <p className="muted text-xs">Study studios</p>
                  <p className="mt-2 text-3xl font-semibold">{sessions.length}</p>
                </div>
                <div className="rounded-[22px] bg-white/20 px-4 py-3">
                  <p className="muted text-xs">Uploaded files</p>
                  <p className="mt-2 text-3xl font-semibold">{fileCount}</p>
                </div>
                <div className="rounded-[22px] bg-[linear-gradient(135deg,rgba(57,208,255,0.18),rgba(98,232,191,0.16))] px-4 py-3">
                  <p className="muted text-xs">Mode</p>
                  <p className="mt-2 text-lg font-semibold">Focused and ready</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
                Quick start
              </p>
              <div className="rounded-[24px] bg-white/20 px-4 py-4 text-sm">
                <WandSparkles className="mb-3 h-5 w-5 text-[var(--accent-coral)]" />
                Open a studio, upload a fresh topic, and let the workspace build the first pass for you.
              </div>
            </CardHeader>
          </Card>
        </div>
      </section>

      <StudioShelf initialStudios={sessions} />
    </Container>
  );
}
