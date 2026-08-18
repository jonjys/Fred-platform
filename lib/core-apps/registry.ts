export type CoreAppCategory = "BUSINESS" | "INFRA";

export interface CoreAppEntry {
  id: string;
  name: string;
  tag: string;
  desc: string;
  accent: string;
  category: CoreAppCategory;
  url?: string;
  healthPath: string;
  embedPath: string;
}

const DEFINITIONS: Omit<CoreAppEntry, "url">[] = [
  {
    id: "invoice",
    name: "Fred Invoice",
    tag: "Billing",
    desc: "Fakturera pa 30 sekunder med Swish-lank",
    accent: "#00E5FF",
    category: "BUSINESS",
    healthPath: "/api/health",
    embedPath: "/",
  },
  {
    id: "radar",
    name: "Fred Radar",
    tag: "Intelligence",
    desc: "Track prices, suppliers & market",
    accent: "#BFFF00",
    category: "BUSINESS",
    healthPath: "/api/health",
    embedPath: "/quiz",
  },
  {
    id: "cast",
    name: "FredCast",
    tag: "Content OS",
    desc: "Voice & video - podcast factory",
    accent: "#8B5CF6",
    category: "BUSINESS",
    healthPath: "/api/health",
    embedPath: "/connect",
  },
  {
    id: "debt-optimizer",
    name: "Debt Optimizer",
    tag: "Finance",
    desc: "Optimize interest, payments & cashflow",
    accent: "#FF4D8D",
    category: "BUSINESS",
    healthPath: "/api/health",
    embedPath: "/",
  },
  {
    id: "gatezero",
    name: "GateZero",
    tag: "Zero Trust Gateway",
    desc: "Entry, auth & approval - API gateway",
    accent: "#FF6B00",
    category: "INFRA",
    healthPath: "/api/health",
    embedPath: "/gate",
  },
  {
    id: "promptslaktaren",
    name: "Promptslaktaren",
    tag: "AI Control Plane",
    desc: "Prompt orchestration & API keys",
    accent: "#FFFFFF",
    category: "INFRA",
    healthPath: "/api/health",
    embedPath: "/",
  },
];

const ENV_VAR_BY_ID: Record<string, string> = {
  invoice: "NEXT_PUBLIC_SNABBFAKTURA_URL",
  radar: "NEXT_PUBLIC_FREDRADAR_URL",
  cast: "NEXT_PUBLIC_FREDCAST_URL",
  "debt-optimizer": "NEXT_PUBLIC_DEBT_OPTIMIZER_URL",
  gatezero: "NEXT_PUBLIC_GATEZERO_URL",
  promptslaktaren: "NEXT_PUBLIC_PROMPTSLAKTAREN_URL",
};

const FALLBACK_URL_BY_ID: Record<string, string> = {
  invoice: "https://snabbfaktura.vercel.app",
  radar: "https://fred-radar.vercel.app",
  cast: "https://fred-cast.vercel.app",
  "debt-optimizer": "https://debt-optimizer-standalone.vercel.app",
  gatezero: "https://gatekeeper-beta-three.vercel.app",
  promptslaktaren: "https://promptslaktaren.vercel.app",
};

/** Strip spaces, %20, comments and quotes. Only accept http(s) origins. */
export function sanitizePublicUrl(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  let s = String(raw).trim().replace(/^['"]+|['"]+$/g, "");
  s = s.split(/\s+/)[0] || "";
  s = s.replace(/%20/gi, "");
  try {
    s = decodeURI(s);
  } catch {
    /* keep as-is */
  }
  s = s.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(s)) return undefined;
  try {
    const u = new URL(s);
    if (!u.hostname || /\s/.test(u.href)) return undefined;
    return `${u.protocol}//${u.host}`;
  } catch {
    return undefined;
  }
}

export function getCoreApps(): CoreAppEntry[] {
  return DEFINITIONS.map((def) => {
    const envVar = ENV_VAR_BY_ID[def.id];
    const envUrl = envVar ? sanitizePublicUrl(process.env[envVar]) : undefined;
    return {
      ...def,
      url: envUrl || FALLBACK_URL_BY_ID[def.id],
    };
  });
}

export function getCoreApp(id: string): CoreAppEntry | undefined {
  return getCoreApps().find((app) => app.id === id);
}

export { FALLBACK_URL_BY_ID, ENV_VAR_BY_ID };
