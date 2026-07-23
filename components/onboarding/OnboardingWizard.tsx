"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { onboardingOptions } from "@/lib/onboarding-options";
import { normalizeErrorMessage } from "@/lib/ai/util";

type FormState = {
  discoverySource: string[];
  educationLevel: string;
  country: string;
  curriculumStage: string;
  stateRegion: string;
  subjects: string[];
  examBoards: Record<string, string>;
  subjectTiers: Record<string, string>;
  universitySubject: string;
  learningStyle: string[];
  goal: string;
};

const initialState: FormState = {
  discoverySource: [],
  educationLevel: "",
  country: "United Kingdom",
  curriculumStage: "",
  stateRegion: "",
  subjects: [],
  examBoards: {},
  subjectTiers: {},
  universitySubject: "",
  learningStyle: ["Step-by-step"],
  goal: ""
};

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function OptionButton({
  selected,
  label,
  onClick
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        selected
          ? "bg-[linear-gradient(135deg,rgba(255,143,107,0.32),rgba(107,221,255,0.28))] text-[var(--fg)]"
          : "bg-white/10 text-[var(--muted)] hover:bg-white/16 hover:text-[var(--fg)]"
      }`}
    >
      {label}
    </button>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const steps = useMemo(
    () => [
      {
        title: "Where are you studying?",
        copy: "This helps ScholarMind use the right school language and level.",
        ready: Boolean(form.educationLevel && form.country && form.curriculumStage)
      },
      {
        title: "What are you revising?",
        copy: "Pick the subjects your tutor should prioritise.",
        ready: form.subjects.length > 0 || Boolean(form.universitySubject.trim())
      },
      {
        title: "How should your tutor teach?",
        copy: "We’ll personalise explanations, notes, quizzes, and revision sessions around this.",
        ready: form.learningStyle.length > 0 && Boolean(form.goal)
      }
    ],
    [form]
  );

  const examBoardOptions =
    onboardingOptions.examBoards[form.country]?.[form.curriculumStage] ??
    onboardingOptions.examBoards[form.country]?.Other ??
    [];
  const shouldAskTier =
    form.country === "United Kingdom" &&
    form.curriculumStage === "GCSE" &&
    form.subjects.some((subject) => onboardingOptions.tieredSubjects.includes(subject));

  const save = async () => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to save onboarding."));
      }

      router.replace("/studio");
      router.refresh();
    } catch (saveError) {
      setError(normalizeErrorMessage(saveError, "Unable to save onboarding."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center px-4 py-10">
      <section className="panel panel-border grid w-full overflow-hidden rounded-[34px] lg:grid-cols-[0.82fr_1.18fr]">
        <div className="relative min-h-[24rem] overflow-hidden border-b border-white/10 p-7 lg:border-b-0 lg:border-r">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,143,107,0.24),transparent_30%),radial-gradient(circle_at_78%_74%,rgba(107,221,255,0.22),transparent_28%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex rounded-2xl bg-white/10 p-3">
                <Sparkles className="h-6 w-6 text-[var(--accent-gold)]" />
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent-coral)]">
                Personal tutor setup
              </p>
              <h1 className="mt-3 text-4xl font-semibold md:text-5xl">Build your study profile.</h1>
              <p className="muted mt-4 max-w-sm text-sm leading-6">
                A few choices now make the AI tutor calmer, sharper, and more relevant to your curriculum.
              </p>
            </div>
            <div className="mt-8 grid gap-3">
              {steps.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setStep(index)}
                  className={`rounded-[22px] px-4 py-3 text-left transition ${
                    step === index ? "bg-white/16" : "bg-white/8 hover:bg-white/12"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{item.title}</p>
                    {item.ready ? <CheckCircle2 className="h-4 w-4 text-[var(--accent-mint)]" /> : null}
                  </div>
                  <p className="muted mt-1 text-xs">{item.copy}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-sky)]">
                Step {step + 1} of {steps.length}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{steps[step].title}</h2>
            </div>
            <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-coral),var(--accent-sky))]"
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {step === 0 ? (
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold">Education level</p>
                <div className="flex flex-wrap gap-2">
                  {onboardingOptions.levels.map((level) => (
                    <OptionButton
                      key={level}
                      label={level}
                      selected={form.educationLevel === level}
                      onClick={() => setForm((current) => ({ ...current, educationLevel: level }))}
                    />
                  ))}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Country
                  <select
                    value={form.country}
                    onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                    className="mt-2 w-full rounded-[18px] border border-white/12 bg-white/10 px-4 py-3 text-sm outline-none"
                  >
                    {onboardingOptions.countries.map((country) => (
                      <option key={country}>{country}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold">
                  Curriculum / stage
                  <select
                    value={form.curriculumStage}
                    onChange={(event) => setForm((current) => ({ ...current, curriculumStage: event.target.value }))}
                    className="mt-2 w-full rounded-[18px] border border-white/12 bg-white/10 px-4 py-3 text-sm outline-none"
                  >
                    <option value="">Choose a stage</option>
                    {onboardingOptions.stages.map((stageName) => (
                      <option key={stageName}>{stageName}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-semibold">
                State / region, if useful
                <input
                  value={form.stateRegion}
                  onChange={(event) => setForm((current) => ({ ...current, stateRegion: event.target.value }))}
                  placeholder="Optional, e.g. England, California, NSW"
                  className="mt-2 w-full rounded-[18px] border border-white/12 bg-white/10 px-4 py-3 text-sm outline-none"
                />
              </label>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold">Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {onboardingOptions.subjects.map((subject) => (
                    <OptionButton
                      key={subject}
                      label={subject}
                      selected={form.subjects.includes(subject)}
                      onClick={() => setForm((current) => ({ ...current, subjects: toggleValue(current.subjects, subject) }))}
                    />
                  ))}
                </div>
              </div>
              {examBoardOptions.length ? (
                <div className="rounded-[24px] bg-white/8 p-4">
                  <p className="mb-1 text-sm font-semibold">Exam board</p>
                  <p className="muted mb-4 text-xs">
                    Choose the board for each subject where it matters. You can change this later in settings.
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {form.subjects.map((subject) => (
                      <label key={subject} className="text-xs font-semibold">
                        {subject}
                        <select
                          value={form.examBoards[subject] || ""}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              examBoards: {
                                ...current.examBoards,
                                [subject]: event.target.value
                              }
                            }))
                          }
                          className="mt-2 w-full rounded-[16px] border border-white/12 bg-white/10 px-3 py-2 text-sm outline-none"
                        >
                          <option value="">Not sure yet</option>
                          {examBoardOptions.map((board) => (
                            <option key={board}>{board}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              {shouldAskTier ? (
                <div className="rounded-[24px] bg-white/8 p-4">
                  <p className="mb-1 text-sm font-semibold">Tier, where applicable</p>
                  <p className="muted mb-4 text-xs">For GCSE subjects with tiers, choose Foundation or Higher.</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {form.subjects
                      .filter((subject) => onboardingOptions.tieredSubjects.includes(subject))
                      .map((subject) => (
                        <div key={subject}>
                          <p className="mb-2 text-xs font-semibold">{subject}</p>
                          <div className="flex gap-2">
                            {["Foundation", "Higher"].map((tier) => (
                              <OptionButton
                                key={`${subject}-${tier}`}
                                label={tier}
                                selected={form.subjectTiers[subject] === tier}
                                onClick={() =>
                                  setForm((current) => ({
                                    ...current,
                                    subjectTiers: {
                                      ...current.subjectTiers,
                                      [subject]: tier
                                    }
                                  }))
                                }
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
              <label className="block text-sm font-semibold">
                University or custom subject
                <input
                  value={form.universitySubject}
                  onChange={(event) => setForm((current) => ({ ...current, universitySubject: event.target.value }))}
                  placeholder="Optional, e.g. Medicine, Law, Mechanical Engineering"
                  className="mt-2 w-full rounded-[18px] border border-white/12 bg-white/10 px-4 py-3 text-sm outline-none"
                />
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold">Learning style</p>
                <div className="flex flex-wrap gap-2">
                  {onboardingOptions.learningStyles.map((style) => (
                    <OptionButton
                      key={style}
                      label={style}
                      selected={form.learningStyle.includes(style)}
                      onClick={() => setForm((current) => ({ ...current, learningStyle: toggleValue(current.learningStyle, style) }))}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold">Main goal</p>
                <div className="flex flex-wrap gap-2">
                  {onboardingOptions.goals.map((goal) => (
                    <OptionButton
                      key={goal}
                      label={goal}
                      selected={form.goal === goal}
                      onClick={() => setForm((current) => ({ ...current, goal }))}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold">How did you find ScholarMind?</p>
                <div className="flex flex-wrap gap-2">
                  {onboardingOptions.discovery.map((source) => (
                    <OptionButton
                      key={source}
                      label={source}
                      selected={form.discoverySource.includes(source)}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          discoverySource: toggleValue(current.discoverySource, source)
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {error ? <div className="mt-6 rounded-[20px] bg-[rgba(255,125,89,0.16)] px-4 py-3 text-sm">{error}</div> : null}

          <div className="mt-8 flex flex-wrap justify-between gap-3">
            <Button onClick={() => setStep((current) => Math.max(0, current - 1))} variant="ghost" disabled={step === 0 || saving}>
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button
                onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
                disabled={!steps[step].ready}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={save} disabled={!steps[step].ready || saving}>
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Start Studio
              </Button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
