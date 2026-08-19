"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, KeyboardEvent } from "react";
import { PressureMeter } from "@/components/core/PressureMeter";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const STARTERS = [
  "Vad är status på Bridge 07?",
  "Scan competitors vs GateZero",
  "Sammanfatta Vacuum 09 load",
  "Vilka slots är LIVE just nu?",
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function RadarChat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "sys",
      role: "assistant",
      content:
        "Radar 06 online. Jag är FRED OS control-plane chat — slots 01–10, Bridge, Vacuum, GateZero. Fråga eller kör en scan.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [load, setLoad] = useState(0.38);
  const [sentToFred, setSentToFred] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    const t = setInterval(() => {
      setLoad((v) => {
        const next = v + (Math.random() - 0.48) * 0.06;
        return Math.max(0.18, Math.min(0.92, next));
      });
    }, 2200);
    return () => clearInterval(t);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      const userMsg: Msg = { id: uid(), role: "user", content: trimmed };
      const assistantId = uid();
      setMessages((m) => [...m, userMsg, { id: assistantId, role: "assistant", content: "" }]);
      setInput("");
      setStreaming(true);
      setSentToFred(false);

      const history = [...messages, userMsg]
        .filter((m) => m.id !== "sys")
        .map((m) => ({ role: m.role, content: m.content }));

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch("/api/radar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "Radar offline");
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: `Radar error ${res.status}: ${errText.slice(0, 200)}` }
                : msg,
            ),
          );
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          const snapshot = acc;
          setMessages((m) =>
            m.map((msg) => (msg.id === assistantId ? { ...msg, content: snapshot } : msg)),
          );
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: "Kunde inte nå /api/radar. Försök igen." }
              : msg,
          ),
        );
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  function skickaTillFred() {
    const transcript = messages
      .filter((m) => m.content.trim())
      .map((m) => `${m.role === "user" ? "You" : "Radar"}: ${m.content}`)
      .join("\n\n");
    const payload = `FRED OS · Radar 06 context\nLoad: ${Math.round(load * 100)}%\n---\n${transcript}`;
    void navigator.clipboard?.writeText(payload);
    setSentToFred(true);
    setTimeout(() => setSentToFred(false), 2500);
  }

  return (
    <div style={shell}>
      <header style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div>
            <div style={badge}>06 · RADAR · PUBLIC</div>
            <h1 style={title}>FRED OS Chat</h1>
            <p style={sub}>Control-plane scan · slots 01–10 · no auth</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button type="button" onClick={skickaTillFred} style={fredBtn}>
            {sentToFred ? "Kopierat ✓" : "Skicka till Fred"}
          </button>
          <div className="hidden sm:block">
            <PressureMeter load={load} />
          </div>
        </div>
      </header>

      <div className="sm:hidden" style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
        <PressureMeter load={load} />
      </div>

      <div style={thread}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              ...bubble,
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "#7C5CFF" : "#111114",
              border: m.role === "user" ? "1px solid #7C5CFF" : "1px solid #222226",
              color: m.role === "user" ? "#fff" : "#EDEDE9",
            }}
          >
            <div style={roleTag}>{m.role === "user" ? "YOU" : "RADAR"}</div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, fontSize: 14 }}>
              {m.content || (streaming ? "…" : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={starterRow}>
        {STARTERS.map((s) => (
          <button key={s} type="button" style={chip} onClick={() => void send(s)} disabled={streaming}>
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} style={composer}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Fråga Radar…"
          rows={2}
          disabled={streaming}
          style={textarea}
        />
        <button type="submit" disabled={streaming || !input.trim()} style={sendBtn}>
          {streaming ? "…" : "Skicka"}
        </button>
      </form>
    </div>
  );
}

const shell: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minHeight: "calc(100vh - 120px)",
  maxWidth: 920,
};

const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const badge: CSSProperties = {
  display: "inline-flex",
  padding: "6px 12px",
  borderRadius: 999,
  background: "rgba(124,92,255,0.14)",
  border: "1px solid rgba(124,92,255,0.28)",
  fontSize: 11,
  fontWeight: 700,
  color: "#B5A4FF",
  letterSpacing: "0.06em",
};

const title: CSSProperties = {
  fontSize: 32,
  fontWeight: 800,
  letterSpacing: "-0.04em",
  marginTop: 10,
  color: "#fff",
};

const sub: CSSProperties = {
  color: "#6E6E78",
  marginTop: 6,
  fontSize: 13,
};

const fredBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  background: "#111114",
  border: "1px solid #222226",
  color: "#3DFF8A",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
  letterSpacing: "0.04em",
};

const thread: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 14,
  borderRadius: 18,
  background: "#0A0A0B",
  border: "1px solid #222226",
  minHeight: 320,
  maxHeight: "min(52vh, 520px)",
  overflowY: "auto",
};

const bubble: CSSProperties = {
  maxWidth: "92%",
  padding: "12px 14px",
  borderRadius: 14,
};

const roleTag: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  color: "#6E6E78",
  marginBottom: 6,
};

const starterRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const chip: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  background: "#111114",
  border: "1px solid #222226",
  color: "#9A9AA0",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const composer: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-end",
  padding: 12,
  borderRadius: 16,
  background: "#111114",
  border: "1px solid #222226",
};

const textarea: CSSProperties = {
  flex: 1,
  resize: "none",
  background: "transparent",
  border: "none",
  outline: "none",
  color: "#EDEDE9",
  fontSize: 14,
  lineHeight: 1.45,
  fontFamily: "inherit",
};

const sendBtn: CSSProperties = {
  padding: "12px 18px",
  borderRadius: 12,
  background: "#7C5CFF",
  border: "none",
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  flexShrink: 0,
};
