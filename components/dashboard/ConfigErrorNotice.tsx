import { AlertTriangle } from "lucide-react";

/**
 * Shown instead of crashing the whole server render whenever a page can't
 * reach Supabase — missing env vars, or `lib/database/schema.sql` not yet
 * applied to the project. A raw uncaught exception here produces Next.js's
 * opaque "server-side exception" digest page with no actionable detail;
 * this at least tells the operator what to check.
 */
export function ConfigErrorNotice({ title = "Något gick fel när sidan skulle laddas" }: { title?: string }) {
  return (
    <div className="mx-auto mt-12 max-w-lg space-y-3 rounded-lg border border-red-500/20 bg-red-500/10 p-6">
      <div className="flex items-center gap-2 font-medium text-red-500">
        <AlertTriangle className="h-5 w-5" />
        {title}
      </div>
      <p className="text-sm text-zinc-400">
        Det här beror oftast på att Supabase-miljövariablerna inte är konfigurerade för den här driftsättningen,
        eller att <code className="rounded bg-zinc-800 px-1 py-0.5">lib/database/schema.sql</code> ännu inte har
        körts mot det anslutna Supabase-projektet.
      </p>
      <p className="text-sm text-zinc-400">
        Kontrollera <code className="rounded bg-zinc-800 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code> /{" "}
        <code className="rounded bg-zinc-800 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> i projektets
        miljövariabler, samt Vercel-driftsättningens serverloggar för det underliggande felet.
      </p>
    </div>
  );
}
