import Link from "next/link";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  action?: { label: string; href: string };
}

/** Generic full-page empty state — icon + title + description, with an
 * optional primary CTA. Matches the icon/title/text/button pattern already
 * used for empty lists elsewhere (e.g. EmptyDashboard), generalized for any
 * "this doesn't exist yet" page. */
export function EmptyState({ title, description, icon: Icon, action }: EmptyStateProps) {
  return (
    <div className="py-20 text-center">
      <Icon className="mx-auto h-12 w-12 text-zinc-700" />
      <h2 className="mt-4 text-lg font-semibold text-zinc-50">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">{description}</p>
      {action && (
        <Button asChild className="mt-6">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
