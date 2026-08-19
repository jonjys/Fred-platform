"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type CoreNavItem = {
  n: string;
  label: string;
  href: string | null;
};

export const CORE_NAV: CoreNavItem[] = [
  { n: "01", label: "Architecture", href: "/core" },
  { n: "02", label: "Intake", href: "/core/intake" },
  { n: "03", label: "Invoice", href: "/core/invoice" },
  { n: "04", label: "GateZero", href: "/core/gatezero" },
  { n: "05", label: "Debt Lab", href: "/core/debt-optimizer" },
  { n: "06", label: "Radar", href: "/core/radar" },
  { n: "07", label: "Bridge", href: "/core/promptslaktaren" },
  { n: "08", label: "Cast", href: "/core/cast" },
  { n: "09", label: "Vacuum", href: "/core/vacuum" },
  { n: "10", label: "Analyze", href: "/analyze" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/core") return pathname === "/core";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CoreSidebarNav({ layout }: { layout: "sidebar" | "topbar" }) {
  const pathname = usePathname() ?? "";
  const horizontal = layout === "topbar";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: horizontal ? "row" : "column",
        gap: horizontal ? "6px" : "2px",
        ...(horizontal ? {} : { padding: "0 12px" }),
      }}
    >
      {CORE_NAV.map((item) => {
        const active = item.href ? isActive(pathname, item.href) : false;
        const disabled = item.href === null;

        const content = (
          <>
            <span
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "11px",
                fontWeight: 600,
                color: disabled ? "#3A3A44" : active ? "#7AA2FF" : "#4A4A54",
                letterSpacing: "0.02em",
              }}
            >
              {item.n}
            </span>
            <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>
          </>
        );

        const style: React.CSSProperties = {
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: horizontal ? "8px 12px" : "10px 12px",
          borderRadius: "10px",
          background: active ? "#15151A" : "transparent",
          fontSize: horizontal ? "12px" : "13px",
          fontWeight: 600,
          color: disabled ? "#4A4A54" : active ? "#fff" : "#6E6E78",
          textDecoration: "none",
          cursor: disabled ? "default" : "pointer",
        };

        if (disabled) {
          return (
            <div key={item.n} style={style} aria-disabled="true">
              {content}
            </div>
          );
        }

        return (
          <Link key={item.n} href={item.href as string} style={style}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
