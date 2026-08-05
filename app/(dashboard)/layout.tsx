import type { ReactNode } from "react";

/**
 * Intentionally minimal — the core intelligence layer (deterministic engine,
 * AI layer, API pipeline) comes first. This shell exists only so the
 * dashboard routes build; real navigation/branding is the Dashboard UI
 * milestone.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border px-6 py-4">
        <span className="font-semibold">AI Business Decision OS</span>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
