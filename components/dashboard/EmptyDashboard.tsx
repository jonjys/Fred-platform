import { Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ExampleCardProps {
  title: string;
  desc: string;
  /** template key — must match a key in config/analyze-templates.ts. Omitted for disabled cards. */
  template?: string;
  disabled?: boolean;
}

function ExampleCard({ title, desc, template, disabled }: ExampleCardProps) {
  const content = (
    <Card
      className={
        disabled
          ? "h-full cursor-not-allowed border-zinc-800 bg-zinc-900 opacity-60"
          : "h-full border-zinc-800 bg-zinc-900 transition-colors hover:bg-zinc-800"
      }
    >
      <CardHeader className="space-y-1.5 p-4 sm:p-6">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
    </Card>
  );

  if (disabled) return content;
  return <Link href={`/analyze?template=${template}`}>{content}</Link>;
}

/** Replaces the dashboard's decision grid entirely for first-time users —
 * no stats, no cards implying prior activity (that's what the old version
 * did with a lone "1" decision and a scary negative percentage; showing
 * that on an account with almost no data reads as broken, not empty). */
export function EmptyDashboard() {
  return (
    <div className="py-20 text-center">
      <Sparkles className="mx-auto h-12 w-12 text-zinc-700" />
      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-50">Inga beslut ännu</h2>
      <p className="mt-2 text-zinc-400">FRED analyserar kostnad, risk och ROI på 30 sekunder.</p>
      <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        <ExampleCard title="Omförhandla SaaS" desc="Spara 30% på molnkostnader" template="saas-purchase" />
        <ExampleCard title="Jämför leverantörer" desc="Hitta dolda avgifter" template="compare-suppliers" />
        <ExampleCard title="Refinansiera lån" desc="Kommer snart" disabled />
      </div>
      <Button asChild size="lg" className="mt-8">
        <Link href="/analyze">Skapa analys</Link>
      </Button>
    </div>
  );
}
