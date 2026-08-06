import { AlertTriangle } from "lucide-react";

/**
 * Shown instead of crashing the whole server render whenever a page can't
 * reach Supabase — missing env vars, or `lib/database/schema.sql` not yet
 * applied to the project. A raw uncaught exception here produces Next.js's
 * opaque "server-side exception" digest page with no actionable detail;
 * this at least tells the operator what to check.
 */
export function ConfigErrorNotice({ title = "Something went wrong loading this page" }: { title?: string }) {
  return (
    <div className="mx-auto mt-12 max-w-lg space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-center gap-2 font-medium text-destructive">
        <AlertTriangle className="h-5 w-5" />
        {title}
      </div>
      <p className="text-sm text-muted-foreground">
        This usually means either the Supabase environment variables aren&apos;t configured for this deployment, or{" "}
        <code className="rounded bg-secondary px-1 py-0.5">lib/database/schema.sql</code> hasn&apos;t been applied
        to the connected Supabase project yet.
      </p>
      <p className="text-sm text-muted-foreground">
        Check <code className="rounded bg-secondary px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code> /{" "}
        <code className="rounded bg-secondary px-1 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in the project&apos;s
        environment variables, and the Vercel deployment&apos;s server logs for the underlying error.
      </p>
    </div>
  );
}
