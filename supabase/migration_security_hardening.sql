-- Security hardening migration for ScholarMind
-- Tightens RLS policies and restricts anonymous access

-- 1. Restrict study_site_events INSERT to authenticated users only.
-- Previously allowed anon with `with check (true)`, enabling event spam.
drop policy if exists "site events public insert" on public.study_site_events;
create policy "site events authenticated insert"
on public.study_site_events for insert
to authenticated
with check (auth.uid() = user_id);

-- 2. Restrict study_site_settings SELECT to authenticated users only.
-- Previously allowed anon to read all settings including internal limits.
drop policy if exists "site settings public read" on public.study_site_settings;
create policy "site settings authenticated read"
on public.study_site_settings for select
to authenticated
using (true);

-- 3. Add index on study_site_events user_id for faster RLS checks.
create index if not exists study_site_events_user_id_idx
on public.study_site_events (user_id);

-- 4. Verify no tables have RLS disabled.
-- Run this SELECT to audit: tables without RLS will show relrowsecurity = false.
-- select relname, relrowsecurity from pg_class
-- where relnamespace = (select oid from pg_namespace where nspname = 'public')
--   and relkind = 'r';

-- 5. Verify no SECURITY DEFINER functions can be abused.
-- Run this SELECT to audit:
-- select routine_name, security_type from information_schema.routines
-- where routine_schema = 'public' and security_type = 'DEFINER';
