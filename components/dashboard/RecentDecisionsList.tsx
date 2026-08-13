import Link from "next/link";
import type { DecisionRow } from "@/lib/database/repositories/decisions";
import { isStalledProcessing } from "@/lib/decisions/status";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<DecisionRow["status"], string> = {
  draft: "Utkast",
  processing: "Bearbetar",
  completed: "Klar",
  failed: "Misslyckades",
  archived: "Arkiverad",
};

function StatusBadge({ decision }: { decision: DecisionRow }) {
  const stalled = isStalledProcessing(decision);
  const isFailed = decision.status === "failed" || stalled;
  const isCompleted = decision.status === "completed";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs font-medium",
        isFailed ? "bg-red-500/10 text-red-500" : isCompleted ? "bg-green-500/10 text-green-500" : "bg-zinc-800 text-zinc-400",
      )}
    >
      {stalled ? "Fastnat" : STATUS_LABEL[decision.status]}
    </span>
  );
}

/** Row-list for the dashboard's "Senaste beslut" section — max 5 rows,
 * title + date on the left, colored status pill on the right. The card-grid
 * layout (DecisionCard) is still used on /history where more detail (TCO
 * figures, verdict) is useful; this is the denser, glanceable version. */
export function RecentDecisionsList({ decisions }: { decisions: DecisionRow[] }) {
  return (
    <div className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
      {decisions.map((decision) => (
        <Link
          key={decision.id}
          href={`/history/${decision.id}`}
          className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-zinc-900"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-50">{decision.title}</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {new Date(decision.created_at).toLocaleDateString("sv-SE", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <StatusBadge decision={decision} />
        </Link>
      ))}
    </div>
  );
}
