import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserSessions } from "@/lib/db/queries";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const [sessions, fileCountResponse] = await Promise.all([
    getUserSessions(user.id, supabase),
    supabase.from("study_files").select("*", { count: "exact", head: true }).eq("user_id", user.id)
  ]);
  const fileCount = fileCountResponse.count ?? 0;

  return (
    <>
      <DashboardHeader email={user.email} />
      <DashboardOverview
        sessions={sessions.map((s) => ({ id: s.id, title: s.title, created_at: s.created_at }))}
        fileCount={fileCount}
      />
    </>
  );
}
