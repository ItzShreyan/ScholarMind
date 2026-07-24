export type AuthOperation = "sign-in" | "sign-up" | "oauth" | "callback" | "session";

type AuthErrorLike = {
  code?: unknown;
  status?: unknown;
  message?: unknown;
  name?: unknown;
};

function readError(error: unknown) {
  if (typeof error === "string") return { code: "", status: 0, message: error };
  if (!error || typeof error !== "object") return { code: "", status: 0, message: "" };

  const candidate = error as AuthErrorLike;
  return {
    code: typeof candidate.code === "string" ? candidate.code.toLowerCase() : "",
    status: typeof candidate.status === "number" ? candidate.status : 0,
    message: typeof candidate.message === "string" ? candidate.message.toLowerCase() : ""
  };
}

export function getAuthErrorMessage(error: unknown, operation: AuthOperation) {
  const { code, status, message } = readError(error);
  const details = `${code} ${message}`;

  if (details.includes("auth_unavailable")) {
    return "Sign-in is temporarily unavailable. Please try again shortly.";
  }
  if (details.includes("missing_auth_code")) {
    return "We could not confirm the sign-in request. Start the sign-in process again.";
  }
  if (details.includes("timeout") || details.includes("timed out") || details.includes("auth_request_timeout")) {
    return "This is taking longer than expected. Check your connection and try again.";
  }
  if (
    details.includes("network") ||
    details.includes("failed to fetch") ||
    details.includes("fetch failed") ||
    details.includes("offline") ||
    details.includes("socket")
  ) {
    return "We could not reach the sign-in service. Check your connection and try again.";
  }
  if (status >= 500 || details.includes("server error") || details.includes("service unavailable")) {
    return "The sign-in service is temporarily unavailable. Please try again shortly.";
  }
  if (details.includes("rate limit") || details.includes("too many requests") || details.includes("over_email_send_rate_limit")) {
    return "Too many attempts were made. Please wait a few minutes before trying again.";
  }
  if (
    details.includes("expired") ||
    details.includes("invalid flow state") ||
    details.includes("flow state not found") ||
    details.includes("invalid grant")
  ) {
    return operation === "callback" || operation === "oauth"
      ? "That sign-in link has expired or was already used. Start the sign-in process again."
      : "Your session has expired. Please sign in again.";
  }
  if (details.includes("email not confirmed") || details.includes("email_not_confirmed")) {
    return "Confirm your email from the verification message, then sign in.";
  }
  if (
    details.includes("invalid login credentials") ||
    details.includes("invalid_credentials") ||
    details.includes("invalid email or password")
  ) {
    return "Email or password is incorrect. Check both and try again.";
  }
  if (
    details.includes("already registered") ||
    details.includes("already exists") ||
    details.includes("user_already_exists") ||
    details.includes("email_exists")
  ) {
    return "An account already exists for this email. Sign in instead.";
  }
  if (details.includes("password") && (details.includes("weak") || details.includes("least") || details.includes("short"))) {
    return "Choose a stronger password with at least 8 characters, upper- and lower-case letters, and a number.";
  }
  if (details.includes("invalid email") || details.includes("email_address_invalid")) {
    return "Enter a valid email address and try again.";
  }
  if (operation === "oauth" || operation === "callback") {
    if (details.includes("access_denied") || details.includes("cancel") || details.includes("denied")) {
      return "Google sign-in was cancelled. Choose Continue with Google to try again.";
    }
    if (details.includes("provider") || details.includes("not enabled") || details.includes("unsupported")) {
      return "Google sign-in is not available right now. Use email and password, or try again later.";
    }
    return "Google sign-in could not be completed. Please try again or use email and password.";
  }
  if (operation === "sign-up" && details.includes("disabled")) {
    return "New account registration is not available right now. Please try again later.";
  }

  return operation === "sign-up"
    ? "We could not create your account. Please check your details and try again."
    : "We could not sign you in. Please try again.";
}

// Keep useful diagnostics in the browser/server console without logging the
// provider's raw message, email address, password, or access tokens.
export function logAuthFailure(operation: AuthOperation, error: unknown) {
  const { code, status } = readError(error);
  console.warn("[auth] request failed", {
    operation,
    code: code || "unknown",
    status: status || undefined
  });
}
