import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Container } from "@/components/ui/Container";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  return (
    <>
      <DashboardHeader email={user.email} />
      <Container className="py-6">
        <SettingsPanel email={user.email} />
      </Container>
    </>
  );
}
