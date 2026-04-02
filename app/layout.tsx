import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { TelemetryTracker } from "@/components/providers/TelemetryTracker";

export const metadata: Metadata = {
  title: "ScholarMind - AI Study Companion",
  description:
    "Upload notes, chat with documents, generate quizzes and flashcards, and master topics with AI."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
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
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
