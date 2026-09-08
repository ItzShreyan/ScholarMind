import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  Tag
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import { Article, KeyTakeaway } from "@/types/blog";
import { BrandLink } from "@/components/common/BrandLink";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { RichStudyText } from "@/components/dashboard/RichStudyText";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardHeader } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({
  params,
  searchParams
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { lang = "en" } = await searchParams;
  const siteUrl = getSiteUrl();

  const supabase = createAdminClient();
  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("language_code", lang)
    .eq("status", "published")
    .maybeSingle();

  if (!article) {
    return {
      title: "Article Not Found | ScholarMind"
    };
  }

  const canonicalUrl = `${siteUrl}/blog/${slug}${lang !== "en" ? `?lang=${lang}` : ""}`;
  const title = article.og_title || article.title;
  const description = article.og_description || article.meta_description || article.title;
  const imageUrl = article.cover_image || undefined;

  return {
    title: `${title} | ScholarMind`,
    description,
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "article",
      images: imageUrl ? [{ url: imageUrl }] : undefined,
      publishedTime: article.created_at,
      modifiedTime: article.updated_at
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined
    }
  };
}

async function getArticle(slug: string, lang: string): Promise<Article | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .eq("language_code", lang)
      .maybeSingle();

    if (error || !data || data.status !== "published") {
      return null;
    }

    return data as Article;
  } catch (err) {
    console.error("[Blog Article] Failed to fetch article:", err);
    return null;
  }
}

async function getRelatedArticles(slugs: string[], lang: string): Promise<Article[]> {
  if (!slugs || slugs.length === 0) return [];
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .in("slug", slugs)
      .eq("language_code", lang)
      .eq("status", "published")
      .limit(6);

    if (error) {
      console.error("[Blog Article] Related articles fetch error:", error);
      return [];
    }

    return (data as Article[]) || [];
  } catch (err) {
    console.error("[Blog Article] Failed to load related articles:", err);
    return [];
  }
}

export default async function ArticlePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { lang = "en" } = await searchParams;

  const article = await getArticle(slug, lang);
  if (!article) {
    notFound();
  }

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${slug}${lang !== "en" ? `?lang=${lang}` : ""}`;

  // Fetch related articles if internal_link_slugs present
  const relatedSlugs = Array.isArray(article.internal_link_slugs) ? article.internal_link_slugs : [];
  const relatedArticles = await getRelatedArticles(relatedSlugs, lang);

  // Key takeaways extraction
  const keyTakeaways: KeyTakeaway[] = Array.isArray(article.key_takeaways) ? article.key_takeaways : [];
  const takeawaysHeading = keyTakeaways.length > 0 && keyTakeaways[0]._heading ? keyTakeaways[0]._heading : "Key Takeaways";

  // JSON-LD Article Schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.meta_description || article.title,
    image: article.cover_image ? [article.cover_image] : undefined,
    datePublished: article.created_at,
    dateModified: article.updated_at,
    mainEntityOfPage: canonicalUrl,
    author: {
      "@type": "Organization",
      name: "ScholarMind",
      url: siteUrl
    },
    publisher: {
      "@type": "Organization",
      name: "ScholarMind",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/favicon.ico`
      }
    }
  };

  const formattedDate = new Date(article.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <main className="noise relative min-h-screen overflow-x-hidden pb-16">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="glass sticky top-0 z-40 border-b border-white/10">
        <Container className="flex items-center justify-between py-4">
          <BrandLink href="/blog" subtitle="Back to Blog" />

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/auth" className={buttonVariants({ size: "sm" })}>
              Start studying
            </Link>
          </div>
        </Container>
      </header>

      <Container className="pt-6 sm:pt-10">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent-sky)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            All Articles
          </Link>
        </div>

        <article className="mx-auto max-w-4xl space-y-8">
          {/* Article Header & Metadata */}
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {article.focus_keyword && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(57,208,255,0.12)] px-3 py-1 font-semibold text-[var(--accent-sky)]">
                  <Tag className="h-3.5 w-3.5" />
                  {article.focus_keyword}
                </span>
              )}
              {article.reading_time_minutes ? (
                <span className="muted inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                  <Clock className="h-3.5 w-3.5" />
                  {article.reading_time_minutes} min read
                </span>
              ) : null}
              {article.word_count ? (
                <span className="muted inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                  <FileText className="h-3.5 w-3.5" />
                  {article.word_count} words
                </span>
              ) : null}
              <span className="muted inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                <Calendar className="h-3.5 w-3.5" />
                {formattedDate}
              </span>
            </div>

            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
              {article.title}
            </h1>

            {article.meta_description && (
              <p className="muted text-base sm:text-lg md:text-xl leading-relaxed">
                {article.meta_description}
              </p>
            )}
          </header>

          {/* Cover Image Hero */}
          {article.cover_image && (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[24px] border border-white/10 shadow-glass">
              <Image
                src={article.cover_image}
                alt={article.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1200px) 100vw, 900px"
                unoptimized
              />
            </div>
          )}

          {/* Key Takeaways Section */}
          {keyTakeaways.length > 0 && (
            <Card className="overflow-hidden border-[var(--accent-sky)]/30 bg-gradient-to-r from-[rgba(57,208,255,0.06)] to-transparent">
              <CardHeader className="p-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[var(--accent-sky)]" />
                  <h2 className="text-xl font-semibold">{takeawaysHeading}</h2>
                </div>
                <ul className="mt-4 space-y-3 text-sm sm:text-base">
                  {keyTakeaways.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-sky)]" />
                      <span>{item.takeaway}</span>
                    </li>
                  ))}
                </ul>
              </CardHeader>
            </Card>
          )}

          {/* Main Content Body */}
          <section className="glass rounded-[24px] border border-white/10 p-6 sm:p-10 shadow-glass">
            <RichStudyText content={article.content} />
          </section>

          {/* Secondary Keywords / Tags */}
          {Array.isArray(article.secondary_keywords) && article.secondary_keywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-4">
              <span className="muted text-xs font-semibold uppercase tracking-wider">Topics:</span>
              {article.secondary_keywords.map((kw, i) => (
                <span key={i} className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Related Articles Section */}
          {relatedArticles.length > 0 && (
            <section className="pt-8 space-y-6">
              <div className="border-t border-white/10 pt-8">
                <h2 className="text-2xl font-semibold">Related Articles</h2>
                <p className="muted text-sm mt-1">Further reading and related guides.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedArticles.map((rel) => {
                  const relUrl = `/blog/${rel.slug}${
                    rel.language_code && rel.language_code !== "en" ? `?lang=${rel.language_code}` : ""
                  }`;

                  return (
                    <Card key={rel.id} className="group overflow-hidden transition hover:border-white/25">
                      {rel.cover_image && (
                        <div className="relative aspect-[16/9] w-full overflow-hidden">
                          <Image
                            src={rel.cover_image}
                            alt={rel.title}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 33vw"
                            unoptimized
                          />
                        </div>
                      )}
                      <CardHeader className="p-4 space-y-2">
                        <h3 className="text-base font-semibold leading-snug group-hover:text-[var(--accent-sky)]">
                          <Link href={relUrl}>{rel.title}</Link>
                        </h3>
                        {rel.meta_description && (
                          <p className="muted text-xs line-clamp-2">{rel.meta_description}</p>
                        )}
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* CTA Banner */}
          <section className="pt-8">
            <Card className="overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-white/15">
              <CardHeader className="p-6 text-center sm:p-8 space-y-4">
                <Badge className="mx-auto bg-white/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  Turn Notes Into Action
                </Badge>
                <h2 className="text-2xl font-semibold sm:text-3xl">
                  Ready to Supercharge Your Revision?
                </h2>
                <p className="muted mx-auto max-w-xl text-sm sm:text-base">
                  Upload your study files, PDFs, or lecture notes into ScholarMind and transform them into personalized quizzes, AI summaries, and revision plans instantly.
                </p>
                <div>
                  <Link href="/auth" className={buttonVariants({ size: "lg" })}>
                    Start Studying Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </CardHeader>
            </Card>
          </section>
        </article>
      </Container>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/10 py-8">
        <Container className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Logo variant="full" size={40} />
          <div>
            <p className="muted text-xs">Scholar-first sources in. Clearer revision, diagrams, and mock exams out.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link href="/privacy" className="muted transition hover:text-[var(--fg)]">Privacy</Link>
            <Link href="/terms" className="muted transition hover:text-[var(--fg)]">Terms</Link>
            <a href="mailto:hello.minddevelopment@gmail.com" className="muted transition hover:text-[var(--accent-sky)]">
              hello.minddevelopment@gmail.com
            </a>
            <span className="muted">© {new Date().getFullYear()} ScholarMind</span>
          </div>
        </Container>
      </footer>
    </main>
  );
}
