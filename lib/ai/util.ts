export function normalizeAIText(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed && trimmed !== "[object Object]" && trimmed !== "{}" ? trimmed : "";
  }

  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    // Prioritize common fields if object contains them.
    const obj = value as Record<string, unknown>;

    if (typeof obj.text === "string" && obj.text.trim()) {
      return obj.text.trim();
    }
    if (typeof obj.content === "string" && obj.content.trim()) {
      return obj.content.trim();
    }
    if (typeof obj.message === "string" && obj.message.trim()) {
      return obj.message.trim();
    }

    try {
      const json = JSON.stringify(obj);
      if (json && json !== "{}" && !json.includes("[object")) {
        return json;
      }
    } catch {
      // Fall through
    }

    return "";
  }

  return String(value).trim();
}

export function normalizeErrorMessage(value: unknown, fallback = "Unexpected error"): string {
  if (value instanceof Error) {
    const nested = normalizeErrorMessage(value.message, "");
    return nested || fallback;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed && trimmed !== "[object Object]" ? trimmed : fallback;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => normalizeErrorMessage(item, ""))
      .filter(Boolean);

    return parts.join(" | ") || fallback;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    const preferred = [
      obj.error,
      obj.message,
      obj.details,
      obj.detail,
      obj.reason,
      obj.text,
      obj.content
    ];

    for (const candidate of preferred) {
      const normalized = normalizeErrorMessage(candidate, "");
      if (normalized) return normalized;
    }

    try {
      const json = JSON.stringify(obj);
      if (json && json !== "{}") return json;
    } catch {
      // ignore
    }
  }

  const coerced = String(value).trim();
  return coerced && coerced !== "[object Object]" ? coerced : fallback;
}
