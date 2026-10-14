type SecurityDecision = {
  allowed: boolean;
  status: number;
  reason: string;
  challenge: boolean;
  score: number;
};

function getChallengeSecret() {
  return process.env.MSE_CHALLENGE_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "scholarmind-fallback-secret";
}

async function computeHmacHex(secret: string, data: string): Promise<string> {
  /*
   * Web Crypto is present in both runtimes this module executes in: the Edge
   * middleware runtime, and Node 18+ (which exposes `crypto.subtle` as a
   * global). There is deliberately no Node-`crypto` fallback: reaching for it
   * required a dynamic, non-static import specifier that made the bundler emit
   * a "Critical dependency: the request of a dependency is an expression"
   * warning on every build while never actually executing.
   */
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const bytes = new Uint8Array(signature);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Creates an HMAC-signed challenge cookie value.
 * The value is `timestamp.signature` so it cannot be forged without the secret.
 */
export async function signChallengeCookie(): Promise<string> {
  const timestamp = Date.now().toString(36);
  const mac = (await computeHmacHex(getChallengeSecret(), timestamp)).slice(0, 16);
  return `${timestamp}.${mac}`;
}

/**
 * Validates an HMAC-signed challenge cookie value.
 * Returns true only when the signature is valid and not expired (12 hours).
 */
export async function verifyChallengeCookie(value: string | undefined | null): Promise<boolean> {
  if (!value || typeof value !== "string") return false;
  const dotIndex = value.indexOf(".");
  if (dotIndex < 1) return false;

  const timestamp = value.slice(0, dotIndex);
  const signature = value.slice(dotIndex + 1);

  const expected = (await computeHmacHex(getChallengeSecret(), timestamp)).slice(0, 16);

  if (signature !== expected) return false;

  const created = parseInt(timestamp, 36);
  if (Number.isNaN(created)) return false;

  const maxAge = 12 * 60 * 60 * 1000; // 12 hours
  return Date.now() - created < maxAge;
}

const requestLog = new Map<string, number[]>();

const suspiciousPatterns = [
  /\.\.\//,
  /<script/i,
  /union\s+select/i,
  /information_schema/i,
  /(?:^|[^\w])select\s+.+\s+from\s+/i,
  /(?:^|[^\w])drop\s+table/i,
  /\/etc\/passwd/i,
  /wp-admin|wp-login|phpmyadmin/i,
  /\b(?:api[_-]?key|password|passwd|secret|token)=/i
];

const suspiciousAgents = [
  /sqlmap/i,
  /nikto/i,
  /acunetix/i,
  /masscan/i,
  /nmap/i,
  /gobuster/i,
  /dirbuster/i,
  /python-requests/i,
  /curl/i,
  /wget/i
];

export const mindSecurityCookie = "mse_verified";

function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "local";
}

function rateLimitKey(req: Request, scope: string) {
  return `${scope}:${getClientIp(req)}`;
}

export function checkLocalRateLimit(req: Request, {
  scope,
  max,
  windowMs
}: {
  scope: string;
  max: number;
  windowMs: number;
}) {
  const key = rateLimitKey(req, scope);
  const now = Date.now();
  const recent = (requestLog.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
  recent.push(now);
  requestLog.set(key, recent);
  return {
    allowed: recent.length <= max,
    remaining: Math.max(0, max - recent.length),
    retryAfter: Math.ceil(windowMs / 1000)
  };
}

export function assessRequest(req: Request): SecurityDecision {
  const url = new URL(req.url);
  const userAgent = req.headers.get("user-agent") || "";
  const probe = `${url.pathname} ${url.search}`;
  let score = 0;
  const reasons: string[] = [];

  if (!userAgent.trim()) {
    score += 25;
    reasons.push("missing user agent");
  }

  if (suspiciousAgents.some((pattern) => pattern.test(userAgent))) {
    score += 35;
    reasons.push("suspicious automation user agent");
  }

  if (suspiciousPatterns.some((pattern) => pattern.test(probe))) {
    score += 55;
    reasons.push("attack pattern in request");
  }

  const globalLimit = checkLocalRateLimit(req, {
    scope: "global",
    max: 220,
    windowMs: 60_000
  });

  if (!globalLimit.allowed) {
    return {
      allowed: false,
      status: 429,
      reason: "Too many requests. Please slow down.",
      challenge: false,
      score: 100
    };
  }

  if (score >= 70) {
    return {
      allowed: false,
      status: 403,
      reason: reasons.join(", ") || "Blocked by Mind Security Engine.",
      challenge: false,
      score
    };
  }

  if (score >= 35) {
    return {
      allowed: false,
      status: 403,
      reason: reasons.join(", ") || "Human verification required.",
      challenge: true,
      score
    };
  }

  return {
    allowed: true,
    status: 200,
    reason: "Allowed",
    challenge: false,
    score
  };
}

export function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), geolocation=(), payment=(), usb=()"
  };
}

/**
 * Safely sanitizes a redirection URL to prevent Open Redirect vulnerabilities.
 * It enforces that the URL starts with a single '/' and resolves to a local path
 * when parsed against a dummy base origin, avoiding multi-slash (e.g. '///example.com')
 * or slash-backslash (e.g. '/\example.com') bypasses.
 *
 * @param url The untrusted redirect destination.
 * @param fallback The default fallback path (defaults to "/dashboard").
 */
export function getSafeRedirect(url: string | null | undefined, fallback = "/dashboard"): string {
  if (!url || typeof url !== "string") return fallback;
  if (!url.startsWith("/")) return fallback;

  try {
    // Parse the URL against a mock base origin.
    const parsed = new URL(url, "http://localhost-base.local");
    // If the parsed URL resolves to a different origin, it is an external redirect.
    if (parsed.origin !== "http://localhost-base.local") {
      return fallback;
    }
    // Return path + search + hash ensuring strict relativity.
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}
