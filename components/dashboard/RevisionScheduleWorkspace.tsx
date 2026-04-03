"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  LoaderCircle,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { defaultFreePreviewDailyLimit } from "@/lib/ai/preview";
import type { RevisionPlanDay } from "@/lib/revision-plans/utils";
import { normalizeErrorMessage } from "@/lib/ai/util";

type SessionOption = {
  id: string;
  title: string;
};

type RevisionPlanRecord = {
  id: string;
  session_id: string;
  exam_name: string;
  exam_date: string;
  cadence: "daily" | "weekly";
  goals: string;
  plan_markdown: string;
  days: RevisionPlanDay[];
  current_day: number;
  updated_at: string;
};

type DraftState = {
  sessionId: string;
  examName: string;
  examDate: string;
  cadence: "daily" | "weekly";
  goals: string;
};

function normalizePlan(plan: RevisionPlanRecord): RevisionPlanRecord {
  return {
    ...plan,
    days: Array.isArray(plan.days) ? plan.days : []
  };
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(response.ok ? "The server returned an unreadable response." : `The server returned an unexpected response (${response.status}).`);
  }
}

export function RevisionScheduleWorkspace({
  sessions,
  initialPlans
}: {
  sessions: SessionOption[];
  initialPlans: RevisionPlanRecord[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get("sessionId");

  const [plans, setPlans] = useState<RevisionPlanRecord[]>(initialPlans.map(normalizePlan));
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(initialPlans[0]?.id ?? null);
  const [draft, setDraft] = useState<DraftState>({
    sessionId: initialSessionId && sessions.some((session) => session.id === initialSessionId) ? initialSessionId : sessions[0]?.id || "",
    examName: "",
    examDate: "",
    cadence: "daily",
    goals: ""
  });
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [dayDraft, setDayDraft] = useState<RevisionPlanDay | null>(null);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );
  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === (selectedPlan?.session_id || draft.sessionId)) ?? null,
    [draft.sessionId, selectedPlan?.session_id, sessions]
  );
  const progress = selectedPlan?.days.length
    ? Math.round((selectedPlan.days.filter((day) => day.completed).length / selectedPlan.days.length) * 100)
    : 0;

  useEffect(() => {
    if (!selectedPlan && plans[0]) {
      setSelectedPlanId(plans[0].id);
      return;
    }

    if (!selectedPlan) {
      setDayDraft(null);
      setActiveDayIndex(0);
      return;
    }

    const safeIndex = Math.min(selectedPlan.current_day || 0, Math.max(0, selectedPlan.days.length - 1));
    const currentDay = selectedPlan.days[safeIndex] ?? null;
    setActiveDayIndex(safeIndex);
    setDayDraft(currentDay ? { ...currentDay } : null);
  }, [plans, selectedPlan, selectedPlanId]);

  useEffect(() => {
    if (!selectedPlan || !dayDraft) return;

    const sourceDay = selectedPlan.days[activeDayIndex];
    if (!sourceDay) return;

    const isDirty =
      dayDraft.label !== sourceDay.label ||
      dayDraft.focus !== sourceDay.focus ||
      dayDraft.task !== sourceDay.task ||
      dayDraft.check !== sourceDay.check ||
      dayDraft.completed !== sourceDay.completed;

    if (!isDirty) return;

    const timeoutId = window.setTimeout(async () => {
      const nextDays = selectedPlan.days.map((day, index) => (index === activeDayIndex ? dayDraft : day));
      setSaving(true);

      try {
        const response = await fetch(`/api/revision-plans/${selectedPlan.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentDay: activeDayIndex,
            days: nextDays
          })
        });
        const json = await readJsonResponse(response);
        if (!response.ok) {
          throw new Error(normalizeErrorMessage(json.error, "Unable to autosave this study day."));
        }

        const nextPlan = normalizePlan(json.plan);
        setPlans((current) => current.map((plan) => (plan.id === nextPlan.id ? nextPlan : plan)));
        setStatus("Revision plan autosaved.");
      } catch (error) {
        setStatus(normalizeErrorMessage(error, "Unable to autosave this study day."));
      } finally {
        setSaving(false);
      }
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [activeDayIndex, dayDraft, selectedPlan]);

  const generatePlan = async () => {
    if (!draft.sessionId || !draft.examName.trim() || !draft.examDate) {
      setStatus("Choose a studio, add the exam name, and pick the exam date first.");
      return;
    }

    setGenerating(true);
    setStatus("");

    try {
      const response = await fetch("/api/revision-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const json = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to generate the revision schedule."));
      }

      const nextPlan = normalizePlan(json.plan);
      setPlans((current) => [nextPlan, ...current.filter((plan) => plan.id !== nextPlan.id)]);
      setSelectedPlanId(nextPlan.id);
      setDraft((current) => ({ ...current, examName: "", examDate: "", goals: "" }));
      setStatus(
        typeof json.usage?.dailyRemaining === "number"
          ? `Revision schedule ready. ${json.usage.dailyRemaining} AI run(s) left today.`
          : "Revision schedule ready."
      );
    } catch (error) {
      setStatus(normalizeErrorMessage(error, "Unable to generate the revision schedule."));
    } finally {
      setGenerating(false);
    }
  };

  const jumpToDay = (index: number) => {
    if (!selectedPlan) return;
    const nextDay = selectedPlan.days[index];
    if (!nextDay) return;

    setActiveDayIndex(index);
    setDayDraft({ ...nextDay });
  };

  const updateSelectedPlan = async (updates: Partial<RevisionPlanRecord>) => {
    if (!selectedPlan) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/revision-plans/${selectedPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examName: updates.exam_name,
          examDate: updates.exam_date,
          cadence: updates.cadence,
          goals: updates.goals,
          currentDay: updates.current_day,
          days: updates.days,
          planMarkdown: updates.plan_markdown
        })
      });
      const json = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to save the revision plan."));
      }

      const nextPlan = normalizePlan(json.plan);
      setPlans((current) => current.map((plan) => (plan.id === nextPlan.id ? nextPlan : plan)));
      setStatus("Revision plan saved.");
    } catch (error) {
      setStatus(normalizeErrorMessage(error, "Unable to save the revision plan."));
    } finally {
      setSaving(false);
    }
  };

  const markDay = async (completed: boolean) => {
    if (!selectedPlan || !dayDraft) return;

    const nextDay = {
      ...dayDraft,
      completed,
      completedAt: completed ? new Date().toISOString() : null
    };
    const nextDays = selectedPlan.days.map((day, index) => (index === activeDayIndex ? nextDay : day));
    const nextIndex = completed
      ? Math.min(
          nextDays.findIndex((day, index) => index > activeDayIndex && !day.completed) === -1
            ? activeDayIndex
            : nextDays.findIndex((day, index) => index > activeDayIndex && !day.completed),
          nextDays.length - 1
        )
      : activeDayIndex;

    setDayDraft(nextDay);
    await updateSelectedPlan({
      days: nextDays,
      current_day: nextIndex
    });
    if (nextDays[nextIndex]) {
      setActiveDayIndex(nextIndex);
      setDayDraft({ ...nextDays[nextIndex] });
    }
  };

  const openStudySession = () => {
    if (!selectedPlan || !selectedPlan.days[activeDayIndex]) return;
    router.push(`/dashboard/workspace/${selectedPlan.session_id}?planId=${selectedPlan.id}&day=${activeDayIndex}`);
  };

  return (
    <div className="px-3 pb-4 pt-3 md:px-4">
      <section>
        <div className="panel panel-border rounded-[30px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-coral)]">
                Revision Schedule
              </p>
              <h1 className="mt-3 text-3xl font-semibold md:text-4xl">Plan the run-up to the real exam.</h1>
              <p className="muted mt-3 max-w-3xl text-sm md:text-base">
                This is a separate planning window from the live studio. Build a schedule from your uploaded sources, open any day as a personalised study session, and keep the progress synced to your account.
              </p>
            </div>
            <div className="glass rounded-[24px] px-4 py-3 text-sm">
              <p className="muted text-xs">Free preview</p>
              <p className="mt-2 font-semibold">Schedules count toward the {defaultFreePreviewDailyLimit} AI runs per day.</p>
            </div>
          </div>

          {status ? (
            <div className="mt-4 rounded-[24px] bg-[rgba(57,208,255,0.12)] px-4 py-3 text-sm">{status}</div>
          ) : null}
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside>
          <div className="panel panel-border rounded-[30px] p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold">Create a new plan</p>
              <p className="muted text-xs">Choose the linked studio first so each day can reopen the right sources later.</p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">Linked studio</p>
                <select
                  value={draft.sessionId}
                  onChange={(event) => setDraft((current) => ({ ...current, sessionId: event.target.value }))}
                  className="mt-2 w-full rounded-[18px] border border-white/14 bg-black/10 px-4 py-3 text-sm outline-none"
                >
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">Exam name</p>
                <input
                  value={draft.examName}
                  onChange={(event) => setDraft((current) => ({ ...current, examName: event.target.value }))}
                  placeholder="GCSE Chemistry Paper 1"
                  className="mt-2 w-full rounded-[18px] border border-white/14 bg-black/10 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">Exam date</p>
                <input
                  type="date"
                  value={draft.examDate}
                  onChange={(event) => setDraft((current) => ({ ...current, examDate: event.target.value }))}
                  className="mt-2 w-full rounded-[18px] border border-white/14 bg-black/10 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">Cadence</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["daily", "weekly"] as const).map((cadence) => (
                    <button
                      key={cadence}
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, cadence }))}
                      className={`rounded-[18px] px-4 py-3 text-sm font-medium transition ${
                        draft.cadence === cadence
                          ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.22),rgba(57,208,255,0.2))]"
                          : "bg-white/12"
                      }`}
                    >
                      {cadence === "daily" ? "Daily" : "Weekly"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-sky)]">Goals and weak areas</p>
                <textarea
                  value={draft.goals}
                  onChange={(event) => setDraft((current) => ({ ...current, goals: event.target.value }))}
                  placeholder="Long responses, calculations, and the topics I keep getting wrong."
                  className="mt-2 min-h-[8rem] w-full rounded-[18px] border border-white/14 bg-black/10 px-4 py-4 text-sm outline-none"
                />
              </div>

              <Button onClick={generatePlan} className="w-full justify-center" disabled={generating || !sessions.length}>
                {generating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate revision schedule
              </Button>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Saved plans</p>
                  <p className="muted text-xs">These are tied to your account, not just this device.</p>
                </div>
                <div className="glass rounded-full px-3 py-1 text-xs font-medium">{plans.length} total</div>
              </div>

              <div className="hide-scrollbar max-h-[27rem] space-y-2 overflow-auto pr-1">
                {plans.length ? (
                  plans.map((plan) => {
                    const completedCount = plan.days.filter((day) => day.completed).length;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`w-full rounded-[22px] p-3 text-left transition ${
                          selectedPlanId === plan.id
                            ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.18),rgba(57,208,255,0.16))]"
                            : "bg-white/10 hover:bg-white/14"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{plan.exam_name}</p>
                            <p className="muted mt-1 text-xs">
                              {sessions.find((session) => session.id === plan.session_id)?.title || "Linked studio"}
                            </p>
                          </div>
                          <div className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em]">
                            {completedCount}/{plan.days.length}
                          </div>
                        </div>
                        <p className="muted mt-2 text-xs">
                          {plan.cadence === "daily" ? "Daily" : "Weekly"} plan • {plan.exam_date}
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-[22px] bg-white/10 px-4 py-4 text-sm">
                    Generate the first revision schedule and it will stay here for the next device too.
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        <section>
          <div className="panel panel-border rounded-[30px] p-4">
            {selectedPlan ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
                      Current plan
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold md:text-3xl">{selectedPlan.exam_name}</h2>
                    <p className="muted mt-2 text-sm">
                      Linked to {selectedSession?.title || "this studio"} • {selectedPlan.exam_date} • {selectedPlan.cadence === "daily" ? "Daily" : "Weekly"} plan
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={openStudySession} variant="secondary" size="sm">
                      Open study session
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => router.push(`/dashboard/workspace/${selectedPlan.session_id}`)} variant="ghost" size="sm">
                      Back to studio
                    </Button>
                  </div>
                </div>

                <div className="mt-4 rounded-[24px] bg-white/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Progress</p>
                      <p className="muted mt-1 text-xs">Mark each study day complete, skip ahead, or edit the plan and it will autosave.</p>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium">{progress}% complete</div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/10">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-sky))]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="hide-scrollbar mt-4 flex gap-2 overflow-auto pb-1">
                  {selectedPlan.days.map((day, index) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => jumpToDay(index)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition ${
                        activeDayIndex === index
                          ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.22),rgba(57,208,255,0.2))]"
                          : "bg-white/10 hover:bg-white/14"
                      }`}
                    >
                      {day.completed ? <CheckCircle2 className="h-4 w-4 text-[var(--accent-mint)]" /> : <Circle className="h-4 w-4" />}
                      {day.label}
                    </button>
                  ))}
                </div>

                {dayDraft ? (
                  <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-[26px] bg-white/10 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-sky)]">
                            Personalised session
                          </p>
                          <p className="mt-2 text-lg font-semibold">{dayDraft.label}</p>
                        </div>
                        <div className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium">
                          {dayDraft.completed ? "Completed" : "Active"}
                        </div>
                      </div>

                      <div className="mt-5 space-y-4">
                        <div>
                          <p className="text-sm font-medium">Focus</p>
                          <input
                            value={dayDraft.focus}
                            onChange={(event) => setDayDraft((current) => (current ? { ...current, focus: event.target.value } : current))}
                            className="mt-2 w-full rounded-[18px] border border-white/14 bg-black/10 px-4 py-3 text-sm outline-none"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Task</p>
                          <textarea
                            value={dayDraft.task}
                            onChange={(event) => setDayDraft((current) => (current ? { ...current, task: event.target.value } : current))}
                            className="mt-2 min-h-[10rem] w-full rounded-[18px] border border-white/14 bg-black/10 px-4 py-4 text-sm outline-none"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Self-check</p>
                          <textarea
                            value={dayDraft.check}
                            onChange={(event) => setDayDraft((current) => (current ? { ...current, check: event.target.value } : current))}
                            className="mt-2 min-h-[7rem] w-full rounded-[18px] border border-white/14 bg-black/10 px-4 py-4 text-sm outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[26px] bg-white/8 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
                        Day controls
                      </p>
                      <div className="mt-5 space-y-3">
                        <Button onClick={openStudySession} className="w-full justify-center">
                          <CalendarDays className="h-4 w-4" />
                          Study this {selectedPlan.cadence === "daily" ? "day" : "week"}
                        </Button>
                        <Button onClick={() => markDay(!dayDraft.completed)} variant="secondary" className="w-full justify-center">
                          <CheckCircle2 className="h-4 w-4" />
                          {dayDraft.completed ? "Mark as incomplete" : "Mark as complete"}
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => jumpToDay(Math.max(0, activeDayIndex - 1))}
                            variant="ghost"
                            className="w-full justify-center rounded-[18px] bg-white/10"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <Button
                            onClick={() => jumpToDay(Math.min(selectedPlan.days.length - 1, activeDayIndex + 1))}
                            variant="ghost"
                            className="w-full justify-center rounded-[18px] bg-white/10"
                          >
                            Next
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          onClick={() => updateSelectedPlan({ current_day: activeDayIndex })}
                          variant="ghost"
                          className="w-full justify-center rounded-[18px] bg-white/10"
                        >
                          Set as today
                        </Button>
                        <div className="rounded-[22px] bg-[linear-gradient(135deg,rgba(255,125,89,0.16),rgba(57,208,255,0.14))] p-4 text-sm">
                          <p className="font-semibold">Autosave status</p>
                          <p className="mt-2">{saving ? "Saving plan changes to your account..." : "Edits and completion progress save back to your account automatically."}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[24px] bg-white/10 px-4 py-4 text-sm">
                    This revision plan does not have any usable study days yet. Regenerate it from the linked studio.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-[24px] bg-white/10 px-4 py-4 text-sm">
                Choose or generate a revision schedule to open the full planner window.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
