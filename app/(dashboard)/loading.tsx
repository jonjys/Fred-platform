import { Skeleton } from "@/components/ui/skeleton";

/** Wraps every page rendered through the dashboard layout — shown during
 * both the initial server fetch and client-side navigation between
 * /dashboard, /analyze, /history, and /settings while the target page's
 * data loads. Shaped like the dashboard (the most common landing target)
 * rather than a bare spinner, so the page doesn't flash empty. */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
    </div>
  );
}
