"use client";

import { CreditCard, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createSupabaseBrowserClient } from "@/lib/database/supabase/client";
import { cn } from "@/lib/utils";

function initialsFromEmail(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

/** FK-avatar dropdown — trigger is a bare 32px zinc-800 circle with the
 * user's initials, opening a zinc-900 menu (Konto, Fakturering, Logga ut).
 * Used both in the desktop sidebar footer and the mobile topbar. */
export function UserMenu({ email }: { email: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Kontomeny"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-50 outline-none transition-colors hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {initialsFromEmail(email)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[200px] rounded-lg border border-zinc-800 bg-zinc-900 p-1 shadow-none"
      >
        <DropdownMenuItem asChild className={itemClass()}>
          <Link href="/settings">
            <User className="h-4 w-4" />
            Konto
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={itemClass()}>
          <Link href="/settings/billing">
            <CreditCard className="h-4 w-4" />
            Fakturering
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 bg-zinc-800" />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isPending}
          className={cn(itemClass(), "text-red-500 focus:text-red-500")}
        >
          <LogOut className="h-4 w-4" />
          {isPending ? "Loggar ut…" : "Logga ut"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function itemClass(): string {
  return "flex h-8 items-center gap-2 rounded px-2 text-sm text-zinc-200 focus:bg-zinc-800 focus:text-zinc-200 cursor-pointer";
}
