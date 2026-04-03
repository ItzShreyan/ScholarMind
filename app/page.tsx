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
import { BrandLink } from "@/components/common/BrandLink";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import {
  defaultExamGeneratorWeeklyLimit,
  defaultFreePreviewDailyLimit,
  defaultFreePreviewHourlyLimit
} from "@/lib/ai/preview";

const studyFeatures = [
  {
    icon: Brain,
    title: "Personalised AI tutor",
    copy: "Get step-by-step explanations, guided revision help, and clearer follow-up questions that stay grounded in your own sources."
  },
  {
    icon: MessageSquare,
    title: "Separate revision schedule workspace",
    copy: "Plan toward the real exam, open each day as its own study session, and keep progress synced to the same account."
  },
  {
    icon: FileText,
    title: "Interactive exam and quiz practice",
    copy: "Answer quizzes and full mock papers online, then export the same work as PDF or JSON when you need it outside the app."
  },
  {
    icon: CheckCircle2,
    title: "Studios that follow your account",
    copy: "Uploads, saved outputs, limits, preferences, and studio progress stay tied to the user account across devices."
  }
];

const studyModes = [
  {
    title: "What goes in",
    copy: "Your own class material first, with scholar-style web sources ready when you need backup sources.",
    bullets: ["Upload PDFs, docs, tables, screenshots, and note images", "Import scholar-style or trusted web sources into a studio", "Keep everything grouped inside notebook-style studios"]
  },
  {
    title: "What comes out",
    copy: "A revision workspace with grounded chat, online practice, visual outputs, and an exam-day plan.",
    bullets: ["Summaries, quizzes, flashcards, and concept maps", "Interactive mock exams plus PDF and JSON export", "Revision schedules, study reports, and performance insights"]
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
    a: "The same account now ties together source-grounded chat, tools, saved outputs, exam practice, and a separate revision schedule workspace instead of splitting them across separate apps."
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
          <BrandLink href="/" subtitle="Summaries, quizzes, flashcards" />

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

      <Container className="pt-5 sm:pt-8">
        <section className="grid gap-6 pb-8 pt-4 sm:gap-8 sm:pb-10 sm:pt-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="space-y-5 sm:space-y-7"
          >
            <Badge className="bg-white/45">
              <Sparkles className="h-3.5 w-3.5" />
              Text, images, PDFs, and lecture transcripts
            </Badge>

            <div className="space-y-3 sm:space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold leading-[0.96] sm:text-5xl md:text-6xl lg:text-7xl">
                Upload notes. Turn them into a personal AI tutor, revision tools, and a real study plan.
              </h1>
              <p className="muted max-w-2xl text-sm sm:text-base md:text-lg">
                Built for students who need one place to upload notes, pull in verified web sources, ask grounded
                questions, get step-by-step help, and keep study progress moving without rewriting everything by hand.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/auth" className={`${buttonVariants({ size: "lg" })} w-full justify-center sm:w-auto`}>
                Try it with notes
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#study-flow" className={`${buttonVariants({ size: "lg", variant: "secondary" })} w-full justify-center sm:w-auto`}>
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
                  copy: "Read tutor-style answers, tables, diagrams, and step-by-step guides instead of dense response blocks."
                },
                {
                  icon: Brain,
                  label: "Tutor flow",
                  copy: "Ask, learn step by step, check yourself, then move straight into quizzes or exams."
                }
              ].map((item) => (
                <div key={item.label} className="glass rounded-[22px] p-3.5 sm:rounded-[26px] sm:p-4">
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

        <div className="pb-6 sm:pb-10">
          <section className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-col gap-3 p-5 sm:p-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
                    Made for study material
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold sm:text-3xl md:text-4xl">
                    Notes, scanned pages, scholar-style sources, and revision packs can all feed the same AI tutor workspace.
                  </h2>
                </div>
                <p className="muted max-w-md text-sm">
                  The point is to build one grounded study stack that can teach the topic, generate practice, and expose misconceptions quickly.
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

      <Container className="py-10 sm:py-16">
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
                <CardHeader className="relative space-y-3 p-5 sm:p-6">
                  <div className="absolute right-5 top-5 h-16 w-16 rounded-full bg-[rgba(255,125,89,0.12)] blur-2xl" />
                  <feature.icon className="relative h-6 w-6 text-[var(--accent-sky)]" />
                  <h3 className="text-xl font-semibold sm:text-2xl">{feature.title}</h3>
                  <p className="muted text-sm">{feature.copy}</p>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.section>
      </Container>

      <Container className="pb-6 sm:pb-8">
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader className="space-y-3 p-5 sm:p-6">
              <Badge>
                <Sparkles className="h-3.5 w-3.5" />
                Free preview
              </Badge>
              <h2 className="text-2xl font-semibold sm:text-3xl">Everything is free right now, with sensible AI limits.</h2>
              <p className="muted text-sm md:text-base">
                While ScholarMind is still in preview, scholar search, grounded chat, quizzes, flashcards, and visual study outputs stay open to everyone.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0 text-sm sm:p-6 sm:pt-0">
              <div className="rounded-[20px] bg-white/20 px-4 py-4 sm:rounded-[24px]">
                <p className="font-semibold">AI preview cap</p>
                <p className="muted mt-2">
                  Up to {defaultFreePreviewHourlyLimit} AI runs per hour and {defaultFreePreviewDailyLimit} per day to keep the shared API budget healthy while features are free.
                </p>
                <p className="muted mt-2">
                  Full mock exam generation is separately capped at {defaultExamGeneratorWeeklyLimit} per week because it is a heavier AI run.
                </p>
              </div>
              <div className="rounded-[20px] bg-white/20 px-4 py-4 sm:rounded-[24px]">
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
            <CardHeader className="space-y-3 p-5 sm:p-6">
              <Badge className="bg-[rgba(255,125,89,0.18)]">
                <Lock className="h-3.5 w-3.5" />
                Pro coming soon
              </Badge>
              <h2 className="text-2xl font-semibold sm:text-3xl">The Pro tier is locked for now.</h2>
              <p className="muted text-sm md:text-base">
                Higher limits, more generous OCR runs, and extra study analytics will land here once the free preview settles.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0 text-sm sm:p-6 sm:pt-0">
              {[
                "Expanded AI usage limits",
                "More generous scanned-PDF processing",
                "Advanced study tracking and extra analytics"
              ].map((item) => (
                <div key={item} className="rounded-[20px] border border-dashed border-white/15 bg-white/10 px-4 py-4 sm:rounded-[24px]">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </Container>

      <Container className="py-6 sm:py-8">
        <motion.section className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
          <Card>
            <CardHeader className="space-y-3 p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-sky)]">
                Input and Output
              </p>
              <h2 className="text-2xl font-semibold sm:text-3xl md:text-4xl">Feed the session once, then revise from several angles.</h2>
              <p className="muted text-sm md:text-base">
                Students can move from source material into summaries, question answering, recall practice,
                tables, diagrams, and next-step review without rebuilding the context each time.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 pt-0 md:grid-cols-2 sm:p-6 sm:pt-0">
              {studyModes.map((mode) => (
                <div key={mode.title} className="rounded-[22px] border border-white/15 bg-white/15 p-4 sm:rounded-[28px] sm:p-5">
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
            <CardHeader className="space-y-2 p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-coral)]">
                FAQ
              </p>
              <h2 className="text-2xl font-semibold sm:text-3xl md:text-4xl">What students can actually do with it.</h2>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0 sm:p-6 sm:pt-0">
              {faqs.map((item) => (
                <div key={item.q} className="rounded-[20px] bg-white/20 px-4 py-4 sm:rounded-[24px]">
                  <p className="text-sm font-semibold">{item.q}</p>
                  <p className="muted mt-2 text-sm">{item.a}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.section>
      </Container>

      <Container className="pb-8 pt-2 sm:pb-10 sm:pt-4">
        <motion.div>
          <Card className="overflow-hidden">
            <CardHeader className="relative space-y-4 p-5 text-center sm:p-6">
              <div className="absolute inset-x-20 top-0 h-24 rounded-full bg-[rgba(255,125,89,0.12)] blur-3xl" />
              <div className="relative">
                <Badge className="mx-auto">
                  <WandSparkles className="h-3.5 w-3.5" />
                  Ready for revision
                </Badge>
                <h2 className="mt-5 text-2xl font-semibold sm:text-4xl md:text-5xl">
                  Open a studio, add sources, and turn them into revision-ready answers.
                </h2>
                <p className="muted mx-auto mt-3 max-w-2xl text-sm md:text-base">
                  Use one studio to summarise, ask questions, generate a quiz, build flashcards, open a revision schedule, and keep everything tied to the same source stack.
                </p>
              </div>
              <div className="relative flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/auth" className={`${buttonVariants({ size: "lg" })} w-full justify-center sm:w-auto`}>
                  Open workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/dashboard" className={`${buttonVariants({ size: "lg", variant: "secondary" })} w-full justify-center sm:w-auto`}>
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
