import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BrandLink } from "@/components/common/BrandLink";
import { SecurityBadge } from "@/components/common/SecurityBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ScholarMind handles student accounts, uploads, AI requests, analytics, and security."
};

const sections = [
  {
    title: "What ScholarMind Stores",
    copy: [
      "ScholarMind stores the information needed to run your study workspace: account details from Supabase Auth, studios, uploaded source metadata, extracted study text, saved AI outputs, chat history, revision plans, preferences, and usage-limit records.",
      "Uploaded files are used to create source-grounded study help. Extracted text is stored so chat, AI Notes, quizzes, flashcards, and exams can use the same material without asking you to upload it repeatedly."
    ]
  },
  {
    title: "AI Processing",
    copy: [
      "When you ask the tutor or generate a tool, ScholarMind sends the relevant prompt, enabled source text, and study context to configured AI providers such as OpenRouter. Do not upload highly sensitive personal documents unless you are comfortable using them for AI processing.",
      "The AI is instructed to use enabled sources as the evidence base. You can disable a source from being used by chat, tools, revision schedules, and generated outputs."
    ]
  },
  {
    title: "Analytics",
    copy: [
      "ScholarMind records basic product analytics such as page views, feature use, source search, and source import events. These events help improve reliability, spot popular features, and detect abuse.",
      "The host panel can view aggregate usage and onboarding trends. It is not designed to expose private study answers publicly."
    ]
  },
  {
    title: "Your Controls",
    copy: [
      "You can remove sources, disable sources from AI use, create or delete studios, redo the personalisation quiz, and change preferences in settings.",
      "If you want account data removed, contact the site owner. Supabase account deletion removes dependent database rows where cascading deletes are configured."
    ]
  }
];

export default function PrivacyPage() {
  return (
    <main className="noise min-h-screen pb-16">
      <header className="glass sticky top-0 z-40 border-b border-white/10">
        <Container className="flex items-center justify-between py-4">
          <BrandLink href="/" subtitle="Privacy and student data" />
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
              <SecurityBadge />
              <h1 className="text-3xl font-semibold sm:text-5xl">Privacy Policy</h1>
              <p className="muted text-sm sm:text-base">
                This policy explains how ScholarMind handles study data, AI requests, analytics, and security. It is written for the current preview product and should be reviewed before a larger public launch.
              </p>
            </CardHeader>
          </Card>

          <Card id="security">
            <CardHeader className="space-y-3 p-6">
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-mint)]">
                <ShieldCheck className="h-4 w-4" />
                Mind Security Engine
              </p>
              <h2 className="text-2xl font-semibold">Security and Abuse Protection</h2>
              <p className="muted text-sm sm:text-base">
                ScholarMind uses the Mind Security Engine to add security headers, local suspicious-request detection, upload validation, human verification for suspicious traffic, API throttling, and optional Arcjet protection. Supabase row-level security keeps signed-in users scoped to their own studios, files, chat history, and settings.
              </p>
            </CardHeader>
          </Card>

          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader className="p-6 pb-2">
                <h2 className="text-2xl font-semibold">{section.title}</h2>
              </CardHeader>
              <CardContent className="space-y-3 p-6 pt-2 text-sm leading-7 text-[var(--muted)] sm:text-base">
                {section.copy.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
