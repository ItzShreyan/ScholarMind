import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RevisionScheduleWorkspace } from "@/components/dashboard/RevisionScheduleWorkspace";
import { getRevisionPlans, getUserSessions } from "@/lib/db/queries";

export default async function SchedulePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const [sessions, plans] = await Promise.all([getUserSessions(user.id, supabase), getRevisionPlans(user.id, supabase)]);

  return (
    <>
      <DashboardHeader email={user.email} />
      <RevisionScheduleWorkspace
        sessions={sessions.map((session) => ({ id: session.id, title: session.title }))}
        initialPlans={plans.map((plan) => ({
          id: plan.id,
          session_id: plan.session_id,
          exam_name: plan.exam_name,
          exam_date: plan.exam_date,
          cadence: plan.cadence,
          goals: plan.goals,
          plan_markdown: plan.plan_markdown,
          days: Array.isArray(plan.days) ? plan.days : [],
          current_day: plan.current_day,
          updated_at: plan.updated_at
        }))}
      />
    </>
  );
}
