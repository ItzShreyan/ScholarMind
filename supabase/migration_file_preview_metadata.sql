-- Preserve original files and their canonical MIME metadata for cross-device previews.
-- Run this in the Supabase SQL editor for existing projects.
update storage.buckets
set allowed_mime_types = array[
  'application/pdf', 'text/plain', 'text/markdown', 'application/json', 'application/xml', 'application/yaml', 'application/x-yaml', 'application/rtf', 'text/xml', 'text/yaml', 'text/rtf', 'text/html', 'text/csv', 'text/tab-separated-values',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.oasis.opendocument.presentation',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif',
  'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/flac', 'audio/aac'
]
where id = 'study-files';
