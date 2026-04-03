import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionFiles, getUserSessions } from "@/lib/db/queries";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StudyWorkspace } from "@/components/dashboard/StudyWorkspace";
import { getSiteSettings } from "@/lib/site-settings";

export default async function StudioPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  let sessions = await getUserSessions(user.id, supabase);
  if (!sessions.length) {
    const { data } = await supabase
      .from("study_sessions")
      .insert([{ user_id: user.id, title: "My First Studio" }])
      .select("*")
      .single();
    sessions = data ? [data] : [];
  }

  const activeSessionId = sessions[0]?.id || null;
  const [files, siteSettings] = await Promise.all([
    activeSessionId ? getSessionFiles(activeSessionId, user.id, supabase) : Promise.resolve([]),
    getSiteSettings(supabase)
  ]);

  return (
    <>
      <DashboardHeader email={user.email} />
      <StudyWorkspace
        sessions={sessions.map((s) => ({ id: s.id, title: s.title }))}
        initialSessionId={activeSessionId}
        siteSettings={siteSettings}
        initialFiles={files.map((f) => ({
          id: f.id,
          file_name: f.file_name,
          extracted_text: f.extracted_text,
          file_type: f.file_type,
          storage_path: f.storage_path,
          source_enabled: f.source_enabled
        }))}
      />
    </>
  );
}

