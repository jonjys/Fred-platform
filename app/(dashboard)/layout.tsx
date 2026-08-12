import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";
import { ConfigErrorNotice } from "@/components/dashboard/ConfigErrorNotice";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import type { User } from "@supabase/supabase-js";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analyze", label: "Analyze" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

async function getUserSafely(): Promise<{ user: User | null; configError: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { user, configError: null };
  } catch (error) {
    // Next.js uses thrown errors as an internal control-flow signal (e.g. a
    // DynamicServerError from `cookies()` during the build's static-
    // optimization pass, or redirect()/notFound() called deeper in the
    // tree). Those must propagate untouched — only a genuine failure (bad
    // Supabase config, network error) should be handled below.
    unstable_rethrow(error);
    console.error("Failed to resolve the signed-in user in the dashboard layout.", error);
    return { user: null, configError: error instanceof Error ? error.message : "Unknown error" };
  }
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Kept out of the try/catch below on purpose: redirect() throws a Next.js
  // control-flow signal that must not be caught as if it were a real error.
  const { user, configError } = await getUserSafely();

  if (configError) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-border px-6 py-4">
          <span className="font-semibold">AI Business Decision OS</span>
        </header>
        <main className="flex-1 p-6">
          <ConfigErrorNotice title="Couldn't connect to Supabase" />
        </main>
      </div>
    );
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <span className="font-semibold">AI Business Decision OS</span>
          <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="truncate">{user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
