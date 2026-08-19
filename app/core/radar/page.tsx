import { getCoreApps } from "@/lib/core-apps/registry";
import { isAppHealthy } from "@/lib/core-apps/health";
import { RadarConsole } from "@/components/core/RadarConsole";

export const dynamic = "force-dynamic";

// Slot 06 — main FRED OS chat. Static route beats /core/[appName]. Public,
// no login gate. Talks to Fred-platform's own APIs only (see
// app/api/radar/route.ts) — no external LLM.
export default async function RadarPage() {
  const apps = getCoreApps();
  const healthy = await Promise.all(apps.map((a) => isAppHealthy(a)));
  const load = apps.length > 0 ? healthy.filter(Boolean).length / apps.length : 0;

  return <RadarConsole load={load} />;
}
