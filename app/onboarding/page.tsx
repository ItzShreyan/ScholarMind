import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { getOnboardingForUser } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth?next=/onboarding");

  const onboarding = await getOnboardingForUser(user.id, supabase);
  if (onboarding?.completed_at) redirect("/studio");

  return (
    <>
      <DashboardHeader email={user.email} />
      <OnboardingWizard />
    </>
  );
}
