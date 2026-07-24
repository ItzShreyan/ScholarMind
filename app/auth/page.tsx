"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  LoaderCircle,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getAuthErrorMessage, logAuthFailure, type AuthOperation } from "@/lib/auth/error-messages";

const authRequestTimeoutMs = 20_000;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<Record<"email" | "password", string>>;

function passwordValidationMessage(password: string) {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Include a lower-case letter.";
  if (!/[A-Z]/.test(password)) return "Include an upper-case letter.";
  if (!/\d/.test(password)) return "Include a number.";
  return "";
}

function passwordStrengthLabel(password: string) {
  if (!password) return "";
  const requirementsMet = [password.length >= 8, /[a-z]/.test(password), /[A-Z]/.test(password), /\d/.test(password)].filter(Boolean).length;
  return requirementsMet === 4 ? "Strong password" : `Password strength: ${requirementsMet}/4 requirements met`;
}

function withAuthTimeout<T>(request: Promise<T>) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject({ code: "auth_request_timeout" }), authRequestTimeoutMs);
  });
  return Promise.race([request, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

const highlights = [
  {
    icon: Brain,
    title: "Study in one connected workspace",
    copy: "Summaries, chat, quizzes, and flashcards stay attached to the same notes instead of getting split across tabs."
  },
  {
    icon: Sparkles,
    title: "Move from notes to recall faster",
    copy: "Upload material, get the first summary, and keep building questions or flashcards from the same study stack."
  },
  {
    icon: ShieldCheck,
    title: "Private sessions and secure auth",
    copy: "Your study materials live behind your account with Supabase authentication and storage."
  }
];

export default function AuthPage() {
  const router = useRouter();
  const supabase = useMemo(() => (typeof window === "undefined" ? null : createClient()), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [nextPath, setNextPath] = useState("/dashboard");

  const reportAuthFailure = (operation: AuthOperation, error: unknown) => {
    logAuthFailure(operation, error);
    setStatus("error");
    setMessage(getAuthErrorMessage(error, operation));
  };

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    if (status === "error") {
      setStatus("idle");
      setMessage("");
    }
  };

  const validateForm = () => {
    const nextErrors: FieldErrors = {};
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      nextErrors.email = "Enter your email address.";
    } else if (!emailPattern.test(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Enter your password.";
    } else if (mode === "signup") {
      const passwordError = passwordValidationMessage(password);
      if (passwordError) nextErrors.password = passwordError;
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");
    const next = params.get("next");
    if (next?.startsWith("/")) {
      setNextPath(next);
    }
    if (!authError) return;

    const callbackError = { message: authError };
    logAuthFailure("callback", callbackError);
    setStatus("error");
    setMessage(getAuthErrorMessage(callbackError, "callback"));
  }, []);

  const switchMode = (nextMode: "signin" | "signup") => {
    setMode(nextMode);
    setMessage("");
    setFieldErrors({});
    setStatus("idle");
  };

  const getAuthRedirectTo = () => {
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("next", nextPath);
    return url.toString();
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "loading") return;
    setMessage("");

    if (!validateForm()) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    if (!supabase) {
      reportAuthFailure(mode === "signup" ? "sign-up" : "sign-in", { code: "auth_unavailable" });
      return;
    }

    try {
      if (mode === "signup") {
        const { data, error } = await withAuthTimeout(
          supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: getAuthRedirectTo()
            }
          })
        );

        if (error) {
          reportAuthFailure("sign-up", error);
          return;
        }
        // Supabase can intentionally obscure duplicate accounts by returning a
        // user with no identities instead of an explicit error.
        if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
          reportAuthFailure("sign-up", { code: "email_exists" });
          return;
        }

        setEmail("");
        setPassword("");
        setShowPassword(false);
        setFieldErrors({});
        setStatus("success");
        setMode("signin");
        setMessage("Check your inbox to verify your email, then sign in to open the workspace.");
        return;
      }

      const { error } = await withAuthTimeout(
        supabase.auth.signInWithPassword({ email: email.trim(), password })
      );

      if (error) {
        reportAuthFailure("sign-in", error);
        return;
      }

      setEmail("");
      setPassword("");
      setShowPassword(false);
      setFieldErrors({});
      setStatus("success");
      setMessage("Opening your dashboard...");
      window.location.assign(nextPath);
    } catch (error) {
      reportAuthFailure(mode === "signup" ? "sign-up" : "sign-in", error);
    }
  };

  const signInGoogle = async () => {
    if (status === "loading") return;
    setMessage("");
    setStatus("loading");

    if (!supabase) {
      reportAuthFailure("oauth", { code: "auth_unavailable" });
      return;
    }

    try {
      const { error } = await withAuthTimeout(
        supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: getAuthRedirectTo()
          }
        })
      );

      if (error) {
        reportAuthFailure("oauth", error);
      }
    } catch (error) {
      reportAuthFailure("oauth", error);
    }
  };

  return (
    <main className="bg-hero-glow min-h-screen overflow-hidden px-4 py-5 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-6 md:min-h-[calc(100vh-2.5rem)] md:grid-cols-[1.05fr_0.95fr]">
        <section className="panel panel-border relative hidden overflow-hidden rounded-[34px] p-8 md:flex md:flex-col md:justify-between">
          <div className="mesh-overlay absolute inset-0 opacity-25" />
          <div className="absolute -left-10 top-10 h-48 w-48 rounded-full bg-[rgba(255,125,89,0.18)] blur-3xl" />
          <div className="absolute bottom-4 right-4 h-56 w-56 rounded-full bg-[rgba(57,208,255,0.18)] blur-3xl" />

          <div className="relative z-10">
            <Badge>
              <Sparkles className="h-3.5 w-3.5" />
              Refreshed sign-in experience
            </Badge>
            <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-[0.96]">
              Your study cockpit starts with a cleaner front door.
            </h1>
            <p className="muted mt-4 max-w-xl text-base">
              Log in, open your dashboard, and move straight into summaries, grounded Q&A, quizzes,
              and flashcards.
            </p>
          </div>

          <div className="relative z-10 grid gap-4">
            {highlights.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 * index, duration: 0.45 }}
                className="glass rounded-[28px] p-5"
              >
                <item.icon className="mb-3 h-6 w-6 text-[var(--accent-coral)]" />
                <p className="text-lg font-semibold">{item.title}</p>
                <p className="muted mt-2 text-sm">{item.copy}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="panel panel-border relative overflow-hidden rounded-[34px] p-5 sm:p-8"
        >
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[rgba(255,209,102,0.18)] blur-3xl" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <Link href={nextPath === "/dashboard" ? "/" : nextPath} className="inline-flex items-center gap-2 text-sm font-medium">
              <ArrowLeft className="h-4 w-4" />
              {nextPath === "/dashboard" ? "Back home" : "Back"}
            </Link>
            <ThemeToggle />
          </div>

          <div className="relative z-10 mt-8">
            <Badge className="bg-white/40">
              <Mail className="h-3.5 w-3.5" />
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </Badge>

            <h2 className="mt-5 text-4xl font-semibold">
              {mode === "signin" ? "Log in and pick up where you left off." : "Create an account and start a session."}
            </h2>
            <p className="muted mt-3 text-sm md:text-base">
              {mode === "signin"
                ? "Your dashboard, study workspace, and uploaded material are ready behind secure auth."
                : "Sign up to save sessions, upload notes, and generate quizzes or flashcards from your own materials."}
            </p>
          </div>

          <div className="relative z-10 mt-8 inline-flex rounded-full bg-white/30 p-1">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              disabled={status === "loading"}
              className={`rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                mode === "signin" ? "bg-[var(--fg)] text-[var(--bg)]" : "text-[color:var(--fg)]"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              disabled={status === "loading"}
              className={`rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                mode === "signup" ? "bg-[var(--fg)] text-[var(--bg)]" : "text-[color:var(--fg)]"
              }`}
            >
              Sign up
            </button>
          </div>

          <div className="relative z-10 mt-6">
            <Button
              onClick={signInGoogle}
              variant="secondary"
              size="lg"
              className="w-full justify-center"
              disabled={status === "loading"}
            >
              {status === "loading" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Continue with Google
            </Button>

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              <div className="h-px flex-1 bg-white/20" />
              or with email
              <div className="h-px flex-1 bg-white/20" />
            </div>

            <form onSubmit={onSubmit} noValidate className="space-y-4" aria-busy={status === "loading"}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearFieldError("email");
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "auth-email-error" : undefined}
                  className={`w-full rounded-[22px] border bg-white/25 px-4 py-3.5 outline-none transition focus:bg-white/40 ${
                    fieldErrors.email ? "border-[rgba(244,63,94,0.9)]" : "border-white/20 focus:border-[var(--accent-sky)]"
                  }`}
                  required
                />
                {fieldErrors.email ? (
                  <span id="auth-email-error" className="mt-2 block text-xs text-[rgb(253,164,175)]">
                    {fieldErrors.email}
                  </span>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">Password</span>
                <div
                  className={`flex items-center rounded-[22px] border bg-white/25 px-4 py-3.5 focus-within:bg-white/40 ${
                    fieldErrors.password
                      ? "border-[rgba(244,63,94,0.9)]"
                      : "border-white/20 focus-within:border-[var(--accent-sky)]"
                  }`}
                >
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      clearFieldError("password");
                    }}
                    placeholder={mode === "signin" ? "Enter your password" : "Create a password"}
                    className="w-full bg-transparent outline-none"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "auth-password-error" : mode === "signup" ? "auth-password-strength" : undefined}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="ml-3 rounded-full p-1 text-[color:var(--muted)] hover:text-[color:var(--fg)]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <span id="auth-password-error" className="mt-2 block text-xs text-[rgb(253,164,175)]">
                    {fieldErrors.password}
                  </span>
                ) : mode === "signup" ? (
                  <span id="auth-password-strength" className="muted mt-2 block text-xs" aria-live="polite">
                    {passwordStrengthLabel(password) || "Use 8+ characters with upper- and lower-case letters and a number."}
                  </span>
                ) : null}
              </label>

              <Button type="submit" size="lg" className="w-full justify-center" disabled={status === "loading"}>
                {status === "loading" ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Please wait...
                  </>
                )
                  : mode === "signin"
                    ? "Open dashboard"
                    : "Create account"}
              </Button>
            </form>

            {message ? (
              <div
                role={status === "error" ? "alert" : "status"}
                aria-live="polite"
                className={`mt-4 rounded-[24px] px-4 py-3 text-sm ${
                  status === "error"
                    ? "bg-[rgba(244,63,94,0.14)] text-[color:var(--fg)]"
                    : "bg-[rgba(98,232,191,0.16)] text-[color:var(--fg)]"
                }`}
              >
                <div className="flex items-start gap-2">
                  {status === "error" ? (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(253,164,175)]" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>{message}</span>
                </div>
              </div>
            ) : null}
          </div>

          <p className="muted relative z-10 mt-6 text-sm">
            {mode === "signin" ? "Need an account?" : "Already registered?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
              disabled={status === "loading"}
              className="font-semibold text-[var(--accent-coral)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </motion.section>
      </div>
    </main>
  );
}
