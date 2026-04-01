import type { SupabaseClient } from "@supabase/supabase-js";
import {
  defaultExamGeneratorWeeklyLimit,
  defaultFreePreviewDailyLimit,
  defaultFreePreviewHourlyLimit
} from "@/lib/ai/preview";

type UsageEntry = {
  id: string;
  timestamp: number;
};

type ReservationResult =
  | {
      allowed: true;
      token: string;
      hourlyRemaining: number;
      dailyRemaining: number;
      persisted: boolean;
    }
  | {
      allowed: false;
      hourlyRemaining: number;
      dailyRemaining: number;
      persisted: boolean;
    };

type WindowedReservationResult =
  | {
      allowed: true;
      token: string;
      remaining: number;
      persisted: boolean;
    }
  | {
      allowed: false;
      remaining: number;
      persisted: boolean;
    };

type LimitClient = SupabaseClient;

const usageStore = new Map<string, UsageEntry[]>();
const examUsageStore = new Map<string, UsageEntry[]>();

export const freePreviewHourlyLimit = Math.max(1, Number(process.env.AI_HOURLY_LIMIT ?? defaultFreePreviewHourlyLimit));
export const freePreviewDailyLimit = Math.max(1, Number(process.env.AI_DAILY_LIMIT ?? defaultFreePreviewDailyLimit));
export const examGeneratorWeeklyLimit = Math.max(1, Number(process.env.AI_EXAM_WEEKLY_LIMIT ?? defaultExamGeneratorWeeklyLimit));

function getUsageKey(actorKey: string) {
  return `ai:${actorKey}`;
}

function getExamUsageKey(actorKey: string) {
  return `ai:exam:${actorKey}`;
}

function pruneEntries(entries: UsageEntry[], now: number, windowMs = 1000 * 60 * 60 * 24) {
  const threshold = now - windowMs;
  return entries.filter((entry) => entry.timestamp >= threshold);
}

function countRecent(entries: UsageEntry[], since: number) {
  return entries.filter((entry) => entry.timestamp >= since).length;
}

function reserveInMemory(actorKey: string, store: Map<string, UsageEntry[]>, hourlyLimit: number, dailyLimit: number): ReservationResult {
  const now = Date.now();
  const usageKey = store === examUsageStore ? getExamUsageKey(actorKey) : getUsageKey(actorKey);
  const currentEntries = pruneEntries(store.get(usageKey) ?? [], now);
  const hourlyCount = hourlyLimit > 0 ? countRecent(currentEntries, now - 1000 * 60 * 60) : 0;
  const dailyCount = currentEntries.length;

  if ((hourlyLimit > 0 && hourlyCount >= hourlyLimit) || dailyCount >= dailyLimit) {
    store.set(usageKey, currentEntries);
    return {
      allowed: false,
      hourlyRemaining: hourlyLimit > 0 ? Math.max(0, hourlyLimit - hourlyCount) : 0,
      dailyRemaining: Math.max(0, dailyLimit - dailyCount),
      persisted: false
    };
  }

  const token = `${now}-${Math.random().toString(36).slice(2, 10)}`;
  currentEntries.push({ id: token, timestamp: now });
  store.set(usageKey, currentEntries);

  return {
    allowed: true,
    token,
    hourlyRemaining: hourlyLimit > 0 ? Math.max(0, hourlyLimit - (hourlyCount + 1)) : 0,
    dailyRemaining: Math.max(0, dailyLimit - (dailyCount + 1)),
    persisted: false
  };
}

function reserveInMemoryWindow(actorKey: string, store: Map<string, UsageEntry[]>, limit: number, windowMs: number): WindowedReservationResult {
  const now = Date.now();
  const usageKey = store === examUsageStore ? getExamUsageKey(actorKey) : getUsageKey(actorKey);
  const currentEntries = pruneEntries(store.get(usageKey) ?? [], now, windowMs);
  const usageCount = currentEntries.length;

  if (usageCount >= limit) {
    store.set(usageKey, currentEntries);
    return {
      allowed: false,
      remaining: 0,
      persisted: false
    };
  }

  const token = `${now}-${Math.random().toString(36).slice(2, 10)}`;
  currentEntries.push({ id: token, timestamp: now });
  store.set(usageKey, currentEntries);

  return {
    allowed: true,
    token,
    remaining: Math.max(0, limit - (usageCount + 1)),
    persisted: false
  };
}

function releaseInMemory(actorKey: string, token: string, store: Map<string, UsageEntry[]>) {
  const usageKey = store === examUsageStore ? getExamUsageKey(actorKey) : getUsageKey(actorKey);
  const currentEntries = store.get(usageKey);
  if (!currentEntries?.length) return;

  store.set(
    usageKey,
    currentEntries.filter((entry) => entry.id !== token)
  );
}

async function reserveInSupabase({
  supabase,
  actorKey,
  userId,
  scope,
  hourlyLimit,
  dailyLimit
}: {
  supabase?: LimitClient | null;
  actorKey: string;
  userId?: string | null;
  scope: "general" | "exam";
  hourlyLimit: number;
  dailyLimit: number;
}): Promise<ReservationResult | null> {
  if (!supabase || !userId) return null;

  const now = Date.now();
  const dayAgoIso = new Date(now - 1000 * 60 * 60 * 24).toISOString();
  const hourAgo = now - 1000 * 60 * 60;
  const token = `${scope}-${now}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const { data, error } = await supabase
      .from("study_ai_usage")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("scope", scope)
      .gte("created_at", dayAgoIso);

    if (error) {
      return null;
    }

    const rows = Array.isArray(data) ? data : [];
    const hourlyCount =
      hourlyLimit > 0
        ? rows.filter((row) => new Date(row.created_at).getTime() >= hourAgo).length
        : 0;
    const dailyCount = rows.length;

    if ((hourlyLimit > 0 && hourlyCount >= hourlyLimit) || dailyCount >= dailyLimit) {
      return {
        allowed: false,
        hourlyRemaining: hourlyLimit > 0 ? Math.max(0, hourlyLimit - hourlyCount) : 0,
        dailyRemaining: Math.max(0, dailyLimit - dailyCount),
        persisted: true
      };
    }

    const { error: insertError } = await supabase.from("study_ai_usage").insert({
      id: token,
      user_id: userId,
      actor_key: actorKey,
      scope
    });

    if (insertError) {
      return null;
    }

    return {
      allowed: true,
      token,
      hourlyRemaining: hourlyLimit > 0 ? Math.max(0, hourlyLimit - (hourlyCount + 1)) : 0,
      dailyRemaining: Math.max(0, dailyLimit - (dailyCount + 1)),
      persisted: true
    };
  } catch {
    return null;
  }
}

async function reserveInSupabaseWindow({
  supabase,
  actorKey,
  userId,
  scope,
  limit,
  windowMs
}: {
  supabase?: LimitClient | null;
  actorKey: string;
  userId?: string | null;
  scope: "general" | "exam";
  limit: number;
  windowMs: number;
}): Promise<WindowedReservationResult | null> {
  if (!supabase || !userId) return null;

  const now = Date.now();
  const thresholdIso = new Date(now - windowMs).toISOString();
  const token = `${scope}-${now}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const { data, error } = await supabase
      .from("study_ai_usage")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("scope", scope)
      .gte("created_at", thresholdIso);

    if (error) {
      return null;
    }

    const rows = Array.isArray(data) ? data : [];
    const usageCount = rows.length;

    if (usageCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        persisted: true
      };
    }

    const { error: insertError } = await supabase.from("study_ai_usage").insert({
      id: token,
      user_id: userId,
      actor_key: actorKey,
      scope
    });

    if (insertError) {
      return null;
    }

    return {
      allowed: true,
      token,
      remaining: Math.max(0, limit - (usageCount + 1)),
      persisted: true
    };
  } catch {
    return null;
  }
}

async function releaseInSupabase({
  supabase,
  userId,
  token
}: {
  supabase?: LimitClient | null;
  userId?: string | null;
  token: string;
}) {
  if (!supabase || !userId || !token) return;

  try {
    await supabase.from("study_ai_usage").delete().eq("id", token).eq("user_id", userId);
  } catch {
    // Fallback release happens at the caller only for memory-backed reservations.
  }
}

export async function reserveAiUsage({
  supabase,
  actorKey,
  userId
}: {
  supabase?: LimitClient | null;
  actorKey: string;
  userId?: string | null;
}) {
  const persisted = await reserveInSupabase({
    supabase,
    actorKey,
    userId,
    scope: "general",
    hourlyLimit: freePreviewHourlyLimit,
    dailyLimit: freePreviewDailyLimit
  });

  return persisted ?? reserveInMemory(actorKey, usageStore, freePreviewHourlyLimit, freePreviewDailyLimit);
}

export async function releaseAiUsage({
  supabase,
  actorKey,
  userId,
  token,
  persisted
}: {
  supabase?: LimitClient | null;
  actorKey: string;
  userId?: string | null;
  token: string;
  persisted: boolean;
}) {
  if (persisted) {
    await releaseInSupabase({ supabase, userId, token });
    return;
  }

  releaseInMemory(actorKey, token, usageStore);
}

export async function reserveExamUsage({
  supabase,
  actorKey,
  userId
}: {
  supabase?: LimitClient | null;
  actorKey: string;
  userId?: string | null;
}) {
  const persisted = await reserveInSupabaseWindow({
    supabase,
    actorKey,
    userId,
    scope: "exam",
    limit: examGeneratorWeeklyLimit,
    windowMs: 1000 * 60 * 60 * 24 * 7
  });

  return persisted ?? reserveInMemoryWindow(actorKey, examUsageStore, examGeneratorWeeklyLimit, 1000 * 60 * 60 * 24 * 7);
}

export async function releaseExamUsage({
  supabase,
  actorKey,
  userId,
  token,
  persisted
}: {
  supabase?: LimitClient | null;
  actorKey: string;
  userId?: string | null;
  token: string;
  persisted: boolean;
}) {
  if (persisted) {
    await releaseInSupabase({ supabase, userId, token });
    return;
  }

  releaseInMemory(actorKey, token, examUsageStore);
}

export function formatAiLimitMessage() {
  return `Free preview limit reached. You can use up to ${freePreviewHourlyLimit} AI generations per hour and ${freePreviewDailyLimit} per day while Pro is still coming soon.`;
}

export function formatExamLimitMessage() {
  return `Exam generator limit reached. You can generate up to ${examGeneratorWeeklyLimit} full mock exam${examGeneratorWeeklyLimit === 1 ? "" : "s"} per week in the free preview.`;
}
