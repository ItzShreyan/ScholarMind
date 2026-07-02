"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Atom, BookOpen, Download, FlaskConical, Waves } from "lucide-react";
import { RichStudyText } from "@/components/dashboard/RichStudyText";
import { Button } from "@/components/ui/Button";
import { extractStructuredOutput } from "@/lib/ai/strip-reasoning";

const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { type: "spring", stiffness: 300, damping: 28 }
};

type FormulaBlock = {
  label?: string;
  formula: string;
  explanation?: string;
};

type NoteSection = {
  heading: string;
  summary?: string;
  content: string[];
  keyTerms?: Array<{ term: string; definition: string }>;
};

type PracticeQuestion = {
  question: string;
  marks?: string;
  hint?: string;
  answer?: string;
};

type SimulationSpec = {
  type: "particles" | "waves" | "circuits" | "forces" | "energy" | "reaction_rate" | "diffusion";
  title?: string;
  description?: string;
  variableLabel?: string;
  min?: number;
  max?: number;
  defaultValue?: number;
};

type StructuredNotes = {
  title: string;
  subject?: string;
  level?: string;
  estimatedTime?: string;
  sections?: NoteSection[];
  callouts?: Array<{ type?: "concept" | "formula" | "warning" | "exam"; title: string; body: string }>;
  formulaBlocks?: FormulaBlock[];
  workedExamples?: Array<{ title: string; steps: string[]; answer?: string }>;
  practiceQuestions?: PracticeQuestion[];
  diagrams?: Array<{ title: string; description: string; mermaid?: string }>;
  scienceSimulation?: SimulationSpec | null;
  simulationSpec?: SimulationSpec | null;
  sourceNotes?: string[];
};

function parseNotes(raw: string): StructuredNotes | null {
  const cleaned = extractStructuredOutput(raw);
  try {
    const parsed = JSON.parse(cleaned) as StructuredNotes;
    return {
      ...parsed,
      simulationSpec: parsed.simulationSpec ?? parsed.scienceSimulation ?? null
    };
  } catch {
    const match = cleaned.match(/```json\s*([\s\S]*?)```/i) || cleaned.match(/(\{[\s\S]*\})/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[1]) as StructuredNotes;
      return {
        ...parsed,
        simulationSpec: parsed.simulationSpec ?? parsed.scienceSimulation ?? null
      };
    } catch {
      return null;
    }
  }
}

function safeItems<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function ScienceSimulation({ spec }: { spec: SimulationSpec }) {
  const [value, setValue] = useState(spec.defaultValue ?? Math.round(((spec.min ?? 0) + (spec.max ?? 100)) / 2));
  const min = spec.min ?? 0;
  const max = spec.max ?? 100;
  const ratio = max === min ? 0.5 : (value - min) / (max - min);

  const label = spec.variableLabel || {
    particles: "Temperature",
    waves: "Frequency",
    circuits: "Voltage",
    forces: "Force",
    energy: "Energy input",
    reaction_rate: "Concentration",
    diffusion: "Concentration gradient"
  }[spec.type];

  return (
    <div className="overflow-hidden rounded-[32px] border border-[rgba(121,247,199,0.26)] bg-[radial-gradient(circle_at_20%_15%,rgba(121,247,199,0.16),transparent_30%),rgba(7,17,31,0.42)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent-mint)]">
            Interactive science lab
          </p>
          <h3 className="mt-2 text-2xl font-semibold">{spec.title || "Explore the model"}</h3>
          <p className="muted mt-2 max-w-2xl text-sm">{spec.description || "Move the slider and watch the idea change."}</p>
        </div>
        <FlaskConical className="h-6 w-6 text-[var(--accent-mint)]" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <div className="relative min-h-[16rem] overflow-hidden rounded-[26px] bg-black/20 p-5">
          {spec.type === "waves" ? (
            <svg viewBox="0 0 520 220" className="h-full min-h-[13rem] w-full">
              <path
                d={Array.from({ length: 80 }, (_, index) => {
                  const x = (index / 79) * 520;
                  const y = 110 + Math.sin(index * (0.18 + ratio * 0.42)) * (28 + ratio * 54);
                  return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
                }).join(" ")}
                fill="none"
                stroke="url(#waveGradient)"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="waveGradient" x1="0" x2="1">
                  <stop offset="0%" stopColor="#ff8f6b" />
                  <stop offset="50%" stopColor="#6bddff" />
                  <stop offset="100%" stopColor="#7cf0cf" />
                </linearGradient>
              </defs>
            </svg>
          ) : spec.type === "circuits" ? (
            <div className="grid h-full min-h-[13rem] place-items-center">
              <div className="relative h-44 w-72 rounded-[32px] border-4 border-[rgba(107,221,255,0.58)]">
                <div className="absolute -left-4 top-1/2 grid h-16 w-16 -translate-y-1/2 place-items-center rounded-full bg-[rgba(255,224,131,0.18)] text-sm font-semibold">
                  {Math.round(2 + ratio * 10)}V
                </div>
                <div
                  className="absolute right-8 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-[var(--accent-gold)] shadow-[0_0_34px_rgba(255,224,131,0.65)]"
                  style={{ opacity: 0.28 + ratio * 0.72 }}
                />
              </div>
            </div>
          ) : spec.type === "forces" ? (
            <div className="grid h-full min-h-[13rem] place-items-center">
              <div className="relative h-32 w-[88%] rounded-[28px] bg-white/10">
                <div className="absolute left-8 top-1/2 h-20 w-28 -translate-y-1/2 rounded-[24px] bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-sky))]" />
                <div
                  className="absolute left-40 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[var(--accent-gold)]"
                  style={{ width: `${80 + ratio * 190}px` }}
                />
                <span
                  className="absolute top-[calc(50%-10px)] text-2xl"
                  style={{ left: `${210 + ratio * 170}px` }}
                >
                  →
                </span>
              </div>
            </div>
          ) : (
            <div className="relative h-full min-h-[13rem]">
              {Array.from({ length: 24 }).map((_, index) => {
                const angle = (index / 24) * Math.PI * 2;
                const radius = 36 + ((index * 17) % 92) + ratio * 44;
                const x = 50 + Math.cos(angle + ratio * 2) * radius * 0.34;
                const y = 50 + Math.sin(angle + ratio * 2) * radius * 0.34;
                return (
                  <span
                    key={index}
                    className="absolute h-3 w-3 rounded-full bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-sky))]"
                    style={{
                      left: `${Math.max(4, Math.min(92, x))}%`,
                      top: `${Math.max(4, Math.min(92, y))}%`,
                      transform: `scale(${0.7 + ratio * 0.9})`,
                      opacity: 0.45 + ratio * 0.5
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[26px] bg-white/10 p-5">
          <label className="text-sm font-semibold">
            {label}: {value}
            <input
              type="range"
              min={min}
              max={max}
              value={value}
              onChange={(event) => setValue(Number(event.target.value))}
              className="mt-4 w-full accent-[var(--accent-sky)]"
            />
          </label>
          <div className="mt-5 rounded-[22px] bg-white/10 p-4 text-sm leading-7">
            {spec.type === "waves"
              ? "Higher frequency means waves are closer together. Higher amplitude shows more energy in the wave."
              : spec.type === "circuits"
                ? "Increasing voltage pushes charge harder. If resistance stays the same, current and bulb brightness increase."
                : spec.type === "forces"
                  ? "A larger resultant force creates a larger acceleration when mass stays the same."
                  : spec.type === "reaction_rate"
                    ? "More frequent successful collisions usually increase reaction rate."
                    : spec.type === "diffusion"
                      ? "A steeper concentration gradient increases net movement from high to low concentration."
                      : "Particle motion increases as energy rises; this helps explain changes of state and transfer processes."}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AINotesConsole({ content }: { content: string }) {
  const notes = useMemo(() => parseNotes(content), [content]);
  const [activeSection, setActiveSection] = useState(0);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  if (!notes) {
    return (
      <div className="rounded-[30px] border border-white/10 bg-white/8 p-5">
        <RichStudyText content={content} />
      </div>
    );
  }

  const sections = safeItems(notes.sections);

  return (
    <article className="overflow-hidden rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.04))] shadow-[0_34px_90px_rgba(2,6,23,0.28)]">
      <header className="border-b border-white/10 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-gold)]">AI Notes</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">{notes.title || "Study notes"}</h2>
            <p className="muted mt-3 text-sm">
              {[notes.subject, notes.level, notes.estimatedTime].filter(Boolean).join(" • ") || "Long-form notes from your source-enabled files"}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              const blob = new Blob([content], { type: "application/json" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = `${(notes.title || "ai-notes").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
              link.click();
              URL.revokeObjectURL(link.href);
            }}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </header>

      <div className="grid min-h-[38rem] lg:grid-cols-[16rem_1fr]">
        <aside className="border-b border-white/10 bg-black/10 p-4 lg:border-b-0 lg:border-r">
          <div className="rounded-[24px] bg-white/10 p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[var(--accent-sky)]" />
              <p className="text-sm font-semibold">Chapter map</p>
            </div>
            <div className="mt-4 space-y-2">
              {sections.map((section, index) => (
                <motion.button
                  key={`${section.heading}-${index}`}
                  type="button"
                  onClick={() => setActiveSection(index)}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className={`w-full rounded-[18px] px-3 py-3 text-left text-xs transition ${
                    activeSection === index ? "bg-white/18 text-[var(--fg)]" : "text-[var(--muted)] hover:bg-white/10"
                  }`}
                >
                  {index + 1}. {section.heading}
                </motion.button>
              ))}
            </div>
          </div>
          {safeItems(notes.sourceNotes).length ? (
            <div className="mt-4 rounded-[24px] bg-white/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">Source notes</p>
              <ul className="muted mt-3 space-y-2 text-xs">
                {safeItems(notes.sourceNotes).slice(0, 5).map((item, index) => (
                  <li key={`${item}-${index}`}>• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        <div className="hide-scrollbar max-h-[75vh] overflow-auto p-5 md:p-8">
          <div className="mx-auto max-w-4xl space-y-7">
            {sections.map((section, index) => (
              <motion.section
                key={`${section.heading}-${index}`}
                className={index === activeSection ? "scroll-mt-8" : ""}
                {...fadeInUp}
                transition={{ ...fadeInUp.transition, delay: index * 0.04 }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-sky)]">
                  Chapter {index + 1}
                </p>
                <h3 className="mt-2 text-3xl font-semibold">{section.heading}</h3>
                {section.summary ? <p className="muted mt-3 text-base leading-8">{section.summary}</p> : null}
                <div className="mt-5 space-y-4 text-[1.02rem] leading-8">
                  {safeItems(section.content).map((paragraph, paragraphIndex) => (
                    <p key={`${section.heading}-p-${paragraphIndex}`}>{paragraph}</p>
                  ))}
                </div>
                {safeItems(section.keyTerms).length ? (
                  <div className="mt-5 overflow-auto rounded-[24px] border border-white/10">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-white/10">
                        <tr>
                          <th className="px-4 py-3">Term</th>
                          <th className="px-4 py-3">Meaning</th>
                        </tr>
                      </thead>
                      <tbody>
                        {safeItems(section.keyTerms).map((term, termIndex) => (
                          <tr key={`${term.term}-${termIndex}`} className="border-t border-white/10">
                            <td className="px-4 py-3 font-semibold">{term.term}</td>
                            <td className="muted px-4 py-3">{term.definition}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </motion.section>
            ))}

            {safeItems(notes.callouts).map((callout, index) => (
              <div
                key={`${callout.title}-${index}`}
                className="rounded-[28px] border border-[rgba(255,224,131,0.28)] bg-[rgba(255,224,131,0.08)] p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-gold)]">
                  {callout.type || "Tutor note"}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{callout.title}</h3>
                <p className="muted mt-3 leading-8">{callout.body}</p>
              </div>
            ))}

            {safeItems(notes.formulaBlocks).length ? (
              <section className="rounded-[30px] border border-[rgba(107,221,255,0.24)] bg-[rgba(107,221,255,0.08)] p-5">
                <div className="flex items-center gap-2">
                  <Atom className="h-5 w-5 text-[var(--accent-sky)]" />
                  <h3 className="text-2xl font-semibold">Formula shelf</h3>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {safeItems(notes.formulaBlocks).map((formula, index) => (
                    <div key={`${formula.formula}-${index}`} className="rounded-[24px] bg-white/10 p-4">
                      {formula.label ? <p className="text-sm font-semibold">{formula.label}</p> : null}
                      <pre className="mt-3 overflow-auto rounded-[18px] bg-black/20 px-4 py-3 text-lg">{formula.formula}</pre>
                      {formula.explanation ? <p className="muted mt-3 text-sm leading-7">{formula.explanation}</p> : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {safeItems(notes.workedExamples).length ? (
              <section className="space-y-4">
                <h3 className="text-2xl font-semibold">Worked examples</h3>
                {safeItems(notes.workedExamples).map((example, index) => (
                  <div key={`${example.title}-${index}`} className="rounded-[28px] bg-white/10 p-5">
                    <p className="font-semibold">{example.title}</p>
                    <ol className="mt-4 space-y-3 text-sm leading-7">
                      {safeItems(example.steps).map((step, stepIndex) => (
                        <li key={`${step}-${stepIndex}`}>{stepIndex + 1}. {step}</li>
                      ))}
                    </ol>
                    {example.answer ? <p className="mt-4 rounded-[20px] bg-white/10 p-3 font-semibold">{example.answer}</p> : null}
                  </div>
                ))}
              </section>
            ) : null}

            {notes.simulationSpec ? <ScienceSimulation spec={notes.simulationSpec} /> : null}

            {safeItems(notes.diagrams).length ? (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Waves className="h-5 w-5 text-[var(--accent-mint)]" />
                  <h3 className="text-2xl font-semibold">Diagrams</h3>
                </div>
                {safeItems(notes.diagrams).map((diagram, index) => (
                  <div key={`${diagram.title}-${index}`} className="rounded-[28px] bg-white/10 p-5">
                    <p className="font-semibold">{diagram.title}</p>
                    <p className="muted mt-2 text-sm leading-7">{diagram.description}</p>
                    {diagram.mermaid ? <RichStudyText content={`\`\`\`mermaid\n${diagram.mermaid}\n\`\`\``} /> : null}
                  </div>
                ))}
              </section>
            ) : null}

            {safeItems(notes.practiceQuestions).length ? (
              <section className="rounded-[30px] border border-white/12 bg-white/8 p-5">
                <h3 className="text-2xl font-semibold">Practice console</h3>
                <div className="mt-5 space-y-4">
                  {safeItems(notes.practiceQuestions).map((question, index) => (
                    <div key={`${question.question}-${index}`} className="rounded-[24px] bg-black/10 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="font-semibold leading-7">{index + 1}. {question.question}</p>
                        {question.marks ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{question.marks}</span> : null}
                      </div>
                      <textarea
                        placeholder="Try your answer here before revealing the model answer..."
                        className="mt-4 min-h-[6rem] w-full rounded-[18px] border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none focus:border-[var(--accent-sky)]"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {question.hint ? (
                          <span className="rounded-full bg-white/10 px-3 py-2 text-xs text-[var(--muted)]">Hint: {question.hint}</span>
                        ) : null}
                        {question.answer ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setRevealedAnswers((current) => ({ ...current, [index]: !current[index] }))}
                          >
                            {revealedAnswers[index] ? "Hide answer" : "Reveal answer"}
                          </Button>
                        ) : null}
                      </div>
                      {revealedAnswers[index] && question.answer ? (
                        <div className="muted mt-3 rounded-[18px] bg-white/10 p-4 text-sm leading-7">{question.answer}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
