import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserSessions } from "@/lib/db/queries";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { ReviewSummaryCard } from "@/components/dashboard/ReviewSummaryCard";
import { FocusMusicDock } from "@/components/dashboard/FocusMusicDock";
import { loadReviewStats, type ReviewStats } from "@/lib/reviews/queries";

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

  /*
   * Revision is real, stored data — or it is absent. If the spaced-repetition
   * migration has not been applied yet, the dashboard must still load, so the
   * failure is swallowed here and the card simply does not appear. No streak or
   * due count is ever invented to fill the space.
   */
  let reviewStats: ReviewStats | null = null;
  try {
    reviewStats = await loadReviewStats(supabase, user.id);
  } catch {
    reviewStats = null;
  }

  return (
    <>
      <DashboardHeader
        email={user.email}
        firstName={typeof user.user_metadata?.first_name === "string" ? user.user_metadata.first_name : undefined}
      />
      <DashboardOverview
        sessions={sessions.map((s) => ({ id: s.id, title: s.title, created_at: s.created_at }))}
        fileCount={fileCount}
        reviewSummary={reviewStats ? <ReviewSummaryCard stats={reviewStats} /> : null}
      />
      <FocusMusicDock />
    </>
  );
}
