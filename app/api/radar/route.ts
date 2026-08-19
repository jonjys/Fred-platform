import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { listDecisionsForUser } from "@/lib/database/repositories/decisions";
import { getProfile } from "@/lib/database/repositories/profiles";
import { getCoreApps } from "@/lib/core-apps/registry";
import { isAppHealthy } from "@/lib/core-apps/health";

// Radar 06's command console. Talks to Fred-platform's own APIs only —
// no external LLM, no ANTHROPIC_API_KEY. That's deliberate: this page is
// public (CORE_REQUIRES_AUTH=false), and a public surface that calls out
// to a model with a system prompt describing our own security posture is
// a bigger attack surface than we want here.
//
// tolls / vacuum status / bridge stop are NOT wired to bridgecontrol
// (Promptslaktaren's separate Supabase project, azcbgxbkbxdmpgschhau).
// Fred-platform has no credentials for that project. "bridge stop" in
// particular would INSERT INTO kill_rules — a real production kill-switch
// — and this console has no auth gate, so it stays a stub until that's a
// deliberate, confirmed decision rather than a side effect of a command
// list.

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
  const withStatus = await Promise.all(apps.map(async (a) => ({ ...a, live: await isAppHealthy(a) })));
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
    ...decisions.map((d) => `  [${d.status}] ${d.module_key} — ${new Date(d.created_at).toLocaleDateString("sv-SE")}`),
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

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const raw = typeof body.message === "string" ? body.message.trim().toLowerCase() : "";

  try {
    switch (raw) {
      case "":
        return Response.json({ ok: true, lines: [] });
      case "help":
        return Response.json({ ok: true, lines: HELP });
      case "status":
        return Response.json({ ok: true, lines: await handleStatus() });
      case "beslut":
      case "decisions":
        return Response.json({ ok: true, lines: await handleDecisions() });
      case "saldo":
      case "credits":
      case "balance":
        return Response.json({ ok: true, lines: await handleBalance() });
      case "tolls":
        return Response.json({ ok: true, lines: handleTolls() });
      case "vacuum status":
        return Response.json({ ok: true, lines: handleVacuumStatus() });
      case "bridge stop":
        return Response.json({ ok: true, lines: handleBridgeStop() });
      default:
        return Response.json({
          ok: true,
          lines: [`Kommando okänt. Testa: help, saldo, decisions, tolls`],
        });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Okänt fel";
    return Response.json({ ok: false, lines: [`Fel: ${message}`] }, { status: 500 });
  }
}
