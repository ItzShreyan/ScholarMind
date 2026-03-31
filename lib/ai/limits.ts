import { defaultFreePreviewDailyLimit, defaultFreePreviewHourlyLimit } from "@/lib/ai/preview";

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

export const freePreviewHourlyLimit = Math.max(1, Number(process.env.AI_HOURLY_LIMIT ?? defaultFreePreviewHourlyLimit));
export const freePreviewDailyLimit = Math.max(1, Number(process.env.AI_DAILY_LIMIT ?? defaultFreePreviewDailyLimit));

function getUsageKey(actorKey: string) {
  return `ai:${actorKey}`;
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

export function formatAiLimitMessage() {
  return `Free preview limit reached. You can use up to ${freePreviewHourlyLimit} AI generations per hour and ${freePreviewDailyLimit} per day while Pro is still coming soon.`;
}
