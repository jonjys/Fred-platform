"use client";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/database/supabase/client";

export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) {
      setError(err.message);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0C", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "360px", background: "#111115", border: "1px solid #1F1F23", borderRadius: "16px", padding: "24px" }}>
        <h1 style={{ color: "white", fontWeight: 900 }}>FRED</h1>
        {status === "sent" ? (
          <p style={{ color: "white" }}>Länk skickad till {email}</p>
        ) : (
          <form onSubmit={onSubmit} style={{ marginTop: "16px" }}>
            <input
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="du@foretag.se"
              type="email"
              required
              style={{ width: "100%", height: "44px", background: "#1A1A1E", border: "1px solid #2A2A2E", color: "white", borderRadius: "10px", padding: "0 12px" }}
            />
            {error && <p style={{ color: "#ff6666", fontSize: "13px", marginTop: "8px" }}>{error}</p>}
            <button
              type="submit"
              style={{ width: "100%", height: "44px", background: "#7A5CFA", color: "white", fontWeight: 700, borderRadius: "10px", marginTop: "12px" }}
            >
              {status === "sending" ? "Skickar..." : "Skicka magisk länk"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
