import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { BrandLink } from "@/components/common/BrandLink";
import { SecurityBadge } from "@/components/common/SecurityBadge";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

type SeoStudyPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: string;
  highlights: string[];
  steps: Array<{ title: string; copy: string }>;
  outcomes: Array<{ title: string; copy: string }>;
  faqs: Array<{ question: string; answer: string }>;
  related?: Array<{ href: string; label: string }>;
};

export function SeoStudyPage({
  eyebrow,
  title,
  description,
  primaryCta,
  highlights,
  steps,
  outcomes,
  faqs,
  related = []
}: SeoStudyPageProps) {
  return (
    <main className="noise min-h-screen overflow-x-hidden pb-12">
      <header className="glass sticky top-0 z-40 border-b border-white/10">
        <Container className="flex items-center justify-between py-4">
          <BrandLink href="/" subtitle="AI tutor, sources, quizzes" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/auth"
              className="inline-flex items-center justify-center rounded-full bg-[var(--fg)] px-4 py-2 text-sm font-semibold text-[var(--bg)] transition hover:scale-[1.01]"
            >
              Start
            </Link>
          </div>
        </Container>
      </header>

      <Container className="py-10 sm:py-14">
        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <Card className="overflow-hidden">
            <CardHeader className="relative space-y-5 p-6 sm:p-8">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[rgba(57,208,255,0.16)] blur-3xl" />
              <div className="relative inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-coral)]">
                <Sparkles className="h-3.5 w-3.5" />
                {eyebrow}
              </div>
              <div className="relative space-y-4">
                <h1 className="text-4xl font-semibold leading-[0.98] sm:text-5xl md:text-6xl">{title}</h1>
                <p className="muted max-w-3xl text-base leading-7 sm:text-lg">{description}</p>
              </div>
              <div className="relative flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-gold),var(--accent-sky))] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(255,125,89,0.22)] transition hover:-translate-y-0.5 hover:brightness-105"
                >
                  {primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/study-tools"
                  className="glass inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold"
                >
                  Compare study tools
                </Link>
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-3">
            {highlights.map((highlight, index) => (
              <Card key={highlight}>
                <CardHeader className="flex flex-row items-start gap-3 p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-sky))] text-sm font-black text-slate-950">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold leading-6">{highlight}</p>
                </CardHeader>
              </Card>
            ))}
            <SecurityBadge />
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader className="space-y-3 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent-sky)]">How it works</p>
              <h2 className="text-2xl font-semibold sm:text-3xl">From source material to active revision.</h2>
            </CardHeader>
            <CardContent className="space-y-3 p-6 pt-0">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-[22px] bg-white/14 px-4 py-4">
                  <p className="text-sm font-semibold">
                    {index + 1}. {step.title}
                  </p>
                  <p className="muted mt-2 text-sm leading-6">{step.copy}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-3 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">What you get</p>
              <h2 className="text-2xl font-semibold sm:text-3xl">Study outputs that stay tied to your own notes.</h2>
            </CardHeader>
            <CardContent className="grid gap-3 p-6 pt-0 sm:grid-cols-2">
              {outcomes.map((outcome) => (
                <div key={outcome.title} className="rounded-[22px] border border-white/10 bg-white/12 px-4 py-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-[var(--accent-mint)]" />
                    {outcome.title}
                  </p>
                  <p className="muted mt-2 text-sm leading-6">{outcome.copy}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader className="space-y-3 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent-mint)]">Questions</p>
              <h2 className="text-2xl font-semibold sm:text-3xl">Quick answers before you try it.</h2>
            </CardHeader>
            <CardContent className="space-y-3 p-6 pt-0">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-[22px] bg-white/14 px-4 py-4">
                  <p className="text-sm font-semibold">{faq.question}</p>
                  <p className="muted mt-2 text-sm leading-6">{faq.answer}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-4 p-6">
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                <ShieldCheck className="h-4 w-4" />
                Launch-ready workspace
              </p>
              <h2 className="text-2xl font-semibold sm:text-3xl">Built around sources, not generic answers.</h2>
              <p className="muted text-sm leading-6">
                ScholarMind keeps tools grounded to enabled uploads and imported sources. Students can disable a source, delete it, or open generated outputs as workspace tabs.
              </p>
              {related.length ? (
                <div className="flex flex-wrap gap-2">
                  {related.map((item) => (
                    <Link key={item.href} href={item.href} className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold transition hover:bg-white/16">
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </CardHeader>
          </Card>
        </section>
      </Container>
    </main>
  );
}
