const memoryCache = new Map<string, { value: string; expiresAt: number }>();

export function getCached(key: string): string | null {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value;
}

export function setCached(key: string, value: string, ttlMs = 1000 * 60 * 30) {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
