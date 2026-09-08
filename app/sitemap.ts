import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8
    },
    {
      url: `${siteUrl}/study-tools`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8
    },
    {
      url: `${siteUrl}/flashcard-generator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8
    },
    {
      url: `${siteUrl}/quiz-maker`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8
    },
    {
      url: `${siteUrl}/revision-planner`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8
    },
    {
      url: `${siteUrl}/ai-study-assistant`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8
    },
    {
      url: `${siteUrl}/online-learning-platform`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7
    },
    {
      url: `${siteUrl}/exam-preparation`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7
    },
    {
      url: `${siteUrl}/homework-help`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7
    },
    {
      url: `${siteUrl}/study-techniques`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7
    },
    {
      url: `${siteUrl}/academic-success`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4
    }
  ];

  try {
    const supabase = createAdminClient();
    const { data: articles } = await supabase
      .from("articles")
      .select("slug, language_code, updated_at")
      .eq("status", "published");

    if (articles && articles.length > 0) {
      const articleRoutes: MetadataRoute.Sitemap = articles.map((art) => {
        const langQuery = art.language_code && art.language_code !== "en" ? `?lang=${art.language_code}` : "";
        return {
          url: `${siteUrl}/blog/${art.slug}${langQuery}`,
          lastModified: art.updated_at ? new Date(art.updated_at) : new Date(),
          changeFrequency: "monthly",
          priority: 0.9
        };
      });

      return [...staticRoutes, ...articleRoutes];
    }
  } catch (err) {
    console.error("[Sitemap] Unable to fetch published articles for sitemap:", err);
  }

  return staticRoutes;
}
