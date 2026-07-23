import type { Metadata } from "next";
import { SeoStudyPage } from "@/components/landing/SeoStudyPage";
import { seoPages } from "@/lib/seo-page-content";

const page = seoPages.homeworkHelp;

export const metadata: Metadata = {
  title: page.metadata.title,
  description: page.metadata.description,
  keywords: page.metadata.keywords,
  openGraph: {
    title: page.metadata.title,
    description: page.metadata.description,
    type: "website"
  }
};

export default function HomeworkHelpPage() {
  return <SeoStudyPage {...page} />;
}
