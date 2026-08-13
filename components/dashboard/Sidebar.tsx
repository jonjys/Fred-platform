"use client";

import { CircleDollarSign, History, LayoutDashboard, Menu, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { getModuleCatalogEntry } from "@/config/module-catalog";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const BASE_NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Översikt", icon: LayoutDashboard },
  { href: "/analyze", label: "Analysera", icon: Sparkles },
  { href: "/history", label: "Historik", icon: History },
];

// Hidden until debt-optimization is flipped to enabled: true in
// config/module-catalog.ts — no nav link to a module that isn't live yet.
const debtModule = getModuleCatalogEntry("debt-optimization");
const NAV_LINKS: NavLink[] =
  debtModule?.enabled && debtModule.route
    ? [...BASE_NAV_LINKS, { href: debtModule.route, label: debtModule.label, icon: CircleDollarSign }]
    : BASE_NAV_LINKS;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function resolveTitle(pathname: string): string {
  if (pathname.startsWith("/settings/billing")) return "Fakturering";
  if (pathname.startsWith("/settings")) return "Inställningar";
  if (pathname.startsWith("/analyze")) return "Analysera";
  if (pathname.startsWith("/history")) return "Historik";
  if (pathname.startsWith("/dashboard/debt")) return "Skuldoptimering";
  if (pathname.startsWith("/dashboard")) return "Översikt";
  return "FRED";
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Fixed 240px left sidebar — desktop only (lg+). Logo, nav, spacer, avatar. */
export function DesktopSidebar({ email }: { email: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-zinc-800 bg-zinc-950 lg:flex">
      <div className="flex h-14 items-center px-4">
        <Link href="/dashboard" className="text-base font-semibold tracking-tight text-zinc-50">
          FRED
        </Link>
      </div>
      <NavList />
      <div className="flex-1" />
      <div className="border-t border-zinc-800 p-3">
        <UserMenu email={email} />
      </div>
    </aside>
  );
}

/** 56px topbar shown on every breakpoint: page title on the left always; on
 * mobile it also carries the hamburger (which opens a drawer holding the nav
 * that lives in the sidebar on desktop) and the avatar (which lives in the
 * sidebar footer on desktop, so it isn't duplicated there). */
export function Topbar({ email }: { email: string }) {
  const pathname = usePathname();
  const title = resolveTitle(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Öppna meny"
            className="-ml-1 flex h-11 w-11 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-zinc-50">{title}</h1>
        </div>
        <div className="lg:hidden">
          <UserMenu email={email} />
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-zinc-800 bg-zinc-950 p-3">
            <div className="mb-2 flex h-11 items-center justify-between px-1">
              <span className="text-base font-semibold tracking-tight text-zinc-50">FRED</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Stäng meny"
                className="flex h-11 w-11 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
