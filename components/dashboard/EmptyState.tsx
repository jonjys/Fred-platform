import { FileText, GitCompare, RefreshCw, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Example {
  icon: LucideIcon;
  title: string;
  description: string;
  /** template key — must match a key in config/analyze-templates.ts */
  template: string;
}

const EXAMPLES: Example[] = [
  {
    icon: FileText,
    title: "Analyze SaaS purchase",
    description: "Should you buy this subscription? Get the real 1yr/3yr cost.",
    template: "saas-purchase",
  },
  {
    icon: GitCompare,
    title: "Compare suppliers",
    description: "Weigh two or more vendor offers side by side.",
    template: "compare-suppliers",
  },
  {
    icon: RefreshCw,
    title: "Check contract renewal",
    description: "See if renewing is still the best option before you sign.",
    template: "contract-renewal",
  },
];

/** Replaces the dashboard's plain "no decisions yet" text for first-time
 * users — three concrete starting points, each prefilling /analyze via the
 * `template` query param (config/analyze-templates.ts) rather than a blank
 * form. */
export function EmptyState() {
  return (
    <div className="space-y-4 py-8">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Run your first analysis</h2>
        <p className="text-muted-foreground">Pick a starting point — FRED fills in the rest.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {EXAMPLES.map((example) => (
          <Link key={example.template} href={`/analyze?template=${example.template}`}>
            <Card className="h-full transition-colors hover:bg-secondary/40">
              <CardHeader className="space-y-3">
                <example.icon className="h-6 w-6 text-primary" />
                <div className="space-y-1.5">
                  <CardTitle className="text-base">{example.title}</CardTitle>
                  <CardDescription>{example.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
