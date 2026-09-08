create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  language_code text not null default 'en',
  language_name text,
  title text not null,
  content text not null,
  cover_image text,
  meta_description text,
  focus_keyword text,
  secondary_keywords jsonb default '[]'::jsonb,
  key_takeaways jsonb default '[]'::jsonb,
  word_count integer default 0,
  reading_time_minutes integer default 0,
  internal_link_slugs jsonb default '[]'::jsonb,
  website_domain text,
  og_title text,
  og_description text,
  status text not null default 'published',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint articles_slug_lang_unique unique (slug, language_code)
);

alter table public.articles enable row level security;

drop policy if exists "articles public read published" on public.articles;
create policy "articles public read published"
on public.articles for select
to anon, authenticated
using (status = 'published');

drop policy if exists "articles service role write" on public.articles;
create policy "articles service role write"
on public.articles for all
to service_role
using (true)
with check (true);

create index if not exists articles_slug_lang_idx on public.articles (slug, language_code);
create index if not exists articles_status_created_idx on public.articles (status, created_at desc);
