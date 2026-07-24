import { getCachedSiteSettings } from "@/lib/site-settings";

/** Streams independently so the root HTML never waits on the settings table. */
export async function MaintenanceBanner() {
  const settings = await getCachedSiteSettings();
  if (!settings.maintenanceMessage) return null;

  return (
    <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(255,125,89,0.18),rgba(57,208,255,0.16))] px-4 py-3 text-center text-sm backdrop-blur">
      {settings.maintenanceMessage}
    </div>
  );
}
