import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Fraunces, Inter, Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { MotionTierProvider } from "@/components/providers/MotionTierProvider";
import { TelemetryTracker } from "@/components/providers/TelemetryTracker";
import { GlobalSecurityBadge } from "@/components/common/GlobalSecurityBadge";
import { MaintenanceBanner } from "@/components/common/MaintenanceBanner";
import { ToastViewport } from "@/components/ui/Toast";
import { getSiteUrl } from "@/lib/site-url";
import { DashboardMusicLayout } from "@/components/dashboard/DashboardMusicLayout";
import { motionBootScript } from "@/lib/motion-tier";

const siteUrl = getSiteUrl();

/*
 * Typography. Three faces, three jobs:
 *   Inter     → product UI, body copy, anything read at length
 *   Manrope   → display headings and numbers
 *   Fraunces  → editorial statements, document titles (restrained serif)
 *
 * `display: "swap"` plus the CSS fallback stack in globals.css means text is
 * readable immediately and never invisible while a font loads.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  fallback: ["system-ui", "Segoe UI", "Roboto", "sans-serif"]
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
  fallback: ["Inter", "system-ui", "sans-serif"]
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  fallback: ["Georgia", "Times New Roman", "serif"]
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ScholarMind | AI Study Companion for Notes, Quizzes, Flashcards, and Revision",
    template: "%s | ScholarMind"
  },
  description:
    "Upload notes, PDFs, and screenshots, then turn them into grounded chat, quizzes, flashcards, mock exams, and revision plans with ScholarMind.",
  applicationName: "ScholarMind",
  icons: {
    icon: [{ url: "/scholarmind-icon.svg", type: "image/svg+xml" }],
    shortcut: "/scholarmind-icon.svg",
    apple: [{ url: "/scholarmind-icon.svg", type: "image/svg+xml" }]
  },
  keywords: [
    "AI study companion",
    "revision app",
    "quiz generator",
    "flashcards from notes",
    "AI study tool for students",
    "summarise notes with AI",
    "revision schedule"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "ScholarMind",
    title: "ScholarMind | AI Study Companion for Notes, Quizzes, Flashcards, and Revision",
    description:
      "Upload notes, PDFs, and screenshots, then turn them into grounded chat, quizzes, flashcards, mock exams, and revision plans."
  },
  twitter: {
    card: "summary_large_image",
    title: "ScholarMind | AI Study Companion for Students",
    description:
      "Grounded AI chat, summaries, quizzes, flashcards, mock exams, and revision plans from your notes."
  },
  verification: {
    google: "q5SOhXqO6XZoNQqZm4baL-mhPYtS4z5s08L-wtu8u_E"
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#080d12" },
    { media: "(prefers-color-scheme: light)", color: "#f1ede4" }
  ],
  colorScheme: "dark light"
};

/**
 * Runs before first paint. Sets the theme class, the playful-motion flag and
 * the motion tier so a reduced-motion visitor never sees one animated frame
 * and the 3D world is never even requested on a device that cannot run it.
 */
const bootScript = `
(function () {
  try {
    var root = document.documentElement;
    var theme = localStorage.getItem("theme");
    root.classList.toggle("light", theme === "light");
    var playful = localStorage.getItem("scholarmind_playful_motion");
    root.setAttribute("data-playful", playful === "off" ? "off" : "on");
  } catch (error) {
    document.documentElement.setAttribute("data-playful", "on");
  }
  ${motionBootScript}
})();
`;

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-playful="on"
      data-motion="reduced"
      className={`${inter.variable} ${manrope.variable} ${fraunces.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <Suspense fallback={null}>
          <MaintenanceBanner />
        </Suspense>
        <AuthProvider>
          <MotionTierProvider>
            <TelemetryTracker />
            <DashboardMusicLayout>
              {children}
            </DashboardMusicLayout>
            <GlobalSecurityBadge />
            <ToastViewport />
          </MotionTierProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
