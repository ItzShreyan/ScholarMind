import { redirect } from "next/navigation";
import { BellRing, LogOut, Palette, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

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
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-coral)]">
                Account
              </p>
              <h1 className="text-4xl font-semibold">Your profile and study setup.</h1>
              <p className="muted text-sm">
                Quick controls for the refreshed workspace and the account behind it.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-[24px] bg-white/20 px-4 py-4">
                <p className="muted text-xs">Email</p>
                <p className="mt-1 font-medium">{user.email}</p>
              </div>
              <form action="/auth/signout" method="post">
                <Button type="submit" variant="secondary" size="lg" className="w-full justify-center">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="space-y-2">
                <Palette className="h-5 w-5 text-[var(--accent-sky)]" />
                <p className="text-sm font-semibold">Preferences</p>
              </CardHeader>
              <CardContent className="muted text-sm">
                Theme switching is in the top bar now so light and dark modes are always one tap away.
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-2">
                <BellRing className="h-5 w-5 text-[var(--accent-coral)]" />
                <p className="text-sm font-semibold">Reminders</p>
              </CardHeader>
              <CardContent className="muted text-sm">
                The studio can now set simple spaced-review reminders straight from the quick actions panel.
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="space-y-2">
                <ShieldCheck className="h-5 w-5 text-[var(--accent-mint)]" />
                <p className="text-sm font-semibold">Security</p>
              </CardHeader>
              <CardContent className="muted text-sm">
                Your sessions stay behind authenticated access. If you ever need to step away from a shared
                device, use sign out here.
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </>
  );
}

