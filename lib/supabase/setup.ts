export function formatSupabaseSetupError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("study_sessions")) {
    return "Saved sessions are not set up in Supabase yet. Run supabase/schema.sql in the Supabase SQL Editor to enable uploads, saved sessions, and reminders.";
  }

  if (normalized.includes("study_files")) {
    return "File storage metadata is not set up in Supabase yet. Run supabase/schema.sql in the Supabase SQL Editor, then retry the upload.";
  }

  if (normalized.includes("study_reminders")) {
    return "Reminder storage is not set up in Supabase yet. Run supabase/schema.sql in the Supabase SQL Editor to enable reminders.";
  }

  if (
    normalized.includes("bucket") ||
    normalized.includes("storage.objects") ||
    normalized.includes("storage not found")
  ) {
    return "The Supabase storage bucket `study-files` is missing or locked. Run supabase/schema.sql so the bucket and storage policies are created.";
  }

  if (normalized.includes("row-level security")) {
    return "Supabase rejected the request because the storage policies are missing or the session is not authenticated. Run supabase/schema.sql and make sure you are logged in.";
  }

  return message;
}
