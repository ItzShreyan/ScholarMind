"use client";

import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  FileText,
  Lock,
  MessageSquare,
  Sparkles,
  Timer,
  WandSparkles
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ScrollShowcase } from "@/components/landing/ScrollShowcase";
import { ThreeHero } from "@/components/landing/ThreeHero";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { defaultFreePreviewDailyLimit, defaultFreePreviewHourlyLimit } from "@/lib/ai/preview";

const studyFeatures = [
  {
    icon: FileText,
    title: "Short summaries",
    copy: "Turn long lecture notes, textbook sections, or revision sheets into concise bullet summaries."
  },
  {
    icon: MessageSquare,
    title: "Q&A on your material",
    copy: "Ask follow-up questions and get answers based on the same notes, transcript, or PDF you uploaded."
  },
  {
    icon: Brain,
    title: "Custom quizzes",
    copy: "Generate practice questions that move from simple recall into harder concept checks."
  },
  {
    icon: WandSparkles,
    title: "Flashcards and study plans",
    copy: "Build flashcards, revision tasks, and next-step study plans from one session."
  }
];

const studyModes = [
  {
    title: "What goes in",
    copy: "Text, lecture transcripts, textbook pages, screenshots, and images of handwritten notes.",
    bullets: ["Paste text directly", "Upload PDFs", "Use note images or screenshots"]
  },
  {
    title: "What comes out",
    copy: "A short revision sheet, instant Q&A, flashcards, quizzes, and spaced review prompts.",
    bullets: ["Summary and key concepts", "Practice questions", "Flashcards and reminders"]
  }
];

const faqs = [
  {
    q: "Can it work from my own notes?",
    a: "Yes. The flow is built around your own text, images, lecture notes, and transcripts."
  },
  {
    q: "What can it generate from one upload?",
    a: "Summaries, follow-up answers, quiz questions, flashcards, and review prompts from the same material."
  },
  {
    q: "Who is it aimed at?",
    a: "Students and adult learners who are trying to digest dense material faster and revise more actively."
  },
  {
    q: "Why use this instead of rewriting notes by hand?",
    a: "It cuts down the manual rewrite step and pushes the learner faster into recall, questioning, and spaced review."
  }
];

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const leftGlowY = useTransform(scrollYProgress, [0, 1], [0, 280]);
  const rightGlowY = useTransform(scrollYProgress, [0, 1], [0, -200]);

  return (
    <main className="noise relative overflow-x-hidden pb-16">
      <motion.div
        style={{ y: leftGlowY }}
        className="pointer-events-none absolute -left-20 top-16 h-72 w-72 rounded-full bg-[rgba(255,125,89,0.2)] blur-3xl"
      />
      <motion.div
        style={{ y: rightGlowY }}
        className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full bg-[rgba(57,208,255,0.18)] blur-3xl"
      />

      <header className="glass sticky top-0 z-40 border-b border-white/10">
        <Container className="flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-gold),var(--accent-sky))]" />
            <div>
              <p className="text-sm font-semibold">ScholarMind</p>
              <p className="muted text-xs">Summaries, quizzes, flashcards</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/auth" className={buttonVariants({ size: "sm", variant: "secondary" })}>
              Log in
            </Link>
            <Link href="/auth" className={buttonVariants({ size: "sm" })}>
              Start studying
            </Link>
          </div>
        </Container>
      </header>

      <Container className="pt-8">
        <section className="grid gap-8 pb-10 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="space-y-7"
          >
            <Badge className="bg-white/45">
              <Sparkles className="h-3.5 w-3.5" />
              Text, images, PDFs, and lecture transcripts
            </Badge>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.94] md:text-7xl">
                Upload notes. Get a short summary, quiz questions, flashcards, and instant Q&A.
              </h1>
              <p className="muted max-w-2xl text-base md:text-lg">
                Built for students who are overloaded with dense textbooks, long lecture notes, and revision
                material they do not want to rewrite by hand.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/auth" className={buttonVariants({ size: "lg" })}>
                Try it with notes
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#study-flow" className={buttonVariants({ size: "lg", variant: "secondary" })}>
                See study flow
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: FileText,
                  label: "Summary",
                  copy: "Generate a short revision sheet from long source material."
                },
                {
                  icon: MessageSquare,
                  label: "Questions",
                  copy: "Ask about the material and get grounded answers."
                },
                {
                  icon: Timer,
                  label: "Review",
                  copy: "Create flashcards and set the next revision step."
                }
              ].map((item) => (
                <div key={item.label} className="glass rounded-[26px] p-4">
                  <item.icon className="mb-3 h-5 w-5 text-[var(--accent-sky)]" />
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="muted mt-2 text-xs">{item.copy}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.55 }}
            className="relative"
          >
            <ThreeHero />
          </motion.div>
        </section>

        <div className="pb-10">
          <section className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
                    Made for study material
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold md:text-4xl">
                    Textbooks, lecture notes, transcripts, and revision packs can all feed the same session.
                  </h2>
                </div>
                <p className="muted max-w-md text-sm">
                  The point is not to create another place to decorate notes. It is to turn dense material
                  into something faster to revise from.
                </p>
              </CardHeader>
            </Card>

            <div className="grid gap-4">
              {[
                { value: "Text + Image", label: "Input from pasted notes, PDFs, and screenshots" },
                { value: "Quiz + Flashcards", label: "Practice layer built from the same source material" }
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardHeader>
                    <p className="text-3xl font-semibold">{stat.value}</p>
                    <p className="muted mt-2 text-sm">{stat.label}</p>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </Container>

      <div id="study-flow">
        <ScrollShowcase />
      </div>

      <Container className="py-16">
        <motion.section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {studyFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: index * 0.08, duration: 0.55 }}
            >
              <Card className="h-full overflow-hidden">
                <CardHeader className="relative space-y-3">
                  <div className="absolute right-5 top-5 h-16 w-16 rounded-full bg-[rgba(255,125,89,0.12)] blur-2xl" />
                  <feature.icon className="relative h-6 w-6 text-[var(--accent-sky)]" />
                  <h3 className="text-2xl font-semibold">{feature.title}</h3>
                  <p className="muted text-sm">{feature.copy}</p>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.section>
      </Container>

      <Container className="pb-8">
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader className="space-y-3">
              <Badge>
                <Sparkles className="h-3.5 w-3.5" />
                Free preview
              </Badge>
              <h2 className="text-3xl font-semibold">Everything is free right now, with sensible AI limits.</h2>
              <p className="muted text-sm md:text-base">
                While ScholarMind is still in preview, summaries, quizzes, flashcards, and grounded Q&amp;A stay open to everyone.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-[24px] bg-white/20 px-4 py-4">
                <p className="font-semibold">AI preview cap</p>
                <p className="muted mt-2">
                  Up to {defaultFreePreviewHourlyLimit} AI runs per hour and {defaultFreePreviewDailyLimit} per day to keep the shared API budget healthy while features are free.
                </p>
              </div>
              <div className="rounded-[24px] bg-white/20 px-4 py-4">
                <p className="font-semibold">Included right now</p>
                <p className="muted mt-2">
                  Upload sources, open study studios, preview files, ask source-grounded questions, and generate revision tools from the same material.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute right-6 top-6 rounded-full border border-white/15 bg-[rgba(255,125,89,0.16)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
              Restricted
            </div>
            <CardHeader className="space-y-3">
              <Badge className="bg-[rgba(255,125,89,0.18)]">
                <Lock className="h-3.5 w-3.5" />
                Pro coming soon
              </Badge>
              <h2 className="text-3xl font-semibold">The Pro tier is locked for now.</h2>
              <p className="muted text-sm md:text-base">
                Higher limits, more generous OCR runs, and extra study analytics will land here once the free preview settles.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                "Expanded AI usage limits",
                "More generous scanned-PDF processing",
                "Advanced study tracking and extra analytics"
              ].map((item) => (
                <div key={item} className="rounded-[24px] border border-dashed border-white/15 bg-white/10 px-4 py-4">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </Container>

      <Container className="py-8">
        <motion.section className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
          <Card>
            <CardHeader className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-sky)]">
                Input and Output
              </p>
              <h2 className="text-4xl font-semibold">Feed the session once, then revise from several angles.</h2>
              <p className="muted text-sm md:text-base">
                Students can move from source material into summaries, question answering, recall practice,
                and next-step review without rebuilding the context each time.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {studyModes.map((mode) => (
                <div key={mode.title} className="rounded-[28px] border border-white/15 bg-white/15 p-5">
                  <p className="text-lg font-semibold">{mode.title}</p>
                  <p className="muted mt-3 text-sm">{mode.copy}</p>
                  <div className="mt-5 space-y-3 text-sm">
                    {mode.bullets.map((bullet) => (
                      <p key={bullet} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[var(--accent-sky)]" />
                        {bullet}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-coral)]">
                FAQ
              </p>
              <h2 className="text-4xl font-semibold">What students can actually do with it.</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {faqs.map((item) => (
                <div key={item.q} className="rounded-[24px] bg-white/20 px-4 py-4">
                  <p className="text-sm font-semibold">{item.q}</p>
                  <p className="muted mt-2 text-sm">{item.a}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.section>
      </Container>

      <Container className="pb-10 pt-4">
        <motion.div>
          <Card className="overflow-hidden">
            <CardHeader className="relative space-y-4 text-center">
              <div className="absolute inset-x-20 top-0 h-24 rounded-full bg-[rgba(255,125,89,0.12)] blur-3xl" />
              <div className="relative">
                <Badge className="mx-auto">
                  <WandSparkles className="h-3.5 w-3.5" />
                  Ready for revision
                </Badge>
                <h2 className="mt-5 text-4xl font-semibold md:text-5xl">
                  Paste a lecture transcript or upload notes and start revising.
                </h2>
                <p className="muted mx-auto mt-3 max-w-2xl text-sm md:text-base">
                  Use one session to summarise, ask questions, generate a quiz, build flashcards, and plan
                  the next review.
                </p>
              </div>
              <div className="relative flex flex-wrap justify-center gap-3">
                <Link href="/auth" className={buttonVariants({ size: "lg" })}>
                  Open workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/dashboard" className={buttonVariants({ size: "lg", variant: "secondary" })}>
                  Go to dashboard
                </Link>
              </div>
            </CardHeader>
          </Card>
        </motion.div>
      </Container>

      <footer className="border-t border-white/10 py-8">
        <Container className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-gold),var(--accent-sky))]" />
            <div>
              <p className="text-sm font-semibold">ScholarMind</p>
              <p className="muted text-xs">Notes in. Summary, questions, flashcards out.</p>
            </div>
          </div>
          <div className="muted text-xs">© {new Date().getFullYear()} ScholarMind</div>
        </Container>
      </footer>
    </main>
  );
}
