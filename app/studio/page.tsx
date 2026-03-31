import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionFiles, getUserSessions } from "@/lib/db/queries";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StudyWorkspace } from "@/components/dashboard/StudyWorkspace";

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
      .insert([{ user_id: user.id, title: "My First Session" }])
      .select("*")
      .single();
    sessions = data ? [data] : [];
  }

  const activeSessionId = sessions[0]?.id || null;
  const files = activeSessionId ? await getSessionFiles(activeSessionId, user.id, supabase) : [];

  return (
    <>
      <DashboardHeader email={user.email} />
      <StudyWorkspace
        sessions={sessions.map((s) => ({ id: s.id, title: s.title }))}
        initialSessionId={activeSessionId}
        initialFiles={files.map((f) => ({
          id: f.id,
          file_name: f.file_name,
          extracted_text: f.extracted_text
        }))}
      />
    </>
  );
}

