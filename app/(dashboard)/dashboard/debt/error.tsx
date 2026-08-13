"use client";

import { CircleDollarSign } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary for /dashboard/debt — catches the stub engine's
 * "not implemented" throw (and any future real failure) instead of letting
 * it bubble into Next.js's generic error page. Framework-invoked: Next.js
 * renders this automatically when a descendant of this route segment
 * throws during render.
 */
export default function DebtError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[dashboard/debt] Render error.", error);
  }, [error]);

  return (
    <div className="py-20 text-center">
      <CircleDollarSign className="mx-auto h-12 w-12 text-zinc-700" />
      <h2 className="mt-4 text-lg font-semibold text-zinc-50">Skuldoptimering är tillfälligt nere</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
        Vi jobbar på det. Prova Modul 1 under tiden.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Button variant="secondary" onClick={reset}>
          Försök igen
        </Button>
        <Button asChild>
          <Link href="/analyze">Gå till Analysera</Link>
        </Button>
      </div>
    </div>
  );
}
