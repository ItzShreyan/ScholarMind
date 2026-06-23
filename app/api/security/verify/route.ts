import { NextResponse } from "next/server";
import { mindSecurityCookie, securityHeaders } from "@/lib/security/mind-security";

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" && value.startsWith("/") ? value : "/";
  return next.startsWith("//") ? "/" : next;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const answer = String(form.get("answer") || "").trim().toLowerCase();
  const next = safeNext(form.get("next"));

  if (answer !== "scholarmind") {
    const url = new URL("/security-check", req.url);
    url.searchParams.set("next", next);
    const response = NextResponse.redirect(url);
    Object.entries(securityHeaders()).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }

  const response = NextResponse.redirect(new URL(next, req.url));
  response.cookies.set(mindSecurityCookie, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  Object.entries(securityHeaders()).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}
