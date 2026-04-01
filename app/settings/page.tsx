import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Container } from "@/components/ui/Container";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { getUserPreferences } from "@/lib/db/queries";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const preferences = await getUserPreferences(user.id, supabase);

  return (
    <>
      <DashboardHeader email={user.email} />
      <Container className="py-6">
        <SettingsPanel email={user.email} initialPreferences={preferences} />
      </Container>
    </>
  );
}
