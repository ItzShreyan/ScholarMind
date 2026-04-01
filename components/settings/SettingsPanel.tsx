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

const defaultToolOptions = [
  { value: "summary", label: "Summary" },
  { value: "quiz", label: "Quiz" },
  { value: "flashcards", label: "Flashcards" },
  { value: "study_plan", label: "Study plan" },
  { value: "exam", label: "Exam" },
  { value: "insights", label: "Insights" },
  { value: "hard_mode", label: "Trap radar" },
  { value: "concepts", label: "Concept map" }
] as const;

export function SettingsPanel({
  email,
  initialPreferences = defaultUserPreferences
}: {
  email?: string;
  initialPreferences?: UserPreferences;
}) {
  const [theme, setTheme] = useState<"dark" | "light">(initialPreferences.theme);
  const [playfulMotion, setPlayfulMotion] = useState(initialPreferences.playfulMotion);
  const [rememberLastStudio, setRememberLastStudio] = useState(initialPreferences.rememberLastStudio);
  const [defaultTool, setDefaultTool] = useState<PreferenceTool>(initialPreferences.defaultTool);
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
        throw new Error(json.error || "Unable to save your settings.");
      }

      setSaveState("Synced to your account.");
    } catch (error) {
      setSaveState((error as Error).message || "Unable to save your settings.");
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
