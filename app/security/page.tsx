"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ShieldCheck, Lock, Eye, AlertTriangle, RefreshCw, FileCheck, ArrowLeft, ExternalLink, Server, Search, Ban, Zap } from "lucide-react";
import { SecurityBadge } from "@/components/common/SecurityBadge";
import { Button } from "@/components/ui/Button";

const engines = [
  {
    icon: Lock,
    title: "End-to-end encryption headers",
    color: "var(--accent-sky)",
    description: "Strict security headers (CSP, HSTS, X-Frame-Options) are applied to every response to prevent common web attacks."
  },
  {
    icon: Search,
    title: "Suspicious-request detection",
    color: "var(--accent-coral)",
    description: "Local pattern-matching flags unusual request behaviour before it reaches your study data."
  },
  {
    icon: Ban,
    title: "Upload validation",
    color: "var(--accent-gold)",
    description: "Each uploaded file is checked for type, size, and content safety before it is stored or processed."
  },
  {
    icon: AlertTriangle,
    title: "Human verification",
    color: "var(--accent-mint)",
    description: "Suspicious traffic triggers a lightweight human check — keeping bots out without a noisy CAPTCHA."
  },
  {
    icon: Zap,
    title: "API throttling",
    color: "var(--accent-coral)",
    description: "Rate limits and hourly/daily AI usage caps prevent runaway costs and abuse of the study tools."
  },
  {
    icon: Server,
    title: "Arcjet optional protection",
    color: "var(--accent-sky)",
    description: "Arcjet can be enabled for deeper threat intelligence — bot detection, VPN blocking, and IP reputation."
  },
  {
    icon: RefreshCw,
    title: "Supabase RLS at rest",
    color: "var(--accent-mint)",
    description: "Row-level security in Supabase keeps signed-in users scoped to their own studios, files, chat history, and settings."
  }
];

const howSteps = [
  {
    number: "01",
    title: "Request arrives",
    body: "Every API request hits the Mind Security middleware before reaching your study data."
  },
  {
    number: "02",
    title: "Headers are set",
    body: "Security headers are injected into the response, locking down what browsers and scripts are allowed to do."
  },
  {
    number: "03",
    title: "Behaviour is scored",
    body: "The engine scores the request against known abuse patterns — unusual rate, unexpected payloads, bot signatures."
  },
  {
    number: "04",
    title: "Decision is made",
    body: "Clean requests pass through. Suspicious requests get a human challenge. Malicious requests are blocked entirely."
  }
];

function FadeInSection({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function SecurityPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const heroRotateX = useTransform(scrollYProgress, [0, 1], [0, 4]);
  const heroRotateY = useTransform(scrollYProgress, [0, 1], [0, -3]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  return (
    <main className="noise min-h-screen pb-24">
      {/* Nav bar */}
      <header className="glass sticky top-0 z-40 border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--fg)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to ScholarMind
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/privacy"
              className="text-xs font-medium text-[var(--muted)] transition hover:text-[var(--fg)]"
            >
              Privacy Policy
            </Link>
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-gold),var(--accent-sky))] px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_14px_40px_rgba(57,208,255,0.18)] transition hover:scale-[1.01]"
            >
              Open ScholarMind
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        ref={heroRef}
        className="relative overflow-hidden border-b border-white/10 bg-hero-glow"
      >
        <div className="mesh-overlay pointer-events-none absolute inset-0" />
        <motion.div
          style={{ rotateX: heroRotateX, rotateY: heroRotateY, y: heroY }}
          className="perspective-stage mx-auto max-w-4xl px-4 py-20 text-center sm:py-28"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 inline-block"
          >
            <SecurityBadge />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-4xl font-semibold sm:text-6xl"
          >
            Built on a security-first foundation
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="muted mx-auto mt-5 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8"
          >
            The Mind Security Engine adds security headers, local suspicious-request
            detection, upload validation, human verification for suspicious traffic,
            API throttling, and optional Arcjet protection. Supabase row-level security
            keeps signed-in users scoped to their own studios, files, chat history,
            and settings.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link href="/auth">
              <Button>Try ScholarMind</Button>
            </Link>
            <Link href="/privacy">
              <Button variant="ghost">
                <FileCheck className="h-4 w-4" />
                Read the Privacy Policy
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <div className="mx-auto max-w-6xl space-y-6 px-4 pt-12">
        {/* Security engine grid */}
        <FadeInSection>
          <div className="panel panel-border rounded-[34px] p-6 sm:p-8">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-mint)]">
              <ShieldCheck className="h-4 w-4" />
              Security layers
            </p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
              What the Mind Security Engine protects
            </h2>
            <p className="muted mt-3 max-w-2xl text-sm leading-7">
              ScholarMind applies multiple overlapping layers of protection so you can focus on studying
              without worrying about data safety, abuse, or unexpected costs.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {engines.map((engine, index) => (
                <motion.div
                  key={engine.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: index * 0.07 }}
                  className="group rounded-[24px] border border-white/10 bg-white/8 p-5 transition hover:border-white/20 hover:bg-white/12"
                >
                  <span
                    className="grid h-10 w-10 place-items-center rounded-[14px]"
                    style={{ backgroundColor: `color-mix(in srgb, ${engine.color}, transparent 84%)` }}
                  >
                    <engine.icon className="h-5 w-5" style={{ color: engine.color }} />
                  </span>
                  <p className="mt-4 text-sm font-semibold">{engine.title}</p>
                  <p className="muted mt-2 text-xs leading-6">{engine.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeInSection>

        {/* How it works */}
        <FadeInSection>
          <div className="panel panel-border rounded-[34px] p-6 sm:p-8">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-sky)]">
              <RefreshCw className="h-4 w-4" />
              How it works
            </p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
              Request lifecycle through the engine
            </h2>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {howSteps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.45, delay: index * 0.1 }}
                  className="relative rounded-[24px] border border-white/10 bg-white/8 p-5"
                >
                  <span className="text-3xl font-semibold text-[var(--accent-gold)] opacity-40">
                    {step.number}
                  </span>
                  <p className="mt-2 text-sm font-semibold">{step.title}</p>
                  <p className="muted mt-2 text-xs leading-6">{step.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeInSection>

        {/* Transparency */}
        <FadeInSection>
          <div className="panel panel-border rounded-[34px] p-6 sm:p-8">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
              <Eye className="h-4 w-4" />
              Transparency
            </p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
              What we monitor and what stays private
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="rounded-[24px] border border-[rgba(121,247,199,0.2)] bg-[rgba(121,247,199,0.06)] p-5"
              >
                <p className="text-sm font-semibold text-[var(--accent-mint)]">What is monitored</p>
                <ul className="mt-3 space-y-2 text-xs leading-6 text-[var(--muted)]">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-mint)]" />
                    Request patterns — rate, origin, and behaviour scoring
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-mint)]" />
                    Feature usage — aggregate trends for reliability
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-mint)]" />
                    Upload validation — file safety before processing
                  </li>
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="rounded-[24px] border border-[rgba(255,125,89,0.2)] bg-[rgba(255,125,89,0.06)] p-5"
              >
                <p className="text-sm font-semibold text-[var(--accent-coral)]">What stays private</p>
                <ul className="mt-3 space-y-2 text-xs leading-6 text-[var(--muted)]">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-coral)]" />
                    Your study sources, AI outputs, and chat history
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-coral)]" />
                    Studio content is never exposed publicly
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-coral)]" />
                    Personal data is accessible only via Supabase RLS
                  </li>
                </ul>
              </motion.div>
            </div>

            <div className="mt-5 rounded-[22px] bg-white/8 px-5 py-4 text-xs leading-6 text-[var(--muted)]">
              For full details on data handling, AI processing, and your controls, read the{" "}
              <Link href="/privacy" className="font-semibold text-[var(--accent-sky)] underline underline-offset-4 transition hover:text-white">
                Privacy Policy
              </Link>. The host panel can view aggregate usage and onboarding trends. It is not designed to expose private study answers publicly.
            </div>
          </div>
        </FadeInSection>

        {/* CTA */}
        <FadeInSection delay={0.1}>
          <div className="panel panel-border rounded-[34px] bg-hero-glow p-8 text-center sm:p-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--accent-mint),var(--accent-sky))] text-slate-950 shadow-[0_10px_30px_rgba(57,208,255,0.2)] mx-auto">
                <ShieldCheck className="h-7 w-7" />
              </span>
              <h2 className="mt-5 text-2xl font-semibold sm:text-3xl">
                Study with the security you deserve
              </h2>
              <p className="muted mx-auto mt-3 max-w-lg text-sm leading-7">
                ScholarMind is built from the ground up to keep your study data safe.
                The Mind Security Engine runs on every request.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link href="/auth">
                  <Button>Start studying</Button>
                </Link>
                <Link href="/">
                  <Button variant="ghost">
                    <ArrowLeft className="h-4 w-4" />
                    Back to home
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </FadeInSection>
      </div>
    </main>
  );
}
