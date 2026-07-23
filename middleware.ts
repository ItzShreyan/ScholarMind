import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/next";
import { assessRequest, mindSecurityCookie, securityHeaders } from "@/lib/security/mind-security";

const arcjetSecurity = process.env.ARCJET_KEY
  ? arcjet({
      key: process.env.ARCJET_KEY,
      characteristics: ["ip.src"],
      rules: [
        shield({ mode: "LIVE" }),
        detectBot({
          mode: "LIVE",
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:MONITOR", "CATEGORY:PREVIEW"]
        }),
        slidingWindow({
          mode: "LIVE",
          interval: "1m",
          max: 220
        })
      ]
    })
  : null;

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isSecurityCheck = pathname.startsWith("/security-check") || pathname.startsWith("/api/security/verify");
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    /\.[a-z0-9]{2,8}$/i.test(pathname);

  if (!isStaticAsset && !isSecurityCheck) {
    const localDecision = assessRequest(req);
    const verified = req.cookies.get(mindSecurityCookie)?.value === "1";

    if (!localDecision.allowed && localDecision.challenge && !verified) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Human verification required by Mind Security Engine." },
          { status: 403, headers: securityHeaders() }
        );
      }

      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/security-check";
      redirectUrl.searchParams.set("next", `${pathname}${req.nextUrl.search}`);
      return NextResponse.redirect(redirectUrl);
    }

    if (!localDecision.allowed && !localDecision.challenge) {
      return new NextResponse(localDecision.reason, {
        status: localDecision.status,
        headers: {
          "Content-Type": "text/plain",
          ...securityHeaders()
        }
      });
    }

    if (arcjetSecurity) {
      const decision = await arcjetSecurity.protect(req);
      if (decision.isDenied()) {
        return new NextResponse("Blocked by Mind Security Engine.", {
          status: 403,
          headers: {
            "Content-Type": "text/plain",
            ...securityHeaders()
          }
        });
      }
    }
  }

  let response = NextResponse.next({ request: req });
  Object.entries(securityHeaders()).forEach(([key, value]) => response.headers.set(key, value));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: ((cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }) satisfies SetAllCookies
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/schedule") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/host");
  const isAuthRoute = pathname === "/auth";
  const isCallbackRoute = pathname.startsWith("/auth/callback");
  const isSignoutRoute = pathname.startsWith("/auth/signout");
  const isHomeRoute = pathname === "/";

  if (!user && isProtectedRoute) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (isHomeRoute || isAuthRoute) && !isCallbackRoute && !isSignoutRoute) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml)).*)"
  ]
};
