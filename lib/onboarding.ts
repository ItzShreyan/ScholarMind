import { createClient } from "@/lib/supabase/server";
export type { OnboardingRecord } from "@/lib/onboarding-profile";
export { onboardingSummary } from "@/lib/onboarding-profile";
export { onboardingOptions } from "@/lib/onboarding-options";
import type { OnboardingRecord } from "@/lib/onboarding-profile";

type AppSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function getOnboardingForUser(userId: string, existingClient?: AppSupabaseClient) {
  const supabase = existingClient ?? (await createClient());
  const { data, error } = await supabase
    .from("study_user_onboarding")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return null;
  return data as OnboardingRecord | null;
}

export async function hasCompletedOnboarding(userId: string, existingClient?: AppSupabaseClient) {
  const onboarding = await getOnboardingForUser(userId, existingClient);
  return Boolean(onboarding?.completed_at);
}
