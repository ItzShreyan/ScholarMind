import {
  defaultExamGeneratorDailyLimit,
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
    }
  | {
      allowed: false;
      hourlyRemaining: number;
      dailyRemaining: number;
    };

const usageStore = new Map<string, UsageEntry[]>();
const examUsageStore = new Map<string, UsageEntry[]>();

export const freePreviewHourlyLimit = Math.max(1, Number(process.env.AI_HOURLY_LIMIT ?? defaultFreePreviewHourlyLimit));
export const freePreviewDailyLimit = Math.max(1, Number(process.env.AI_DAILY_LIMIT ?? defaultFreePreviewDailyLimit));
export const examGeneratorDailyLimit = Math.max(1, Number(process.env.AI_EXAM_DAILY_LIMIT ?? defaultExamGeneratorDailyLimit));

function getUsageKey(actorKey: string) {
  return `ai:${actorKey}`;
}

function getExamUsageKey(actorKey: string) {
  return `ai:exam:${actorKey}`;
}

function pruneEntries(entries: UsageEntry[], now: number) {
  const dayAgo = now - 1000 * 60 * 60 * 24;
  return entries.filter((entry) => entry.timestamp >= dayAgo);
}

function countRecent(entries: UsageEntry[], since: number) {
  return entries.filter((entry) => entry.timestamp >= since).length;
}

export function reserveAiUsage(actorKey: string): ReservationResult {
  const now = Date.now();
  const usageKey = getUsageKey(actorKey);
  const currentEntries = pruneEntries(usageStore.get(usageKey) ?? [], now);
  const hourlyCount = countRecent(currentEntries, now - 1000 * 60 * 60);
  const dailyCount = currentEntries.length;

  if (hourlyCount >= freePreviewHourlyLimit || dailyCount >= freePreviewDailyLimit) {
    usageStore.set(usageKey, currentEntries);
    return {
      allowed: false,
      hourlyRemaining: Math.max(0, freePreviewHourlyLimit - hourlyCount),
      dailyRemaining: Math.max(0, freePreviewDailyLimit - dailyCount)
    };
  }

  const token = `${now}-${Math.random().toString(36).slice(2, 10)}`;
  currentEntries.push({ id: token, timestamp: now });
  usageStore.set(usageKey, currentEntries);

  return {
    allowed: true,
    token,
    hourlyRemaining: Math.max(0, freePreviewHourlyLimit - (hourlyCount + 1)),
    dailyRemaining: Math.max(0, freePreviewDailyLimit - (dailyCount + 1))
  };
}

export function releaseAiUsage(actorKey: string, token: string) {
  const usageKey = getUsageKey(actorKey);
  const currentEntries = usageStore.get(usageKey);
  if (!currentEntries?.length) return;

  usageStore.set(
    usageKey,
    currentEntries.filter((entry) => entry.id !== token)
  );
}

export function reserveExamUsage(actorKey: string): ReservationResult {
  const now = Date.now();
  const usageKey = getExamUsageKey(actorKey);
  const currentEntries = pruneEntries(examUsageStore.get(usageKey) ?? [], now);
  const dailyCount = currentEntries.length;

  if (dailyCount >= examGeneratorDailyLimit) {
    examUsageStore.set(usageKey, currentEntries);
    return {
      allowed: false,
      hourlyRemaining: 0,
      dailyRemaining: Math.max(0, examGeneratorDailyLimit - dailyCount)
    };
  }

  const token = `${now}-${Math.random().toString(36).slice(2, 10)}`;
  currentEntries.push({ id: token, timestamp: now });
  examUsageStore.set(usageKey, currentEntries);

  return {
    allowed: true,
    token,
    hourlyRemaining: 0,
    dailyRemaining: Math.max(0, examGeneratorDailyLimit - (dailyCount + 1))
  };
}

export function releaseExamUsage(actorKey: string, token: string) {
  const usageKey = getExamUsageKey(actorKey);
  const currentEntries = examUsageStore.get(usageKey);
  if (!currentEntries?.length) return;

  examUsageStore.set(
    usageKey,
    currentEntries.filter((entry) => entry.id !== token)
  );
}

export function formatAiLimitMessage() {
  return `Free preview limit reached. You can use up to ${freePreviewHourlyLimit} AI generations per hour and ${freePreviewDailyLimit} per day while Pro is still coming soon.`;
}

export function formatExamLimitMessage() {
  return `Exam generator limit reached. You can generate up to ${examGeneratorDailyLimit} full mock exam${examGeneratorDailyLimit === 1 ? "" : "s"} per day in the free preview.`;
}
