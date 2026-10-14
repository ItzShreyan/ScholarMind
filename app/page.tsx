import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  Gauge,
  GraduationCap,
  Lock,
  Quote,
  ShieldCheck,
  Sparkles,
  Target,
  WandSparkles
} from "lucide-react";
import { DeferredLearningWorld } from "@/components/landing/DeferredLearningWorld";
import { DeferredScrollShowcase } from "@/components/landing/DeferredScrollShowcase";
import { BrandLink } from "@/components/common/BrandLink";
import { SecurityBadge } from "@/components/common/SecurityBadge";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { WORLD_SPACES } from "@/components/world/worldSpaces";
import { CHAT_MODELS } from "@/lib/ai/models";

/*
 * Everything on this page is a claim about something that already works.
 * The five spaces come from the same source of truth the world renders, so the
 * 3D campus and this page can never describe different products.
 */

const sessionSteps = [
  {
    icon: BookOpen,
    title: "Add the real material",
    copy: "Upload the PDFs, slide decks, scanned pages and photos of handwritten notes you already revise from. Import a web source only when a topic needs one."
  },
  {
    icon: Quote,
    title: "Work from the sources",
    copy: "Summaries, chat answers and generated questions cite the material you added, using your curriculum stage and exam board from your profile."
  },
  {
    icon: Target,
    title: "Test, then fix",
    copy: "Quizzes, flashcards and full mock papers with mark schemes. Every wrong answer feeds the performance report that decides what to study next."
  },
  {
    icon: GraduationCap,
    title: "Keep the plan",
    copy: "Lay a revision schedule over the weeks before the exam, open each day as its own session, and export exam-day material as PDF or JSON."
  }
];

const modelFacts = [
  {
    label: CHAT_MODELS.pro.label,
    role: "For the hard work",
    copy: "Proofs, multi-step calculations, code, and long structured output — full notes, exam papers and anything with marks attached."
  },
  {
    label: CHAT_MODELS.flash.label,
    role: "For fast answers",
    copy: "Quick explanations, definitions and follow-up questions, so ordinary revision does not wait on a large model."
  },
  {
    label: "Auto",
    role: "Decides for you",
    copy: "Reads the question in front of you and escalates to the heavy model only when the question genuinely needs it. Its reasoning is shown before you send."
  }
];

const faqs = [
  {
    q: "Does it only work if I already have notes?",
    a: "No. If your own files are missing, the source picker starts in scholar mode and will search academic and trusted learning sources, which you then import as a source like any other."
  },
  {
    q: "How is this different from pasting my notes into a chatbot?",
    a: "The answer is grounded in a specific studio's sources, and the same account keeps the outputs, quiz results, saved notes and revision schedule together — instead of the context disappearing when the tab closes."
  },
  {
    q: "Will it help with maths and the sciences?",
    a: "Yes. Worked methods, formulas, tables and diagrams are rendered properly rather than as plain paragraphs, and answers are laid out as steps, final answers, practice questions and key vocabulary."
  },
  {
    q: "Which model is answering me?",
    a: "You choose. Pro and Flash are named explicitly, and Auto shows you which one it picked and why before you send the question. The reply itself is labelled with the model that actually answered."
  }
];
export default function LandingPage() {
  return (
    <main className="noise relative overflow-x-hidden pb-16">
      <header className="glass sticky top-0 z-40 border-b border-[color:var(--surface-border)]">
        <Container className="flex items-center justify-between py-4">
          <BrandLink href="/" subtitle="Notes in, understanding out" />

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

      <Container className="pt-6 sm:pt-10">
        <section className="mx-auto max-w-3xl text-center">
          <Badge>
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Grounded in your own notes, PDFs and transcripts
          </Badge>

          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.02] tracking-tight text-[color:var(--text-1)] sm:text-5xl md:text-6xl">
            A learning world you can walk through, built from the notes you already have.
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[color:var(--text-2)] sm:text-base">
            Five places to study in — a library for your material, an observatory for the concepts that
            have not clicked, a practice hall for testing yourself, a garden for spacing revision over
            weeks, and a hub where a session actually happens. Every one of them is real.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/auth" className={`${buttonVariants({ size: "lg" })} w-full justify-center sm:w-auto`}>
              Open your learning world
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#places"
              className={`${buttonVariants({ size: "lg", variant: "secondary" })} w-full justify-center sm:w-auto`}
            >
              See the five places
            </a>
          </div>
        </section>

        <section className="mt-9 sm:mt-12" aria-label="The ScholarMind learning world">
          <DeferredLearningWorld />
        </section>
      </Container>

      <Container className="section-y" id="places">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label text-[color:var(--accent-coral)]">What each place is for</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[color:var(--text-1)] sm:text-3xl md:text-4xl">
              Five rooms, five different jobs.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-[color:var(--text-3)]">
            This is the whole point of the world: knowing where to go. Reading and testing are different
            activities, and mixing them up is why revision feels unproductive.
          </p>
        </div>

        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {WORLD_SPACES.map((space) => (
            <li key={space.id}>
              <Link href={space.href} className="group block h-full">
                <Card className="flex h-full flex-col overflow-hidden transition-colors duration-150 hover:border-[color:var(--accent-coral)]">
                  <CardHeader className="flex-1 space-y-3 p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2">
                        <Compass className="h-4 w-4 text-[color:var(--accent-coral)]" aria-hidden="true" />
                        <span className="font-display text-lg font-semibold text-[color:var(--text-1)]">
                          {space.label}
                        </span>
                      </span>
                      {space.requiresAuth ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-3)]">
                          <Lock className="h-3 w-3" aria-hidden="true" />
                          Sign in
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium text-[color:var(--text-2)]">{space.purpose}</p>
                    <p className="text-sm leading-7 text-[color:var(--text-3)]">{space.detail}</p>
                    <p className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-semibold text-[color:var(--accent-sky)]">
                      Open {space.destination}
                      <ArrowRight
                        className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </p>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      <div id="study-flow">
        <DeferredScrollShowcase />
      </div>

      <Container className="section-y">
        <div className="mb-6">
          <p className="label text-[color:var(--accent-sky)]">One session, end to end</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-[color:var(--text-1)] sm:text-3xl md:text-4xl">
            How a studio actually runs.
          </h2>
        </div>

        <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sessionSteps.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full">
                <CardHeader className="space-y-3 p-5 sm:p-6">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--text-3)]">
                    <step.icon className="h-4 w-4 text-[color:var(--accent-sky)]" aria-hidden="true" />
                    Step {index + 1}
                  </span>
                  <h3 className="font-display text-lg font-semibold text-[color:var(--text-1)]">{step.title}</h3>
                  <p className="text-sm leading-7 text-[color:var(--text-3)]">{step.copy}</p>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>
      </Container>

      <Container className="pb-10 sm:pb-16">
        <Card className="overflow-hidden">
          <CardHeader className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div className="space-y-3">
              <p className="label text-[color:var(--accent-coral)]">The models</p>
              <h2 className="font-display text-2xl font-semibold text-[color:var(--text-1)] sm:text-3xl">
                You can see which model is answering, and why.
              </h2>
              <p className="text-sm leading-7 text-[color:var(--text-3)]">
                The choice is yours, and it is remembered. When you leave it on Auto, the picker tells you
                what it is about to do before the question is sent — and the finished answer is labelled
                with the model that actually replied.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {modelFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="rounded-[var(--radius-lg)] border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-4"
                >
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-3)]">
                    <Gauge className="h-3 w-3" aria-hidden="true" />
                    {fact.role}
                  </span>
                  <p className="mt-2 font-display text-base font-semibold text-[color:var(--text-1)]">{fact.label}</p>
                  <p className="mt-2 text-xs leading-6 text-[color:var(--text-3)]">{fact.copy}</p>
                </div>
              ))}
            </div>
          </CardHeader>
        </Card>
      </Container>

      <Container className="pb-10 sm:pb-16">
        <Card className="overflow-hidden">
          <CardHeader className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="space-y-4">
              <SecurityBadge />
              <h2 className="font-display text-2xl font-semibold text-[color:var(--text-1)] sm:text-3xl md:text-4xl">
                Your files and your account stay yours.
              </h2>
              <p className="text-sm leading-7 text-[color:var(--text-3)]">
                Server-side access rules, rate limiting and upload verification protect student accounts,
                study files and the shared AI budget.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["Account scoped", "Studios, uploads, chat history, limits and preferences are tied to the signed-in user."],
                  ["Upload checked", "Files are size-limited, ownership-checked and verified before they become study sources."],
                  ["Abuse defence", "Suspicious requests are challenged or blocked before they reach sensitive routes."]
                ] as const
              ).map(([title, copy]) => (
                <div
                  key={title}
                  className="rounded-[var(--radius-lg)] border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-4"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--text-1)]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--accent-sky)]" aria-hidden="true" />
                    {title}
                  </span>
                  <p className="mt-2 text-xs leading-6 text-[color:var(--text-3)]">{copy}</p>
                </div>
              ))}
            </div>
          </CardHeader>
        </Card>
      </Container>

      <Container className="pb-10 sm:pb-14">
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader className="space-y-3 p-5 sm:p-6">
              <Badge>
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Free preview
              </Badge>
              <h2 className="font-display text-2xl font-semibold text-[color:var(--text-1)] sm:text-3xl">
                Everything is open during the preview.
              </h2>
              <p className="text-sm leading-7 text-[color:var(--text-3)]">
                Scholar search, grounded chat, quizzes, flashcards, AI Notes and the revision schedule are
                all available, with fair per-user AI limits to keep the shared budget healthy.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0 sm:p-6 sm:pt-0">
              {[
                "Full mock exam generation is capped separately, because it is a much heavier run.",
                "Uploads, saved outputs and quiz history stay on your account across devices."
              ].map((line) => (
                <p key={line} className="flex gap-2 text-sm leading-7 text-[color:var(--text-3)]">
                  <CheckCircle2 className="mt-1.5 h-4 w-4 shrink-0 text-[color:var(--accent-mint)]" aria-hidden="true" />
                  {line}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="space-y-3 p-5 sm:p-6">
              <Badge>
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Pro, later
              </Badge>
              <h2 className="font-display text-2xl font-semibold text-[color:var(--text-1)] sm:text-3xl">
                Higher limits are not on sale yet.
              </h2>
              <p className="text-sm leading-7 text-[color:var(--text-3)]">
                We would rather ship a preview that works than sell a tier that does not. When Pro arrives it
                will be exactly these three things:
              </p>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0 sm:p-6 sm:pt-0">
              {[
                "Expanded AI usage limits",
                "More generous scanned-PDF processing",
                "Extra study analytics and progress tracking"
              ].map((line) => (
                <p
                  key={line}
                  className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--surface-border)] px-4 py-3 text-sm text-[color:var(--text-3)]"
                >
                  {line}
                </p>
              ))}
            </CardContent>
          </Card>
        </section>
      </Container>

      <Container className="pb-10 sm:pb-14">
        <div className="mb-6">
          <p className="label text-[color:var(--accent-sky)]">Questions</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-[color:var(--text-1)] sm:text-3xl md:text-4xl">
            Straight answers.
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {faqs.map((item) => (
            <div
              key={item.q}
              className="rounded-[var(--radius-lg)] border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-5"
            >
              <p className="text-sm font-semibold text-[color:var(--text-1)]">{item.q}</p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--text-3)]">{item.a}</p>
            </div>
          ))}
        </div>
      </Container>

      <Container className="pb-12 sm:pb-16">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-4 p-6 text-center sm:p-10">
            <Badge className="mx-auto">
              <WandSparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Ready when your notes are
            </Badge>
            <h2 className="mx-auto max-w-3xl font-display text-2xl font-semibold text-[color:var(--text-1)] sm:text-4xl md:text-5xl">
              Open a studio, add your sources, and start at the library.
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-7 text-[color:var(--text-3)] md:text-base">
              Summarise, ask grounded questions, generate a quiz, build flashcards, plan the weeks before
              the exam — all from the same source stack.
            </p>
            <div className="flex flex-col justify-center gap-3 pt-1 sm:flex-row">
              <Link href="/auth" className={`${buttonVariants({ size: "lg" })} w-full justify-center sm:w-auto`}>
                Get started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/ai-study-assistant"
                className={`${buttonVariants({ size: "lg", variant: "secondary" })} w-full justify-center sm:w-auto`}
              >
                Try the study assistant
              </Link>
            </div>
          </CardHeader>
        </Card>
      </Container>

      <footer className="border-t border-[color:var(--surface-border)] py-8">
        <Container className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Logo variant="full" size={40} />
          <p className="text-xs text-[color:var(--text-3)]">
            Scholar-first sources in. Clearer revision, worked methods and mock exams out.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <SecurityBadge compact />
            <Link href="/privacy" className="text-[color:var(--text-3)] transition-colors hover:text-[color:var(--text-1)]">
              Privacy
            </Link>
            <Link href="/terms" className="text-[color:var(--text-3)] transition-colors hover:text-[color:var(--text-1)]">
              Terms
            </Link>
            <a
              href="mailto:hello.minddevelopment@gmail.com"
              className="text-[color:var(--text-3)] transition-colors hover:text-[color:var(--accent-sky)]"
            >
              hello.minddevelopment@gmail.com
            </a>
            <span className="text-[color:var(--text-3)]">© {new Date().getFullYear()} ScholarMind</span>
          </div>
        </Container>
      </footer>
    </main>
  );
}
