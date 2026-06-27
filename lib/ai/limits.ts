import type { SupabaseClient } from "@supabase/supabase-js";
import {
  defaultChatDailyLimit,
  defaultExamGeneratorWeeklyLimit,
  defaultExamPracticeWeeklyLimit,
  defaultFreePreviewDailyLimit,
  defaultFreePreviewHourlyLimit,
  defaultToolDailyLimit
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

export type UsageScope = "general" | "exam" | "exam_practice" | "chat" | "tool";

const usageStore = new Map<string, UsageEntry[]>();

export const freePreviewHourlyLimit = Math.max(1, Number(process.env.AI_HOURLY_LIMIT ?? defaultFreePreviewHourlyLimit));
export const freePreviewDailyLimit = Math.max(1, Number(process.env.AI_DAILY_LIMIT ?? defaultFreePreviewDailyLimit));
export const examGeneratorWeeklyLimit = Math.max(1, Number(process.env.AI_EXAM_WEEKLY_LIMIT ?? defaultExamGeneratorWeeklyLimit));

function getUsageKey(actorKey: string, scope: UsageScope) {
  return `ai:${scope}:${actorKey}`;
}

function pruneEntries(entries: UsageEntry[], now: number, windowMs = 1000 * 60 * 60 * 24) {
  const threshold = now - windowMs;
  return entries.filter((entry) => entry.timestamp >= threshold);
}

function countRecent(entries: UsageEntry[], since: number) {
  return entries.filter((entry) => entry.timestamp >= since).length;
}

function reserveInMemory(
  actorKey: string,
  scope: UsageScope,
  hourlyLimit: number,
  dailyLimit: number
): ReservationResult {
  const now = Date.now();
  const usageKey = getUsageKey(actorKey, scope);
  const currentEntries = pruneEntries(usageStore.get(usageKey) ?? [], now);
  const hourlyCount = hourlyLimit > 0 ? countRecent(currentEntries, now - 1000 * 60 * 60) : 0;
  const dailyCount = currentEntries.length;

  if ((hourlyLimit > 0 && hourlyCount >= hourlyLimit) || dailyCount >= dailyLimit) {
    usageStore.set(usageKey, currentEntries);
    return {
      allowed: false,
      hourlyRemaining: hourlyLimit > 0 ? Math.max(0, hourlyLimit - hourlyCount) : 0,
      dailyRemaining: Math.max(0, dailyLimit - dailyCount),
      persisted: false
    };
  }

  const token = `${scope}-${now}-${Math.random().toString(36).slice(2, 10)}`;
  currentEntries.push({ id: token, timestamp: now });
  usageStore.set(usageKey, currentEntries);

  return {
    allowed: true,
    token,
    hourlyRemaining: hourlyLimit > 0 ? Math.max(0, hourlyLimit - (hourlyCount + 1)) : 0,
    dailyRemaining: Math.max(0, dailyLimit - (dailyCount + 1)),
    persisted: false
  };
}

function reserveInMemoryWindow(
  actorKey: string,
  scope: UsageScope,
  limit: number,
  windowMs: number
): WindowedReservationResult {
  const now = Date.now();
  const usageKey = getUsageKey(actorKey, scope);
  const currentEntries = pruneEntries(usageStore.get(usageKey) ?? [], now, windowMs);
  const usageCount = currentEntries.length;

  if (usageCount >= limit) {
    usageStore.set(usageKey, currentEntries);
    return {
      allowed: false,
      remaining: 0,
      persisted: false
    };
  }

  const token = `${scope}-${now}-${Math.random().toString(36).slice(2, 10)}`;
  currentEntries.push({ id: token, timestamp: now });
  usageStore.set(usageKey, currentEntries);

  return {
    allowed: true,
    token,
    remaining: Math.max(0, limit - (usageCount + 1)),
    persisted: false
  };
}

function releaseInMemory(actorKey: string, scope: UsageScope, token: string) {
  const usageKey = getUsageKey(actorKey, scope);
  const currentEntries = usageStore.get(usageKey);
  if (!currentEntries?.length) return;

  usageStore.set(
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
  scope: UsageScope;
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
      hourlyLimit > 0 ? rows.filter((row) => new Date(row.created_at).getTime() >= hourAgo).length : 0;
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
  scope: UsageScope;
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
    // Ignore release failures for persisted reservations.
  }
}

export async function reserveScopedUsage({
  supabase,
  actorKey,
  userId,
  scope,
  hourlyLimit = 0,
  dailyLimit
}: {
  supabase?: LimitClient | null;
  actorKey: string;
  userId?: string | null;
  scope: UsageScope;
  hourlyLimit?: number;
  dailyLimit: number;
}) {
  const persisted = await reserveInSupabase({
    supabase,
    actorKey,
    userId,
    scope,
    hourlyLimit,
    dailyLimit
  });

  return persisted ?? reserveInMemory(actorKey, scope, hourlyLimit, dailyLimit);
}

export async function releaseScopedUsage({
  supabase,
  actorKey,
  userId,
  scope,
  token,
  persisted
}: {
  supabase?: LimitClient | null;
  actorKey: string;
  userId?: string | null;
  scope: UsageScope;
  token: string;
  persisted: boolean;
}) {
  if (persisted) {
    await releaseInSupabase({ supabase, userId, token });
    return;
  }

  releaseInMemory(actorKey, scope, token);
}

export async function reserveAiUsage({
  supabase,
  actorKey,
  userId,
  hourlyLimit = freePreviewHourlyLimit,
  dailyLimit = freePreviewDailyLimit,
  scope = "tool"
}: {
  supabase?: LimitClient | null;
  actorKey: string;
  userId?: string | null;
  hourlyLimit?: number;
  dailyLimit?: number;
  scope?: UsageScope;
}) {
  return reserveScopedUsage({
    supabase,
    actorKey,
    userId,
    scope,
    hourlyLimit,
    dailyLimit
  });
}

export async function releaseAiUsage({
  supabase,
  actorKey,
  userId,
  token,
  persisted,
  scope = "tool"
}: {
  supabase?: LimitClient | null;
  actorKey: string;
  userId?: string | null;
  token: string;
  persisted: boolean;
  scope?: UsageScope;
}) {
  return releaseScopedUsage({ supabase, actorKey, userId, scope, token, persisted });
}

export async function reserveChatUsage({
  supabase,
  actorKey,
  userId,
  dailyLimit = defaultChatDailyLimit
}: {
  supabase?: LimitClient | null;
  actorKey: string;
  userId?: string | null;
  dailyLimit?: number;
}) {
  return reserveScopedUsage({
    supabase,
    actorKey,
    userId,
    scope: "chat",
    hourlyLimit: 0,
    dailyLimit
  });
}

export async function releaseChatUsage({
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
  return releaseScopedUsage({ supabase, actorKey, userId, scope: "chat", token, persisted });
}

export async function reserveExamUsage({
  supabase,
  actorKey,
  userId,
  weeklyLimit = examGeneratorWeeklyLimit,
  scope = "exam"
}: {
  supabase?: LimitClient | null;
  actorKey: string;
  userId?: string | null;
  weeklyLimit?: number;
  scope?: "exam" | "exam_practice";
}) {
  const persisted = await reserveInSupabaseWindow({
    supabase,
    actorKey,
    userId,
    scope,
    limit: weeklyLimit,
    windowMs: 1000 * 60 * 60 * 24 * 7
  });

  return persisted ?? reserveInMemoryWindow(actorKey, scope, weeklyLimit, 1000 * 60 * 60 * 24 * 7);
}

export async function releaseExamUsage({
  supabase,
  actorKey,
  userId,
  token,
  persisted,
  scope = "exam"
}: {
  supabase?: LimitClient | null;
  actorKey: string;
  userId?: string | null;
  token: string;
  persisted: boolean;
  scope?: "exam" | "exam_practice";
}) {
  if (persisted) {
    await releaseInSupabase({ supabase, userId, token });
    return;
  }

  releaseInMemory(actorKey, scope, token);
}

export function formatAiLimitMessage(
  hourlyLimit = freePreviewHourlyLimit,
  dailyLimit = defaultToolDailyLimit
) {
  return `Study tool limit reached. You can run up to ${dailyLimit} study tool generation${dailyLimit === 1 ? "" : "s"} per day in the free preview.`;
}

export function formatChatLimitMessage(dailyLimit = defaultChatDailyLimit) {
  return `AI tutor limit reached. You can send up to ${dailyLimit} tutor message${dailyLimit === 1 ? "" : "s"} per day in the free preview.`;
}

export function formatExamLimitMessage(weeklyLimit = examGeneratorWeeklyLimit, practice = false) {
  if (practice) {
    return `Practice exam limit reached. You can generate up to ${weeklyLimit} practice question set${weeklyLimit === 1 ? "" : "s"} per week in the free preview.`;
  }

  return `Full mock exam limit reached. You can generate up to ${weeklyLimit} full mock exam${weeklyLimit === 1 ? "" : "s"} per week in the free preview.`;
}
