import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { TelemetryTracker } from "@/components/providers/TelemetryTracker";
import { getSiteUrl } from "@/lib/site-url";
import { getSiteSettings } from "@/lib/site-settings";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ScholarMind | AI Study Companion for Notes, Quizzes, Flashcards, and Revision",
    template: "%s | ScholarMind"
  },
  description:
    "Upload notes, PDFs, and screenshots, then turn them into grounded chat, quizzes, flashcards, mock exams, and revision plans with ScholarMind.",
  applicationName: "ScholarMind",
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
  }
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const siteSettings = await getSiteSettings();
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
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning data-playful="on">
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <AuthProvider>
          <TelemetryTracker />
          {siteSettings.maintenanceMessage ? (
            <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(255,125,89,0.18),rgba(57,208,255,0.16))] px-4 py-3 text-center text-sm backdrop-blur">
              {siteSettings.maintenanceMessage}
            </div>
          ) : null}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
