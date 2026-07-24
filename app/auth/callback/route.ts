import { NextResponse } from "next/server";
import { getAuthErrorMessage, logAuthFailure } from "@/lib/auth/error-messages";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next");
  const next = nextParam?.startsWith("/") ? nextParam : "/dashboard";
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (error) {
    const authError = { code: error, message: errorDescription || error };
    logAuthFailure("callback", authError);
    const message = getAuthErrorMessage(authError, "callback");
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(message)}`, requestUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/auth?error=${encodeURIComponent(getAuthErrorMessage({ code: "missing_auth_code" }, "callback"))}`,
        requestUrl.origin
      )
    );
  }

  try {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      throw exchangeError;
    }
  } catch (exchangeError) {
    logAuthFailure("callback", exchangeError);
    return NextResponse.redirect(
      new URL(
        `/auth?error=${encodeURIComponent(getAuthErrorMessage(exchangeError, "callback"))}`,
        requestUrl.origin
      )
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
