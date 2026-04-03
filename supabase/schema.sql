create extension if not exists "uuid-ossp";

create table if not exists public.study_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz default now()
);

create table if not exists public.study_files (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  storage_path text not null,
  extracted_text text not null default '',
  source_enabled boolean not null default true,
  created_at timestamptz default now()
);

alter table public.study_files
add column if not exists source_enabled boolean not null default true;

create table if not exists public.study_reminders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  reminder_at timestamptz not null,
  message text not null,
  done boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.study_ai_usage (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_key text not null,
  scope text not null check (scope in ('general', 'exam')),
  created_at timestamptz default now()
);

create table if not exists public.study_user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  playful_motion boolean not null default true,
  remember_last_studio boolean not null default true,
  last_studio_id uuid references public.study_sessions(id) on delete set null,
  default_tool text not null default 'summary' check (default_tool in ('summary', 'flashcards', 'quiz', 'exam', 'insights', 'hard_mode', 'study_plan', 'concepts')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.study_revision_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  exam_name text not null,
  exam_date date not null,
  cadence text not null check (cadence in ('daily', 'weekly')),
  goals text not null default '',
  plan_markdown text not null default '',
  days jsonb not null default '[]'::jsonb,
  current_day integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.study_user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.study_site_events (
  id uuid primary key default uuid_generate_v4(),
  visitor_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  event_type text not null check (event_type in ('page_view', 'feature_use', 'source_search', 'source_import')),
  page text,
  feature text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.study_site_settings (
  id boolean primary key default true check (id = true),
  ai_daily_limit integer not null default 20 check (ai_daily_limit >= 1 and ai_daily_limit <= 200),
  ai_hourly_limit integer not null default 8 check (ai_hourly_limit >= 0 and ai_hourly_limit <= 100),
  exam_weekly_limit integer not null default 3 check (exam_weekly_limit >= 1 and exam_weekly_limit <= 20),
  research_mode_locked boolean not null default true,
  maintenance_message text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.study_sessions enable row level security;
alter table public.study_files enable row level security;
alter table public.study_reminders enable row level security;
alter table public.study_ai_usage enable row level security;
alter table public.study_user_preferences enable row level security;
alter table public.study_revision_plans enable row level security;
alter table public.study_user_subscriptions enable row level security;
alter table public.study_site_events enable row level security;
alter table public.study_site_settings enable row level security;

drop policy if exists "sessions owner read/write" on public.study_sessions;
drop policy if exists "files owner read/write" on public.study_files;
drop policy if exists "reminders owner read/write" on public.study_reminders;
drop policy if exists "ai usage owner read/write" on public.study_ai_usage;
drop policy if exists "preferences owner read/write" on public.study_user_preferences;
drop policy if exists "revision plans owner read/write" on public.study_revision_plans;
drop policy if exists "subscriptions host read/write" on public.study_user_subscriptions;
drop policy if exists "site events public insert" on public.study_site_events;
drop policy if exists "site events host read" on public.study_site_events;
drop policy if exists "site settings public read" on public.study_site_settings;
drop policy if exists "site settings host write" on public.study_site_settings;

create policy "sessions owner read/write"
on public.study_sessions for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "files owner read/write"
on public.study_files for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "reminders owner read/write"
on public.study_reminders for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "ai usage owner read/write"
on public.study_ai_usage for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "preferences owner read/write"
on public.study_user_preferences for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "revision plans owner read/write"
on public.study_revision_plans for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "subscriptions host read/write"
on public.study_user_subscriptions for all
to authenticated
using (coalesce(auth.jwt() ->> 'email', '') = 'shreyanmadi@gmail.com')
with check (coalesce(auth.jwt() ->> 'email', '') = 'shreyanmadi@gmail.com');

create policy "site events public insert"
on public.study_site_events for insert
to anon, authenticated
with check (true);

create policy "site events host read"
on public.study_site_events for select
to authenticated
using (coalesce(auth.jwt() ->> 'email', '') = 'shreyanmadi@gmail.com');

create policy "site settings public read"
on public.study_site_settings for select
to anon, authenticated
using (true);

create policy "site settings host write"
on public.study_site_settings for all
to authenticated
using (coalesce(auth.jwt() ->> 'email', '') = 'shreyanmadi@gmail.com')
with check (coalesce(auth.jwt() ->> 'email', '') = 'shreyanmadi@gmail.com');

create index if not exists study_ai_usage_user_scope_created_at_idx
on public.study_ai_usage (user_id, scope, created_at desc);

create index if not exists study_revision_plans_user_created_at_idx
on public.study_revision_plans (user_id, created_at desc);

create index if not exists study_site_events_created_at_idx
on public.study_site_events (created_at desc);

create index if not exists study_site_events_type_created_at_idx
on public.study_site_events (event_type, created_at desc);

insert into public.study_site_settings (id, ai_daily_limit, ai_hourly_limit, exam_weekly_limit, research_mode_locked, maintenance_message)
values (true, 20, 8, 3, true, '')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-files',
  'study-files',
  false,
  52428800,
  array[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/tiff',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do nothing;

drop policy if exists "study files read own objects" on storage.objects;
drop policy if exists "study files insert own objects" on storage.objects;
drop policy if exists "study files update own objects" on storage.objects;
drop policy if exists "study files delete own objects" on storage.objects;

create policy "study files read own objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'study-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "study files insert own objects"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'study-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "study files update own objects"
on storage.objects for update
to authenticated
using (
  bucket_id = 'study-files'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'study-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "study files delete own objects"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'study-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);
