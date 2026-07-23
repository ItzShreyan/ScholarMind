import type { Metadata } from "next";
import Link from "next/link";
import { BrandLink } from "@/components/common/BrandLink";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "ScholarMind terms for student study tools, AI output, uploads, usage limits, and account behaviour."
};

const terms = [
  {
    title: "Use ScholarMind for Study",
    copy: "ScholarMind is a study companion that helps turn uploaded sources into summaries, AI Notes, quizzes, flashcards, mock exams, schedules, and tutor-style explanations. It is not a replacement for teachers, exam boards, professional advice, or official marking guidance."
  },
  {
    title: "Your Sources and Outputs",
    copy: "You are responsible for the files, notes, links, and prompts you upload or import. Only upload content you are allowed to use. AI outputs can contain mistakes, so always check important facts, calculations, dates, and exam answers against your teacher or official materials."
  },
  {
    title: "Account Rules",
    copy: "Do not try to access another user’s studios, bypass login, evade usage limits, scrape the service, attack the website, or abuse AI/API resources. Suspicious traffic may be rate-limited, challenged, blocked, or reviewed by the host account."
  },
  {
    title: "Free Preview and Limits",
    copy: "ScholarMind is currently in preview. Features may be free while launch testing continues, but AI tools, exams, OCR, search, uploads, and other heavy features can be limited to protect shared API usage and site stability."
  },
  {
    title: "Availability",
    copy: "ScholarMind may change, pause, or remove features as the product improves. Provider outages, Supabase configuration, AI provider limits, or security controls can affect availability."
  },
  {
    title: "Security",
    copy: "The Mind Security Engine, Supabase row-level security, upload checks, and optional Arcjet protection are designed to reduce abuse and protect the app. No website can guarantee perfect protection, so report issues responsibly."
  }
];

export default function TermsPage() {
  return (
    <main className="noise min-h-screen pb-16">
      <header className="glass sticky top-0 z-40 border-b border-white/10">
        <Container className="flex items-center justify-between py-4">
          <BrandLink href="/" subtitle="Terms and fair use" />
          <Link
            href="/auth"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-gold),var(--accent-sky))] px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_14px_40px_rgba(57,208,255,0.18)] transition hover:scale-[1.01]"
          >
            Open ScholarMind
          </Link>
        </Container>
      </header>

      <Container className="py-10">
        <div className="mx-auto max-w-4xl space-y-5">
          <Card>
            <CardHeader className="space-y-4 p-6">
              <h1 className="text-3xl font-semibold sm:text-5xl">Terms of Use</h1>
              <p className="muted text-sm sm:text-base">
                These terms are a practical launch-ready baseline for using ScholarMind responsibly during preview.
              </p>
            </CardHeader>
          </Card>

          {terms.map((term) => (
            <Card key={term.title}>
              <CardHeader className="p-6 pb-2">
                <h2 className="text-2xl font-semibold">{term.title}</h2>
              </CardHeader>
              <CardContent className="p-6 pt-2 text-sm leading-7 text-[var(--muted)] sm:text-base">
                <p>{term.copy}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
