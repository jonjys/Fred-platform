"use client";

import { useEffect } from "react";

/** Catches errors thrown by the root layout itself (rare — RootLayout has no
 * data fetching), where even `app/error.tsx` can't render because it relies
 * on the root layout being intact. Must render its own <html>/<body> since
 * the root layout is what crashed. Deliberately plain (no shared UI
 * components) — if the crash is severe enough to reach here, depending on
 * more app code to render the error page is a bad bet. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled error in root layout.", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "1.5rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ maxWidth: "24rem", color: "#666" }}>
            The application failed to load. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
