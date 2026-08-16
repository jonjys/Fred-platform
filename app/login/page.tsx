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
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0C] px-4">
      <div className="w-full max-w-">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black tracking-tight text-white">FRED</h1>
          <p className="mt-2 text-sm text-zinc-400">Stoppa gissningarna. Borja besluta.</p>
        </div>
        <div className="rounded- border border-[#1F1F23] bg-[#111115] p-6 shadow-2xl">
          {status === "sent"? (
            <div className="space-y-2 text-center">
              <h2 className="text-lg font-bold text-white">Kolla din inkorg</h2>
              <p className="text-sm text-zinc-400">Vi har skickat en lank till <span className="font-medium text-white">{email}</span></p>
              <p className="text-xs text-zinc-500 mt-4">Fick du inget? Kolla spam. Eller vänta 60s.</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <h2 className="text- font-bold text-white">Logga in</h2>
                <p className="text- text-zinc-400">Logga in med magic link. Inget losenord behovs.</p>
              </div>
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-200">E-post</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="du@foretag.se"
                    className="h-11 bg-[#1A1A1E] border-[#2A2A2E] text-white placeholder:text-zinc-500 focus:border-[#7A5CFA] focus:ring-[#7A5CFA] text-"
                  />
                </div>
                {error && <div className="rounded-lg bg-red-950/50 border border-red-900/50 p-3"><p className="text-sm text-red-400">{error}</p><p className="text-xs text-red-300/60 mt-1">Kolla Supabase > Auth > URL Config och SMTP</p></div>}
                <Button type="submit" className="w-full h-11 bg-[#7A5CFA] hover:bg-[#6A4CE0] text-white font-bold rounded-" disabled={status === "sending"}>
                  {status === "sending"? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Skickar...</> : "Skicka magisk lank"}
                </Button>
                <p className="text-center text- text-zinc-500">Genom att logga in godkanner du vara villkor. 14 dagar gratis.</p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
