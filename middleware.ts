import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({ request: req });

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

  const pathname = req.nextUrl.pathname;
  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/studio") || pathname.startsWith("/settings");
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
  matcher: ["/", "/auth", "/auth/:path*", "/dashboard/:path*", "/studio/:path*", "/settings/:path*"]
};
