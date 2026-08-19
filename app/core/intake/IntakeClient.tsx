"use client";

import { useEffect, useState } from "react";

type LogEntry = { time: string; text: string; kind: "info" | "ok" | "err" };

const LOG_COLOR: Record<LogEntry["kind"], string> = {
  info: "#6E9BFF",
  ok: "#34C759",
  err: "#FF6666",
};

export function IntakeClient({ initialShared }: { initialShared: string }) {
  const [value, setValue] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [sending, setSending] = useState(false);

  function pushLog(text: string, kind: LogEntry["kind"] = "info") {
    setLog((prev) => [...prev, { time: new Date().toLocaleTimeString("sv-SE"), text, kind }]);
  }

  async function submit(text: string) {
    if (!text.trim()) {
      pushLog("Klistra in en länk eller text först", "err");
      return;
    }
    setSending(true);
    pushLog(`Tolkar: ${text.slice(0, 60)}...`, "info");
    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const result = await response.json();
      if (result.ok) {
        pushLog(`Sparad via ${result.module}. Atom-ID: ${String(result.atom?.id ?? "").slice(0, 8)}`, "ok");
      } else {
        pushLog(result.error ?? "Okänt fel", "err");
      }
    } catch {
      pushLog("Nätverksfel — kunde inte nå Fred.", "err");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((e: Error) => pushLog(`SW-fel: ${e.message}`, "err"));
    }
    if (initialShared) {
      pushLog(`Mottaget via delning: ${initialShared.slice(0, 60)}...`, "info");
      submit(initialShared);
    } else {
      pushLog("Redo. Väntar på delning eller test.", "info");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Klistra YouTube-länk, Swish-text eller annat här"
        style={{
          width: "100%",
          height: "48px",
          background: "#111115",
          border: "1px solid #1F1F23",
          color: "#fff",
          borderRadius: "10px",
          padding: "0 14px",
          fontSize: "14px",
        }}
      />
      <button
        onClick={() => submit(value)}
        disabled={sending}
        style={{
          width: "100%",
          height: "48px",
          marginTop: "12px",
          background: "#7A5CFA",
          color: "white",
          fontWeight: 700,
          fontSize: "14px",
          borderRadius: "10px",
          border: "none",
          cursor: sending ? "default" : "pointer",
          opacity: sending ? 0.6 : 1,
        }}
      >
        {sending ? "Skickar..." : "Skicka till Fred"}
      </button>

      <div
        style={{
          marginTop: "20px",
          background: "#0E0E12",
          border: "1px solid #1E1E24",
          borderRadius: "12px",
          padding: "14px",
          fontSize: "12px",
          fontFamily: "monospace",
          maxHeight: "360px",
          overflowY: "auto",
        }}
      >
        {log.map((entry, i) => (
          <p key={i} style={{ margin: "4px 0", color: LOG_COLOR[entry.kind] }}>
            {entry.time}: {entry.text}
          </p>
        ))}
      </div>
    </div>
  );
}
