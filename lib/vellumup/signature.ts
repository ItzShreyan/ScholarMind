import crypto from "crypto";

export interface SignatureVerificationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Verifies VellumUp webhook signature according to spec:
 * Header format: X-VellumUp-Signature: t=TIMESTAMP,v1=SHA256_HEX
 * Formula: HMAC-SHA256(WEBHOOK_SECRET, "TIMESTAMP.RAW_BODY")
 * Rule: Reject if |now - timestamp| > 300 seconds (replay attack protection)
 * Use timingSafeEqual to prevent timing attacks.
 */
export function verifyVellumUpSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string | null | undefined
): SignatureVerificationResult {
  if (!secret) {
    return { valid: false, reason: "WEBHOOK_SECRET environment variable is missing" };
  }

  if (!signatureHeader) {
    return { valid: false, reason: "Missing X-VellumUp-Signature header" };
  }

  // Parse header t=TIMESTAMP,v1=HEX
  const parts = signatureHeader.split(",");
  let timestampStr: string | null = null;
  let v1Signature: string | null = null;

  for (const part of parts) {
    const [key, value] = part.trim().split("=");
    if (key === "t" && value) {
      timestampStr = value;
    } else if (key === "v1" && value) {
      v1Signature = value;
    }
  }

  if (!timestampStr || !v1Signature) {
    return { valid: false, reason: "Invalid signature header format" };
  }

  // Parse timestamp (seconds or ms)
  const timestampNum = Number(timestampStr);
  if (isNaN(timestampNum)) {
    return { valid: false, reason: "Invalid timestamp in signature header" };
  }

  const timestampMs = timestampStr.length > 11 ? timestampNum : timestampNum * 1000;
  const nowMs = Date.now();
  const diffSeconds = Math.abs(nowMs - timestampMs) / 1000;

  if (diffSeconds > 300) {
    return { valid: false, reason: "Webhook timestamp expired (replay attack protection)" };
  }

  // Compute HMAC-SHA256(WEBHOOK_SECRET, "TIMESTAMP.RAW_BODY")
  const expectedHmac = crypto
    .createHmac("sha256", secret)
    .update(`${timestampStr}.${rawBody}`)
    .digest("hex");

  const v1Buf = Buffer.from(v1Signature, "hex");
  const expectedBuf = Buffer.from(expectedHmac, "hex");

  if (v1Buf.length !== expectedBuf.length) {
    return { valid: false, reason: "Signature mismatch" };
  }

  if (!crypto.timingSafeEqual(v1Buf, expectedBuf)) {
    return { valid: false, reason: "Signature mismatch" };
  }

  return { valid: true };
}

/**
 * Sanitizes text inputs to prevent Postgres null byte errors (\u0000).
 */
export function sanitizeText(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/\u0000/g, "");
}

export function sanitizeTextNullable(str: string | null | undefined): string | null {
  if (str === null || str === undefined) return null;
  return str.replace(/\u0000/g, "");
}
