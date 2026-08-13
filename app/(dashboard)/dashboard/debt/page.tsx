import { CircleDollarSign } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { getModuleCatalogEntry } from "@/config/module-catalog";

/**
 * Skuldoptimering's dedicated page — reachable at /dashboard/debt once
 * config/module-catalog.ts's "debt-optimization" entry is enabled (the nav
 * link is hidden until then, but the route itself isn't gated, so this
 * still needs its own not-live-yet state rather than 404ing).
 */
export default function DebtPage() {
  const moduleEntry = getModuleCatalogEntry("debt-optimization");

  if (!moduleEntry?.enabled) {
    return (
      <EmptyState
        title="Skuldoptimering"
        description="Denna modul aktiveras snart. Just nu fixar vi de sista buggarna i kalkylmotorn."
        icon={CircleDollarSign}
      />
    );
  }

  if (!moduleEntry.engine) {
    return (
      <EmptyState title="Motorn laddas" description="Backend kopplas in inom kort." icon={CircleDollarSign} />
    );
  }

  return null;
}
