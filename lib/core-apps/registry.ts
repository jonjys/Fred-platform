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
}

/** Static metadata for every app embeddable under /core/[appName]. The
 * actual URL is resolved from its env var at call time (see ENV_VAR_BY_ID)
 * rather than baked in here, so tests can set process.env before calling. */
const DEFINITIONS: Omit<CoreAppEntry, "url">[] = [
  {
    id: "invoice",
    name: "Fred Invoice",
    tag: "Billing",
    desc: "Fakturera på 30 sekunder med Swish-länk",
    accent: "#00E5FF",
    category: "BUSINESS",
    healthPath: "/api/health",
  },
  {
    id: "radar",
    name: "Fred Radar",
    tag: "Intelligence",
    desc: "Track prices, suppliers & market",
    accent: "#BFFF00",
    category: "BUSINESS",
    healthPath: "/api/health",
  },
  {
    id: "cast",
    name: "FredCast",
    tag: "Content OS",
    desc: "Voice & video - podcast factory",
    accent: "#8B5CF6",
    category: "BUSINESS",
    healthPath: "/api/health",
  },
  {
    id: "debt-optimizer",
    name: "Debt Optimizer",
    tag: "Finance",
    desc: "Optimize interest, payments & cashflow",
    accent: "#FF4D8D",
    category: "BUSINESS",
    healthPath: "/api/health",
  },
  {
    id: "gatezero",
    name: "GateZero",
    tag: "Zero Trust Gateway",
    desc: "Entry, auth & approval - API gateway",
    accent: "#FF6B00",
    category: "INFRA",
    healthPath: "/api/health",
  },
  {
    id: "promptslaktaren",
    name: "Promptslaktaren",
    tag: "AI Control Plane",
    desc: "Prompt orchestration & API keys",
    accent: "#FFFFFF",
    category: "INFRA",
    healthPath: "/api/health",
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

export function getCoreApps(): CoreAppEntry[] {
  return DEFINITIONS.map((def) => {
    const envVar = ENV_VAR_BY_ID[def.id];
    return {
      ...def,
      url: (envVar ? process.env[envVar] : undefined) || undefined,
    };
  });
}

export function getCoreApp(id: string): CoreAppEntry | undefined {
  return getCoreApps().find((app) => app.id === id);
}
