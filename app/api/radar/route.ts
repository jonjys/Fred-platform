import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { listDecisionsForUser } from "@/lib/database/repositories/decisions";
import { getProfile } from "@/lib/database/repositories/profiles";
import { getCoreApps } from "@/lib/core-apps/registry";
import { isAppHealthy } from "@/lib/core-apps/health";

// Radar 06 command console. Talks to Fred-platform's own APIs only —
// no external LLM, no ANTHROPIC_API_KEY. Public surface (CORE_REQUIRES_AUTH=false).
// Streams NDJSON lines so the UI can render progressively.

const HELP = [
  "Tillgängliga kommandon:",
  "  help              — den här listan",
  "  status            — LIVE/SOON-status för /core-appar",
  "  beslut / decisions— dina 5 senaste beslut (kräver inloggning)",
  "  saldo             — krediter & abonnemang (kräver inloggning)",
  "  tolls             — kända Bridge-tullsatser (statiska, ej live)",
  "  vacuum status     — Vacuum 09-koppling (ej ansluten)",
  "  bridge stop       — Bridge kill-switch (avstängd i konsolen)",
];

async function handleStatus(): Promise<string[]> {
  let apps;
  try {
    apps = getCoreApps();
  } catch {
    return ["Kunde inte läsa app-registret."];
  }
  const withStatus = await Promise.all(
    apps.map(async (a) => ({ ...a, live: await isAppHealthy(a) })),
  );
  return [
    "/core-appar:",
    ...withStatus.map((a) => `  ${a.live ? "LIVE" : "SOON"}  ${a.name}`),
  ];
}

async function handleDecisions(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return ["Logga in krävs för det här kommandot."];

  const decisions = await listDecisionsForUser(supabase, { limit: 5 });
  if (decisions.length === 0) return ["Inga beslut ännu. Full historik: /history"];
  return [
    "Dina senaste beslut:",
    ...decisions.map(
      (d) =>
        `  [${d.status}] ${d.module_key} — ${new Date(d.created_at).toLocaleDateString("sv-SE")}`,
    ),
    "Full historik: /history",
  ];
}

async function handleBalance(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return ["Logga in krävs för det här kommandot."];

  const profile = await getProfile(supabase, session.user.id);
  if (!profile) return ["Ingen profil hittad."];
  return [
    `Trial-krediter: ${profile.trial_credits}`,
    `Abonnemang: ${profile.subscription_status}`,
    `Analyser denna period: ${profile.monthly_analyses_used}`,
  ];
}

function handleTolls(): string[] {
  return [
    "Kända Bridge-tullsatser (statiska referensvärden — Fred-platform har",
    "ingen live-koppling till bridgecontrol-projektet azcbgxbkbxdmpgschhau):",
    "  HERDPRISM   4.1%",
    "  LEASEBRO    2.4%",
    "  DRAINCACHE  5.5%",
    "  STORMKROK   1.7%",
    "Säg till om du vill koppla en riktig service-role-läsning.",
  ];
}

function handleVacuumStatus(): string[] {
  return [
    "Vacuum 09-koppling: inte ansluten från Radar. keys_meta.vacuum_enabled",
    "lever i bridgecontrol-projektet, som Fred-platform inte har uppgifter",
    "till. (Notera separat: /core/vacuum visar just nu statiska exempeltal,",
    "inte en live-läsning — flaggat, inte fixat i det här skiftet.)",
  ];
}

function handleBridgeStop(): string[] {
  return [
    "Avstängd med avsikt: \"bridge stop\" skulle INSERT:a i kill_rules på",
    "bridgecontrol-projektet — en riktig produktions-killswitch. Radar 06",
    "är en publik sida utan inloggning just nu, så den kan inte trigga det",
    "utan en medveten beslut om auth/behörighet först.",
  ];
}

async function resolveLines(raw: string): Promise<string[]> {
  switch (raw) {
    case "":
      return [];
    case "help":
      return HELP;
    case "status":
      return handleStatus();
    case "beslut":
    case "decisions":
      return handleDecisions();
    case "saldo":
    case "credits":
    case "balance":
      return handleBalance();
    case "tolls":
      return handleTolls();
    case "vacuum status":
      return handleVacuumStatus();
    case "bridge stop":
      return handleBridgeStop();
    default:
      return [`Kommando okänt. Testa: help, status, saldo, decisions, tolls`];
  }
}

function streamLines(lines: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(JSON.stringify({ line }) + "\n"));
        // tiny yield so the client can paint progressively
        await new Promise((r) => setTimeout(r, 12));
      }
      controller.enqueue(encoder.encode(JSON.stringify({ done: true }) + "\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const raw = typeof body.message === "string" ? body.message.trim().toLowerCase() : "";
  const wantStream = body.stream !== false; // default stream

  try {
    const lines = await resolveLines(raw);
    if (wantStream) return streamLines(lines);
    return Response.json({ ok: true, lines });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Okänt fel";
    if (wantStream) return streamLines([`Fel: ${message}`]);
    return Response.json({ ok: false, lines: [`Fel: ${message}`] }, { status: 500 });
  }
}
