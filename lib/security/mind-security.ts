type SecurityDecision = {
  allowed: boolean;
  status: number;
  reason: string;
  challenge: boolean;
  score: number;
};

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
    "X-Mind-Security": "Mind Security Engine",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), geolocation=(), payment=(), usb=()"
  };
}
