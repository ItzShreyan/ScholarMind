import type { Metadata } from "next";
import { ScholarMindExperience } from "@/components/landing/ScholarMindExperience";

/**
 * The landing page.
 *
 * Deliberately thin. Every word, colour and camera move lives inside
 * `ScholarMindExperience` and the modules it composes, so this file only
 * declares what the page *is* to a crawler and mounts the experience.
 *
 * The content still server-renders: `ScholarMindExperience` is a client
 * component, but its sections render to HTML on the server exactly once, so the
 * headline, every feature claim and every link are in the initial response.
 * Only the canvas arrives later.
 */

export const metadata: Metadata = {
  title: "ScholarMind | Your mind. Your world. Your way of learning.",
  description:
    "Explore your own learning world. Bring your notes together, understand difficult ideas and turn what you learn into lasting knowledge — with grounded chat, quizzes, flashcards, mock exams and revision plans.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "ScholarMind | Your mind. Your world. Your way of learning.",
    description:
      "A learning world built from your own material: library, observatory, practice grounds and a plan for the weeks before the exam."
  }
};

export default function LandingPage() {
  return <ScholarMindExperience />;
}
