"use client";

import type { CSSProperties } from "react";

/** 160×160 load ring — reused from Vacuum spec for Radar Load. */
export function PressureMeter({
  load = 0.42,
  label = "RADAR LOAD",
}: {
  load?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(1, load));
  const size = 160;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped);
  const pct = Math.round(clamped * 100);

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#222226"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#3DFF8A"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div style={center}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#6E6E78" }}>
          {label}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginTop: 4 }}>{pct}%</div>
        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#3DFF8A",
          }}
        >
          LIVE
        </div>
      </div>
    </div>
  );
}

const center: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};
