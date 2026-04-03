import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionFiles, getUserSessions } from "@/lib/db/queries";
import { StudyWorkspace } from "@/components/dashboard/StudyWorkspace";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { getSiteSettings } from "@/lib/site-settings";

export default async function WorkspaceSessionPage({
  params
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const sessions = await getUserSessions(user.id, supabase);
  const hasSession = sessions.some((session) => session.id === sessionId);
  if (!hasSession) redirect("/studio");

  const [files, siteSettings] = await Promise.all([
    getSessionFiles(sessionId, user.id, supabase),
    getSiteSettings(supabase)
  ]);

  return (
    <>
      <DashboardHeader email={user.email} />
      <StudyWorkspace
        sessions={sessions.map((s) => ({ id: s.id, title: s.title }))}
        initialSessionId={sessionId}
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
