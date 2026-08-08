// app/(dashboard)/layout.tsx
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";
import { ConfigErrorNotice } from "@/components/dashboard/ConfigErrorNotice";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import type { User } from "@supabase/supabase-js";

const NAV_LINKS = [
  { href: "/dashboard", label: "Översikt" },
  { href: "/analyze", label: "Ny Analys" },
  { href: "/history", label: "Historik" },
  { href: "/settings", label: "Inställningar" },
];

async function getUserSafely(): Promise<{ user: User | null; configError: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { user, configError: null };
  } catch (error) {
    unstable_rethrow(error);
    return { user: null, configError: error instanceof Error ? error.message : "Okänt fel" };
  }
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, configError } = await getUserSafely();

  if (configError) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 px-6 py-4">
          <span className="font-bold text-white tracking-wider">KARMA DECISION OS</span>
        </header>
        <main className="flex-1 p-6">
          <ConfigErrorNotice title="Kunde inte ansluta till Supabase" />
        </main>
      </div>
    );
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="flex items-center justify-between border-b border-slate-800/80 px-6 py-3.5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>
            <span className="font-extrabold text-white tracking-wide text-sm">KARMA DECISION OS</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-white transition-colors py-1"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-400 hidden sm:inline">{user.email}</span>
          <SignOutButton />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}
