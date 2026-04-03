"use client";

import { useMemo, useState } from "react";
import { BarChart3, Crown, Eye, LineChart, Settings2, Users } from "lucide-react";
import type { SiteSettings } from "@/lib/site-settings";
import { normalizeErrorMessage } from "@/lib/ai/util";

type SiteEvent = {
  id: string;
  visitor_key: string;
  user_id: string | null;
  user_email: string | null;
  event_type: "page_view" | "feature_use" | "source_search" | "source_import";
  page: string | null;
  feature: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type SubscriptionRow = {
  plan: "free" | "pro";
};

function formatShortDay(input: string) {
  return new Date(input).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function toDisplayLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function HostPanel({
  initialEvents,
  initialSubscriptions,
  initialSettings
}: {
  initialEvents: SiteEvent[];
  initialSubscriptions: SubscriptionRow[];
  initialSettings: SiteSettings;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const analytics = useMemo(() => {
    const now = Date.now();
    const tenMinutesAgo = now - 1000 * 60 * 10;
    const thirtyDaysAgo = now - 1000 * 60 * 60 * 24 * 30;
    const sevenDaysAgo = now - 1000 * 60 * 60 * 24 * 6;

    const pageViews = initialEvents.filter((event) => event.event_type === "page_view");
    const recentPageViews = pageViews.filter((event) => new Date(event.created_at).getTime() >= thirtyDaysAgo);
    const activeVisitors = new Set(
      pageViews
        .filter((event) => new Date(event.created_at).getTime() >= tenMinutesAgo)
        .map((event) => event.user_id || event.visitor_key)
        .filter(Boolean)
    ).size;
    const uniqueVisitors = new Set(
      recentPageViews.map((event) => event.user_id || event.visitor_key).filter(Boolean)
    ).size;
    const proUsers = initialSubscriptions.filter((row) => row.plan === "pro").length;

    const featureCounts = new Map<string, number>();
    initialEvents
      .filter((event) => event.event_type === "feature_use" && event.feature)
      .forEach((event) => {
        const key = event.feature || "unknown";
        featureCounts.set(key, (featureCounts.get(key) ?? 0) + 1);
      });

    const featureUsage = Array.from(featureCounts.entries())
      .map(([feature, count]) => ({ feature, count }))
      .sort((left, right) => right.count - left.count);

    const mostPopularFeature = featureUsage[0]?.feature ?? "None yet";

    const visitsByDay = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(sevenDaysAgo + index * 1000 * 60 * 60 * 24);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const dayEnd = dayStart + 1000 * 60 * 60 * 24;
      const count = pageViews.filter((event) => {
        const timestamp = new Date(event.created_at).getTime();
        return timestamp >= dayStart && timestamp < dayEnd;
      }).length;

      return {
        label: formatShortDay(date.toISOString()),
        count
      };
    });

    const topPages = Array.from(
      pageViews.reduce((accumulator, event) => {
        const key = event.page || "Unknown";
        accumulator.set(key, (accumulator.get(key) ?? 0) + 1);
        return accumulator;
      }, new Map<string, number>())
    )
      .map(([page, count]) => ({ page, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);

    return {
      activeVisitors,
      uniqueVisitors,
      totalVisits: recentPageViews.length,
      proUsers,
      mostPopularFeature,
      featureUsage,
      visitsByDay,
      topPages
    };
  }, [initialEvents, initialSubscriptions]);

  const saveSettings = async () => {
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/host/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(normalizeErrorMessage(json.error, "Unable to save host settings."));
      }

      setSettings(json.settings);
      setStatus("Host settings saved.");
    } catch (error) {
      setStatus(normalizeErrorMessage(error, "Unable to save host settings."));
    } finally {
      setSaving(false);
    }
  };

  const maxVisitCount = Math.max(1, ...analytics.visitsByDay.map((entry) => entry.count));
  const maxFeatureCount = Math.max(1, ...analytics.featureUsage.map((entry) => entry.count));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-10 pt-4 md:px-6">
      <section className="panel panel-border rounded-[32px] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent-sky)]">Host panel</p>
            <h1 className="text-3xl font-semibold md:text-4xl">ScholarMind command deck</h1>
            <p className="muted max-w-3xl text-sm md:text-base">
              Shift-click the logo with your owner account to open this panel and keep an eye on traffic, feature
              momentum, Pro readiness, and live site settings.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-3 text-sm">
            <p className="muted text-xs uppercase tracking-[0.24em]">Most popular</p>
            <p className="mt-1 text-lg font-semibold">{toDisplayLabel(analytics.mostPopularFeature)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Live visitors",
            value: analytics.activeVisitors,
            icon: Users,
            note: "Unique visitors seen in the last 10 minutes"
          },
          {
            label: "30-day visits",
            value: analytics.totalVisits,
            icon: Eye,
            note: "Page views tracked across the public site and app"
          },
          {
            label: "30-day learners",
            value: analytics.uniqueVisitors,
            icon: LineChart,
            note: "Unique signed-in or anonymous visitors in the last month"
          },
          {
            label: "Pro users",
            value: analytics.proUsers,
            icon: Crown,
            note: "Counts active Pro plan rows once billing goes live"
          }
        ].map((card) => (
          <div key={card.label} className="panel rounded-[28px] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="muted text-xs uppercase tracking-[0.24em]">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold">{card.value}</p>
              </div>
              <card.icon className="h-5 w-5 text-[var(--accent-sky)]" />
            </div>
            <p className="muted mt-4 text-sm">{card.note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="panel rounded-[30px] p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[var(--accent-coral)]" />
            <h2 className="text-xl font-semibold">Visits over the last 7 days</h2>
          </div>
          <div className="grid grid-cols-7 items-end gap-3">
            {analytics.visitsByDay.map((entry) => (
              <div key={entry.label} className="flex flex-col items-center gap-2">
                <div className="muted text-xs">{entry.count}</div>
                <div className="flex h-44 w-full items-end rounded-[20px] border border-white/8 bg-white/4 p-2">
                  <div
                    className="w-full rounded-[14px] bg-[linear-gradient(180deg,var(--accent-sky),var(--accent-coral))]"
                    style={{ height: `${Math.max(10, (entry.count / maxVisitCount) * 100)}%` }}
                  />
                </div>
                <div className="muted text-xs">{entry.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel rounded-[30px] p-5">
          <div className="mb-4 flex items-center gap-2">
            <LineChart className="h-5 w-5 text-[var(--accent-gold)]" />
            <h2 className="text-xl font-semibold">Feature usage</h2>
          </div>
          <div className="space-y-3">
            {analytics.featureUsage.length ? (
              analytics.featureUsage.slice(0, 8).map((entry) => (
                <div key={entry.feature} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>{toDisplayLabel(entry.feature)}</span>
                    <span className="muted">{entry.count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-coral),var(--accent-sky))]"
                      style={{ width: `${Math.max(12, (entry.count / maxFeatureCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="muted text-sm">Feature usage will appear here after people start using the study tools.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="panel rounded-[30px] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-[var(--accent-sky)]" />
            <h2 className="text-xl font-semibold">Site settings</h2>
          </div>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm">
              <span className="muted">Free AI runs per day</span>
              <input
                className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 outline-none"
                type="number"
                min={1}
                max={200}
                value={settings.aiDailyLimit}
                onChange={(event) => setSettings((current) => ({ ...current, aiDailyLimit: Number(event.target.value) }))}
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="muted">Free AI runs per hour</span>
              <input
                className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 outline-none"
                type="number"
                min={0}
                max={100}
                value={settings.aiHourlyLimit}
                onChange={(event) => setSettings((current) => ({ ...current, aiHourlyLimit: Number(event.target.value) }))}
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="muted">Full exam limit per week</span>
              <input
                className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 outline-none"
                type="number"
                min={1}
                max={20}
                value={settings.examWeeklyLimit}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, examWeeklyLimit: Number(event.target.value) }))
                }
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm">
              <span>Keep Research Mode locked</span>
              <input
                type="checkbox"
                checked={settings.researchModeLocked}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, researchModeLocked: event.target.checked }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="muted">Maintenance banner</span>
              <textarea
                className="min-h-[108px] rounded-2xl border border-white/12 bg-white/8 px-4 py-3 outline-none"
                value={settings.maintenanceMessage}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, maintenanceMessage: event.target.value }))
                }
                placeholder="Optional note for launch days, incidents, or waitlist pushes."
              />
            </label>
            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="rounded-full bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-gold),var(--accent-sky))] px-5 py-3 text-sm font-semibold text-slate-950 transition disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save host settings"}
            </button>
            <p className="text-sm text-[var(--accent-sky)]">{status || "Limits save straight into the live site config."}</p>
          </div>
        </div>

        <div className="panel rounded-[30px] p-5">
          <h2 className="text-xl font-semibold">Top pages right now</h2>
          <div className="mt-4 space-y-3">
            {analytics.topPages.length ? (
              analytics.topPages.map((entry, index) => (
                <div key={`${entry.page}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                  <span className="truncate text-sm">{entry.page}</span>
                  <span className="muted text-sm">{entry.count} visit{entry.count === 1 ? "" : "s"}</span>
                </div>
              ))
            ) : (
              <p className="muted text-sm">Page visit data will appear here after telemetry starts flowing.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
