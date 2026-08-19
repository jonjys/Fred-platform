"use client";

import { useEffect, useRef, useState } from "react";
import { PressureMeter } from "@/components/core/PressureMeter";

type Line = { kind: "input" | "output"; text: string };

const TOKENS = {
  bg: "#0A0A0B",
  card: "#111114",
  border: "#222226",
  live: "#3DFF8A",
  accent: "#7C5CFF",
};

const STORAGE_KEY = "fred-radar-history-v1";
const WELCOME: Line = {
  kind: "output",
  text: 'Fred Radar — kommandokonsol. Skriv "help" för kommandon.',
};

function loadHistory(): Line[] {
  if (typeof window === "undefined") return [WELCOME];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [WELCOME];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [WELCOME];
  } catch {
    return [WELCOME];
  }
}

export function RadarConsole({ load }: { load: number }) {
  const [lines, setLines] = useState<Line[]>([WELCOME]);
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLines(loadHistory());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // best-effort only — a full/unavailable localStorage shouldn't break the console
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  async function run(message: string) {
    const text = message.trim();
    if (!text || sending) return;
    setLines((prev) => [...prev, { kind: "input", text }]);
    setValue("");
    setSending(true);
    try {
      const response = await fetch("/api/radar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const result = await response.json();
      const outputLines: string[] = result.lines ?? [`Fel: oväntat svar (${response.status})`];
      setLines((prev) => [...prev, ...outputLines.map((line) => ({ kind: "output" as const, text: line }))]);
    } catch {
      setLines((prev) => [...prev, { kind: "output", text: "Nätverksfel — kunde inte nå Fred." }]);
    } finally {
      setSending(false);
    }
  }

  function copyTranscript() {
    const transcript = lines
      .map((l) => `${l.kind === "input" ? "Du" : "Radar"}: ${l.text}`)
      .join("\n\n");
    navigator.clipboard?.writeText(transcript).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      style={{
        background: TOKENS.bg,
        minHeight: "calc(100vh - 120px)",
        maxHeight: "calc(100vh - 32px)",
        borderRadius: "18px",
        border: `1px solid ${TOKENS.border}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${TOKENS.border}`,
          display: "flex",
          alignItems: "center",
          gap: "14px",
          background: TOKENS.card,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "8px",
            background: TOKENS.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            color: "#000",
            flexShrink: 0,
          }}
        >
          F
        </div>
        <div style={{ fontWeight: 700, fontSize: "13px" }}>Fred Radar</div>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: TOKENS.live,
            padding: "3px 8px",
            borderRadius: "999px",
            background: "rgba(61,255,138,0.12)",
          }}
        >
          LIVE
        </span>
        <button
          type="button"
          onClick={copyTranscript}
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: `1px solid ${TOKENS.border}`,
            color: copied ? TOKENS.live : "#9A9AA0",
            fontSize: "11px",
            fontWeight: 700,
            borderRadius: "8px",
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          {copied ? "Kopierat ✓" : "Skicka till Fred"}
        </button>
        <PressureMeter load={load} label="CORE APPS LIVE" />
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "13px",
        }}
      >
        {lines.map((line, i) =>
          line.kind === "input" ? (
            <div key={i} style={{ color: TOKENS.accent }}>
              <span style={{ color: TOKENS.live }}>&gt;</span> {line.text}
            </div>
          ) : (
            <div key={i} style={{ color: "#B4B4BC", whiteSpace: "pre-wrap" }}>
              {line.text}
            </div>
          ),
        )}
        {sending && <div style={{ color: "#5A5A62" }}>…</div>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(value);
        }}
        style={{
          display: "flex",
          gap: "10px",
          padding: "14px 20px",
          borderTop: `1px solid ${TOKENS.border}`,
          background: TOKENS.card,
        }}
      >
        <span style={{ color: TOKENS.live, fontFamily: "ui-monospace, monospace", alignSelf: "center" }}>
          &gt;
        </span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="help"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#fff",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "13px",
          }}
          autoFocus
        />
        <button
          type="submit"
          disabled={sending}
          style={{
            background: TOKENS.accent,
            color: "#000",
            fontWeight: 700,
            fontSize: "12px",
            border: "none",
            borderRadius: "8px",
            padding: "8px 14px",
            cursor: sending ? "default" : "pointer",
            opacity: sending ? 0.6 : 1,
          }}
        >
          Skicka
        </button>
      </form>
    </div>
  );
}
