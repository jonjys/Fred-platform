"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/database/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = "idle" | "sending" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createSupabaseBrowserClient();
    
    // Hårdkoda URL:en så det aldrig blir fel med preview-domäner
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { 
        emailRedirectTo: 'https://fred-platform.vercel.app/auth/callback',
        shouldCreateUser: true 
      },
    });

    if (signInError) {
      setStatus("error");
      setError(signInError.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">FRED</h1>
          <p className="mt-2 text-sm text-zinc-400">Stoppa gissningarna. Börja besluta.</p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          {status === "sent"? (
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-zinc-50">Kolla din inkorg</h2>
              <p className="text-sm text-zinc-400">
                Vi har skickat en inloggningslänk till <span className="font-medium text-zinc-50">{email}</span>.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold text-zinc-50">Logga in</h2>
                <p className="text-sm text-zinc-400">Logga in med magic link. Inget lösenord behövs.</p>
              </div>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-post</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="du@foretag.se"
                    className="text-base"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={status === "sending"}>
                  {status === "sending"? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Skickar…
                    </>
                  ) : (
                    "Skicka magisk länk"
                  )}
                </Button>
                <p className="text-center text-xs text-zinc-500">
                  Genom att logga in godkänner du våra villkor. 14 dagar gratis.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}