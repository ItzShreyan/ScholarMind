import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Clock, Sparkles, Tag } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import { Article } from "@/types/blog";
import { BrandLink } from "@/components/common/BrandLink";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";

export const revalidate = 60; // revalidate at most every 60s

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog`;

  return {
    title: "Blog & Learning Guides | ScholarMind",
    description: "Explore AI study tips, revision techniques, exam prep guides, and learning insights on ScholarMind.",
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      title: "Blog & Learning Guides | ScholarMind",
      description: "Explore AI study tips, revision techniques, exam prep guides, and learning insights on ScholarMind.",
      url: canonicalUrl,
      type: "website"
    }
  };
}

async function getPublishedArticles(): Promise<Article[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Blog] Error fetching published articles:", error);
      return [];
    }

    return (data as Article[]) || [];
  } catch (err) {
    console.error("[Blog] Failed to load articles from database:", err);
    return [];
  }
}

export default async function BlogIndexPage() {
  const articles = await getPublishedArticles();

  return (
    <main className="noise relative min-h-screen overflow-x-hidden pb-16">
      {/* Background glow effects matching site landing design */}
      <div className="pointer-events-none absolute -left-20 top-16 h-72 w-72 rounded-full bg-[rgba(255,125,89,0.2)] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full bg-[rgba(57,208,255,0.18)] blur-3xl" />

      {/* Header */}
      <header className="glass sticky top-0 z-40 border-b border-white/10">
        <Container className="flex items-center justify-between py-4">
          <BrandLink href="/" subtitle="Blog & Learning Hub" />

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/auth" className={buttonVariants({ size: "sm", variant: "secondary" })}>
              Log in
            </Link>
            <Link href="/auth" className={buttonVariants({ size: "sm" })}>
              Start studying
            </Link>
          </div>
        </Container>
      </header>

      <Container className="pt-8 sm:pt-12">
        {/* Hero Banner */}
        <section className="space-y-4 text-center sm:text-left">
          <Badge className="bg-white/45">
            <Sparkles className="h-3.5 w-3.5" />
            ScholarMind Articles & Guides
          </Badge>
          <div className="max-w-3xl space-y-3">
            <h1 className="text-4xl font-semibold leading-[1.05] sm:text-5xl md:text-6xl">
              Study Smarter with Expert Guides & AI Insights
            </h1>
            <p className="muted text-base sm:text-lg">
              Practical guides on revision techniques, AI study tools, exam preparation, and grounded learning strategies.
            </p>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="mt-10 sm:mt-12">
          {articles.length === 0 ? (
            <Card className="overflow-hidden p-8 text-center sm:p-12">
              <CardContent className="space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(57,208,255,0.12)] text-[var(--accent-sky)]">
                  <BookOpen className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-semibold">No Articles Published Yet</h2>
                <p className="muted mx-auto max-w-md text-sm">
                  We are working on new study guides and articles. Check back soon or try our interactive study workspace!
                </p>
                <div className="pt-2">
                  <Link href="/auth" className={buttonVariants({ size: "md" })}>
                    Explore Study Tools
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => {
                const articleUrl = `/blog/${article.slug}${
                  article.language_code && article.language_code !== "en"
                    ? `?lang=${article.language_code}`
                    : ""
                }`;

                return (
                  <Card key={`${article.slug}-${article.language_code}`} className="group flex flex-col overflow-hidden transition-all duration-300 hover:border-white/25 hover:shadow-glass">
                    {/* Cover Image or Gradient Fallback */}
                    <Link href={articleUrl} className="relative block aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
                      {article.cover_image ? (
                        <Image
                          src={article.cover_image}
                          alt={article.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center p-6 text-center">
                          <div className="space-y-2">
                            <BookOpen className="mx-auto h-10 w-10 text-[var(--accent-sky)] opacity-80" />
                            <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                              ScholarMind Article
                            </span>
                          </div>
                        </div>
                      )}
                    </Link>

                    {/* Content */}
                    <CardHeader className="flex-1 space-y-3 p-5 sm:p-6">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {article.focus_keyword && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(57,208,255,0.12)] px-2.5 py-1 font-medium text-[var(--accent-sky)]">
                            <Tag className="h-3 w-3" />
                            {article.focus_keyword}
                          </span>
                        )}
                        {article.reading_time_minutes ? (
                          <span className="muted inline-flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            {article.reading_time_minutes} min read
                          </span>
                        ) : null}
                      </div>

                      <h2 className="text-xl font-semibold leading-snug tracking-tight text-[var(--fg)] transition-colors group-hover:text-[var(--accent-sky)]">
                        <Link href={articleUrl}>{article.title}</Link>
                      </h2>

                      {article.meta_description && (
                        <p className="muted text-sm line-clamp-3 leading-relaxed">
                          {article.meta_description}
                        </p>
                      )}
                    </CardHeader>

                    {/* Card Footer */}
                    <CardContent className="border-t border-white/10 px-5 py-4 sm:px-6">
                      <Link
                        href={articleUrl}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-sky)] transition-all group-hover:gap-2"
                      >
                        Read Article
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
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
