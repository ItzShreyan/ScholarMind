-- Migration: spaced-repetition schedule for flashcards
--
-- Run this in the Supabase SQL editor. It is additive: no existing table,
-- column or policy is touched, so it is safe to apply to the live database
-- before the code that uses it ships.
--
-- WHY THE SHAPE IS WHAT IT IS
-- ScholarMind generates flashcards as text inside a study result
-- (`study_tool_results.output`); it has never stored one card per row. Spaced
-- repetition needs a stable identity per card, so `card_id` is a content
-- fingerprint of the card's front and back (see lib/srs.ts, cardFingerprint).
-- The same card generated in two separate studios is therefore the same card to
-- revise, which is what a student actually expects. `front` and `back` are
-- stored alongside it so a review queue can be rendered without re-parsing the
-- study result.
--
-- Column vocabulary matches every other spaced-repetition tool:
--   stability  → SM-2 ease factor (higher = easier for this student)
--   difficulty → 0–1 normalised difficulty derived from recent grades
--   reps       → consecutive successful reviews
--   lapses     → times the card was forgotten

create table if not exists public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Nullable: a card survives the studio it was generated in.
  session_id uuid references public.study_sessions(id) on delete set null,
  card_id text not null,
  front text not null,
  back text not null,
  due_at timestamptz not null default now(),
  stability real not null default 2.5,
  difficulty real not null default 0.3,
  interval_days integer not null default 0,
  last_reviewed_at timestamptz,
  reps integer not null default 0,
  lapses integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One schedule per card per student.
  unique (user_id, card_id)
);

-- Row-Level Security: a student can only ever see and change their own schedule.
alter table public.flashcard_reviews enable row level security;

drop policy if exists "flashcard reviews owner read/write" on public.flashcard_reviews;
create policy "flashcard reviews owner read/write"
on public.flashcard_reviews for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- The review queue asks "what is due for me?", and the dashboard asks
-- "how many?, so this index is the one that matters.
create index if not exists flashcard_reviews_due_idx
on public.flashcard_reviews (user_id, due_at);

-- Streak calculation reads recent review timestamps.
create index if not exists flashcard_reviews_last_reviewed_idx
on public.flashcard_reviews (user_id, last_reviewed_at desc);
