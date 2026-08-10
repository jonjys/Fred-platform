import { Loader2 } from "lucide-react";

/** Wraps every page rendered through the dashboard layout — shown during
 * both the initial server fetch and client-side navigation between
 * /dashboard, /analyze, /history, and /settings while the target page's
 * data loads. */
export default function DashboardLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-12 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}
