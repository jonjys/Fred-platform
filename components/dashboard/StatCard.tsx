import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  subtext,
  valueClassName,
}: {
  label: string;
  value: string;
  subtext?: string;
  valueClassName?: string;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <div className="space-y-1 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <p className={cn("font-mono text-3xl font-semibold text-zinc-50", valueClassName)}>{value}</p>
        {subtext && <p className="text-xs text-zinc-500">{subtext}</p>}
      </div>
    </Card>
  );
}
