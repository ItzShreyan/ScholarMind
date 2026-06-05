"use client";

import { useEffect, useState } from "react";
import {
  BellRing,
  LogOut,
  Palette,
  Sparkles,
  Stars,
  WandSparkles
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { defaultUserPreferences, type PreferenceTool, type UserPreferences } from "@/lib/preferences/defaults";
import { normalizeErrorMessage } from "@/lib/ai/util";
import type { OnboardingRecord } from "@/lib/onboarding-profile";
import { onboardingOptions } from "@/lib/onboarding-options";

const defaultToolOptions = [
  { value: "summary", label: "Summary" },
  { value: "quiz", label: "Quiz" },
  { value: "flashcards", label: "Flashcards" },
  { value: "notes", label: "AI Notes" },
  { value: "study_plan", label: "Study plan" },
  { value: "exam", label: "Exam" },
  { value: "insights", label: "Insights" },
  { value: "hard_mode", label: "Trap radar" },
  { value: "concepts", label: "Concept map" }
] as const;

export function SettingsPanel({
  email,
  initialPreferences = defaultUserPreferences,
  initialOnboarding
}: {
  email?: string;
  initialPreferences?: UserPreferences;
  initialOnboarding?: OnboardingRecord | null;
}) {
  const [theme, setTheme] = useState<"dark" | "light">(initialPreferences.theme);
  const [playfulMotion, setPlayfulMotion] = useState(initialPreferences.playfulMotion);
  const [rememberLastStudio, setRememberLastStudio] = useState(initialPreferences.rememberLastStudio);
  const [defaultTool, setDefaultTool] = useState<PreferenceTool>(initialPreferences.defaultTool);
  const [examBoards, setExamBoards] = useState<Record<string, string>>(initialOnboarding?.exam_boards ?? {});
  const [subjectTiers, setSubjectTiers] = useState<Record<string, string>>(initialOnboarding?.subject_tiers ?? {});
  const [mounted, setMounted] = useState(false);
  const [saveState, setSaveState] = useState("Synced to your account.");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTheme(initialPreferences.theme);
    setPlayfulMotion(initialPreferences.playfulMotion);
    setRememberLastStudio(initialPreferences.rememberLastStudio);
    setDefaultTool(initialPreferences.defaultTool);
  }, [initialPreferences]);

  useEffect(() => {
    setExamBoards(initialOnboarding?.exam_boards ?? {});
    setSubjectTiers(initialOnboarding?.subject_tiers ?? {});
  }, [initialOnboarding]);

  async function patchPreferences(patch: Partial<UserPreferences>) {
    setSaveState("Saving to your account...");

    try {
      const response = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(normalizeErrorMessage(json.error, "Unable to save your settings."));
      }

      setSaveState("Synced to your account.");
    } catch (error) {
      setSaveState(normalizeErrorMessage(error, "Unable to save your settings."));
    }
  }

  const updateTheme = (nextTheme: "dark" | "light") => {
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("light", nextTheme === "light");
    void patchPreferences({ theme: nextTheme });
  };

  const updatePlayfulMotion = (enabled: boolean) => {
    setPlayfulMotion(enabled);
    localStorage.setItem("scholarmind_playful_motion", enabled ? "on" : "off");
    document.documentElement.setAttribute("data-playful", enabled ? "on" : "off");
    void patchPreferences({ playfulMotion: enabled });
  };

  const updateRememberLastStudio = (enabled: boolean) => {
    setRememberLastStudio(enabled);
    localStorage.setItem("scholarmind_remember_last_studio", enabled ? "on" : "off");
    if (!enabled) {
      localStorage.removeItem("scholarmind_last_studio");
    }
    void patchPreferences(enabled ? { rememberLastStudio: true } : { rememberLastStudio: false, lastStudioId: null });
  };

  const updateDefaultTool = (value: PreferenceTool) => {
    setDefaultTool(value);
    localStorage.setItem("scholarmind_default_tool", value);
    void patchPreferences({ defaultTool: value });
  };

  const patchOnboarding = async (nextExamBoards = examBoards, nextSubjectTiers = subjectTiers) => {
    if (!initialOnboarding) return;
    setSaveState("Saving study profile...");

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discoverySource: initialOnboarding.discovery_source ?? [],
          educationLevel: initialOnboarding.education_level || "Other",
          country: initialOnboarding.country || "Other",
          curriculumStage: initialOnboarding.curriculum_stage || "Other",
          stateRegion: initialOnboarding.state_region || "",
          subjects: initialOnboarding.subjects ?? [],
          examBoards: nextExamBoards,
          subjectTiers: nextSubjectTiers,
          universitySubject: initialOnboarding.university_subject || "",
          learningStyle: initialOnboarding.learning_style?.length ? initialOnboarding.learning_style : ["Step-by-step"],
          goal: initialOnboarding.goal || "Understand lessons faster"
        })
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(normalizeErrorMessage(json.error, "Unable to save study profile."));
      }

      setSaveState("Synced to your account.");
    } catch (error) {
      setSaveState(normalizeErrorMessage(error, "Unable to save study profile."));
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.setAttribute("data-playful", playfulMotion ? "on" : "off");
  }, [playfulMotion, theme]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <CardHeader className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-coral)]">
            Account
          </p>
          <h1 className="text-4xl font-semibold">Your profile and study setup.</h1>
          <p className="muted text-sm">Preferences now autosave to your account so your study setup follows you across devices.</p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-[24px] bg-white/20 px-4 py-4">
            <p className="muted text-xs">Email</p>
            <p className="mt-1 font-medium">{email}</p>
          </div>
          <div className="rounded-[24px] bg-white/20 px-4 py-4">
            <p className="muted text-xs">Sign-in behavior</p>
            <p className="mt-2 font-medium">Signed-in users now skip the landing page and go straight to the dashboard.</p>
          </div>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="secondary" size="lg" className="w-full justify-center">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader className="space-y-2">
            <Palette className="h-5 w-5 text-[var(--accent-sky)]" />
            <p className="text-sm font-semibold">Appearance</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="muted">Dark mode is now the default. Switch back to light any time.</p>
            <div className="grid grid-cols-2 gap-2">
              {(["dark", "light"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateTheme(option)}
                  className={`rounded-[18px] px-4 py-3 text-sm font-medium transition ${
                    theme === option
                      ? "bg-[var(--fg)] text-[var(--bg)]"
                      : "bg-white/12"
                  }`}
                >
                  {option === "dark" ? "Dark" : "Light"}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {initialOnboarding ? (
          <Card className="md:col-span-2">
            <CardHeader className="space-y-2">
              <Stars className="h-5 w-5 text-[var(--accent-sky)]" />
              <p className="text-sm font-semibold">Curriculum profile</p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="muted">
                Your tutor uses these choices to tailor AI Notes, examples, quizzes, and exam-style practice.
              </p>
              <div className="rounded-[22px] bg-white/12 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-coral)]">
                  {initialOnboarding.country || "Country"} • {initialOnboarding.curriculum_stage || "Stage"}
                </p>
                <p className="muted mt-2 text-xs">{(initialOnboarding.subjects ?? []).join(", ") || "No subjects saved yet."}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {(initialOnboarding.subjects ?? []).map((subject) => {
                  const examBoardOptions =
                    onboardingOptions.examBoards[initialOnboarding.country]?.[initialOnboarding.curriculum_stage] ??
                    onboardingOptions.examBoards[initialOnboarding.country]?.Other ??
                    [];
                  const showTier =
                    initialOnboarding.country === "United Kingdom" &&
                    initialOnboarding.curriculum_stage === "GCSE" &&
                    onboardingOptions.tieredSubjects.includes(subject);

                  return (
                    <div key={subject} className="rounded-[22px] bg-white/10 p-4">
                      <p className="font-semibold">{subject}</p>
                      {examBoardOptions.length ? (
                        <label className="mt-3 block text-xs font-semibold">
                          Exam board
                          <select
                            value={examBoards[subject] || ""}
                            onChange={(event) => {
                              const next = { ...examBoards, [subject]: event.target.value };
                              setExamBoards(next);
                              void patchOnboarding(next, subjectTiers);
                            }}
                            className="mt-2 w-full rounded-[16px] border border-white/12 bg-white/10 px-3 py-2 text-sm outline-none"
                          >
                            <option value="">Not sure yet</option>
                            {examBoardOptions.map((board) => (
                              <option key={board}>{board}</option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      {showTier ? (
                        <div className="mt-3">
                          <p className="text-xs font-semibold">Tier</p>
                          <div className="mt-2 flex gap-2">
                            {["Foundation", "Higher"].map((tier) => (
                              <button
                                key={`${subject}-${tier}`}
                                type="button"
                                onClick={() => {
                                  const next = { ...subjectTiers, [subject]: tier };
                                  setSubjectTiers(next);
                                  void patchOnboarding(examBoards, next);
                                }}
                                className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                                  subjectTiers[subject] === tier
                                    ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.2),rgba(57,208,255,0.18))]"
                                    : "bg-white/12"
                                }`}
                              >
                                {tier}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="space-y-2">
            <Sparkles className="h-5 w-5 text-[var(--accent-coral)]" />
            <p className="text-sm font-semibold">Playful motion</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="muted">Keep the bouncy, cartoon-like card motion around the dashboard and studio surfaces.</p>
            <button
              type="button"
              onClick={() => updatePlayfulMotion(!playfulMotion)}
              className={`rounded-[18px] px-4 py-3 text-sm font-medium transition ${
                playfulMotion ? "bg-[rgba(255,125,89,0.18)]" : "bg-white/12"
              }`}
            >
              {playfulMotion ? "Playful motion on" : "Playful motion off"}
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2">
            <Stars className="h-5 w-5 text-[var(--accent-mint)]" />
            <p className="text-sm font-semibold">Studio memory</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="muted">Reopen the last studio you were working in instead of always starting from the newest one.</p>
            <button
              type="button"
              onClick={() => updateRememberLastStudio(!rememberLastStudio)}
              className={`rounded-[18px] px-4 py-3 text-sm font-medium transition ${
                rememberLastStudio ? "bg-[rgba(57,208,255,0.18)]" : "bg-white/12"
              }`}
            >
              {rememberLastStudio ? "Remember last studio" : "Do not remember"}
            </button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="space-y-2">
            <WandSparkles className="h-5 w-5 text-[var(--accent-gold)]" />
            <p className="text-sm font-semibold">Default tool</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="muted">Choose which generator should be ready first when you open the studio tools panel.</p>
            <div className="grid gap-2 sm:grid-cols-4">
              {defaultToolOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateDefaultTool(option.value)}
                  className={`rounded-[18px] px-4 py-3 text-sm font-medium transition ${
                    defaultTool === option.value
                      ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.2),rgba(57,208,255,0.18))]"
                      : "bg-white/12"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="space-y-2">
            <BellRing className="h-5 w-5 text-[var(--accent-coral)]" />
            <p className="text-sm font-semibold">Reminders</p>
          </CardHeader>
          <CardContent className="muted text-sm">
            Reminders are still created from inside each studio so they stay attached to the right uploaded notes and review context.
            {mounted ? <p className="mt-3 text-xs">{saveState}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
