import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { HostPanel } from "@/components/host/HostPanel";
import { isHostOwner } from "@/lib/host";
import { getSiteSettings } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";

export default async function HostPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");
  if (!isHostOwner(user.email)) redirect("/dashboard");

  const [settingsResponse, eventsResponse, subscriptionsResponse] = await Promise.all([
    getSiteSettings(supabase),
    supabase
      .from("study_site_events")
      .select("id, visitor_key, user_id, user_email, event_type, page, feature, metadata, created_at")
      .gte("created_at", new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString())
      .order("created_at", { ascending: false })
      .limit(4000),
    supabase.from("study_user_subscriptions").select("plan")
  ]);

  return (
    <>
      <DashboardHeader email={user.email} />
      <HostPanel
        initialSettings={settingsResponse}
        initialEvents={eventsResponse.data ?? []}
        initialSubscriptions={subscriptionsResponse.data ?? []}
      />
    </>
  );
}
