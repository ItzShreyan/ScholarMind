-- Migration: User audio tracks and playlists
-- Run this in Supabase SQL editor

-- User audio tracks table
create table if not exists public.user_audio_tracks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  artist text not null default 'Uploaded audio',
  file_name text not null,
  file_type text not null,
  storage_path text not null,
  duration numeric not null default 0,
  created_at timestamptz default now()
);

-- User playlists table
create table if not exists public.user_playlists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Playlist tracks join table (ordered)
create table if not exists public.user_playlist_tracks (
  id uuid primary key default uuid_generate_v4(),
  playlist_id uuid not null references public.user_playlists(id) on delete cascade,
  track_id uuid not null references public.user_audio_tracks(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz default now(),
  unique(playlist_id, track_id)
);

-- Enable RLS
alter table public.user_audio_tracks enable row level security;
alter table public.user_playlists enable row level security;
alter table public.user_playlist_tracks enable row level security;

-- RLS policies for user_audio_tracks
drop policy if exists "user_audio_tracks owner read/write" on public.user_audio_tracks;
create policy "user_audio_tracks owner read/write"
on public.user_audio_tracks for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- RLS policies for user_playlists
drop policy if exists "user_playlists owner read/write" on public.user_playlists;
create policy "user_playlists owner read/write"
on public.user_playlists for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- RLS policies for user_playlist_tracks
drop policy if exists "user_playlist_tracks owner read/write" on public.user_playlist_tracks;
create policy "user_playlist_tracks owner read/write"
on public.user_playlist_tracks for all
to authenticated
using (
  exists (
    select 1 from public.user_playlists
    where id = playlist_id and user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.user_playlists
    where id = playlist_id and user_id = auth.uid()
  )
);

-- Allow audio file uploads in storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-audio',
  'user-audio',
  false,
  52428800,
  array['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/x-m4a', 'audio/mp3']
)
on conflict (id) do nothing;

-- Storage policies for audio files
drop policy if exists "user audio read own objects" on storage.objects;
drop policy if exists "user audio insert own objects" on storage.objects;
drop policy if exists "user audio delete own objects" on storage.objects;

create policy "user audio read own objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'user-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "user audio insert own objects"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'user-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "user audio delete own objects"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'user-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Indexes
create index if not exists user_audio_tracks_user_id_idx on public.user_audio_tracks (user_id);
create index if not exists user_playlists_user_id_idx on public.user_playlists (user_id);
create index if not exists user_playlist_tracks_playlist_id_idx on public.user_playlist_tracks (playlist_id);
create index if not exists user_playlist_tracks_track_id_idx on public.user_playlist_tracks (track_id);
