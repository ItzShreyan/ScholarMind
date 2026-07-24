-- Make uploaded music playable across sessions and devices.
-- Run this in the Supabase SQL editor for existing projects.
update storage.buckets
set allowed_mime_types = array[
  'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/flac', 'audio/aac',
  'audio/x-m4a', 'audio/mp3', 'audio/mpeg3', 'audio/x-wav', 'audio/x-mpeg'
]
where id = 'user-audio';

drop policy if exists "user audio read own objects" on storage.objects;
create policy "user audio read own objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'user-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);
