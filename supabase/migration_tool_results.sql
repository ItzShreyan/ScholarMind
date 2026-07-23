-- Migration: Study tool results persistence table
-- Run this in Supabase SQL editor

create table if not exists public.study_tool_results (
  id text primary key,
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  title text not null,
  label text not null,
  preview text not null,
  output text not null,
  created_at timestamptz default now()
);

-- Enable Row-Level Security (RLS)
alter table public.study_tool_results enable row level security;

-- Owner read/write policy
drop policy if exists "tool results owner read/write" on public.study_tool_results;
create policy "tool results owner read/write"
on public.study_tool_results for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Indexes for performance
create index if not exists study_tool_results_session_user_idx
on public.study_tool_results (user_id, session_id, created_at desc);
