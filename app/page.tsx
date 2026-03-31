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
import {
  defaultExamGeneratorDailyLimit,
  defaultFreePreviewDailyLimit,
  defaultFreePreviewHourlyLimit
} from "@/lib/ai/preview";

const studyFeatures = [
  {
    icon: CheckCircle2,
    title: "Scholar-first source search",
    copy: "Start with academic and trusted learning sources by default, then widen out to Google or DuckDuckGo when needed."
  },
  {
    icon: MessageSquare,
    title: "Readable AI answers",
    copy: "Ask grounded questions and get cleaner responses with better spacing, revision tables, and clearer step-by-step explanations."
  },
  {
    icon: Brain,
    title: "Exam Trap Radar",
    copy: "Surface common mistakes, why students fall for them, and what to check before the real exam."
  },
  {
    icon: FileText,
    title: "Tables, diagrams, and maths help",
    copy: "Turn sources into quizzes, flashcards, concept maps, comparison tables, full mock exams, and clearer maths revision support."
  }
];

const studyModes = [
  {
    title: "What goes in",
    copy: "Your own files first, with scholar-style web sources ready when you do not have notes nearby.",
    bullets: ["Upload PDFs, docs, tables, and note images", "Import trusted web sources into a studio", "Keep sources grouped by notebook-style studios"]
  },
  {
    title: "What comes out",
    copy: "A cleaner revision workspace with generated practice, visual explanations, and source-grounded chat.",
    bullets: ["Summaries, quiz sets, and flashcards", "Concept tables and mermaid diagrams", "Exam Trap Radar and study-plan outputs"]
  }
];

const faqs = [
  {
    q: "Can it work from my own notes?",
    a: "Yes. The flow is built around your own text, images, lecture notes, and transcripts."
  },
  {
    q: "What if I do not have notes yet?",
    a: "The source picker starts in scholar mode so students can pull in academic and trusted web sources before they start revising."
  },
  {
    q: "Can it help with maths revision too?",
    a: "Yes. Chat and tools can now format clearer worked explanations, revision tables, and diagrams when the topic needs them."
  },
  {
    q: "What feels unique here?",
    a: "Exam Trap Radar is built to catch likely misconceptions and turn them into practical self-checks instead of generic summary text."
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
                Built for students who need one place to upload notes, pull in verified web sources, ask grounded
                questions, and turn everything into revision-ready outputs without rewriting it all by hand.
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
                  icon: CheckCircle2,
                  label: "Verified sources",
                  copy: "Start with scholar-style and trusted learning sources when your own files are missing."
                },
                {
                  icon: MessageSquare,
                  label: "Clear chat",
                  copy: "Read spaced-out answers, tables, and diagrams instead of dense response blocks."
                },
                {
                  icon: Brain,
                  label: "Trap radar",
                  copy: "Spot exam mistakes before they show up in real questions."
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
                    Textbooks, lecture notes, transcripts, scholar-style web sources, and revision packs can all feed the same studio.
                  </h2>
                </div>
                <p className="muted max-w-md text-sm">
                  The point is not to create another place to decorate notes. It is to build a source-grounded study stack that can answer questions, generate practice, and expose misconceptions quickly.
                </p>
              </CardHeader>
            </Card>

            <div className="grid gap-4">
              {[
                { value: "Scholar + Web", label: "Default search starts with academic and trusted learning sources" },
                { value: "Tables + Diagrams", label: "Visual outputs for concept links, maths revision, and comparisons" }
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
                While ScholarMind is still in preview, scholar search, grounded chat, quizzes, flashcards, and visual study outputs stay open to everyone.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-[24px] bg-white/20 px-4 py-4">
                <p className="font-semibold">AI preview cap</p>
                <p className="muted mt-2">
                  Up to {defaultFreePreviewHourlyLimit} AI runs per hour and {defaultFreePreviewDailyLimit} per day to keep the shared API budget healthy while features are free.
                </p>
                <p className="muted mt-2">
                  Full mock exam generation is separately capped at {defaultExamGeneratorDailyLimit} per day because it is a heavier AI run.
                </p>
              </div>
              <div className="rounded-[24px] bg-white/20 px-4 py-4">
                <p className="font-semibold">Included right now</p>
                <p className="muted mt-2">
                  Upload sources, remove or preview files, search scholar-style references, ask source-grounded questions, and generate revision tools from the same material.
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
                tables, diagrams, and next-step review without rebuilding the context each time.
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
                  Open a studio, add sources, and turn them into revision-ready answers.
                </h2>
                <p className="muted mx-auto mt-3 max-w-2xl text-sm md:text-base">
                  Use one studio to summarise, ask questions, generate a quiz, build flashcards, draw concept maps, and catch exam traps from the same source stack.
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
              <p className="muted text-xs">Scholar-first sources in. Clearer revision, diagrams, and mock exams out.</p>
            </div>
          </div>
          <div className="muted text-xs">© {new Date().getFullYear()} ScholarMind</div>
        </Container>
      </footer>
    </main>
  );
}
