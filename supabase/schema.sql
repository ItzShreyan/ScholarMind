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
  created_at timestamptz default now()
);

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

alter table public.study_sessions enable row level security;
alter table public.study_files enable row level security;
alter table public.study_reminders enable row level security;
alter table public.study_ai_usage enable row level security;

drop policy if exists "sessions owner read/write" on public.study_sessions;
drop policy if exists "files owner read/write" on public.study_files;
drop policy if exists "reminders owner read/write" on public.study_reminders;
drop policy if exists "ai usage owner read/write" on public.study_ai_usage;

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

create index if not exists study_ai_usage_user_scope_created_at_idx
on public.study_ai_usage (user_id, scope, created_at desc);

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
    'image/webp'
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
