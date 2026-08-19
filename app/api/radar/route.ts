import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(40),
});

const SYSTEM = `You are FRED OS Radar (slot 06) — the main control-plane chat for Fred Platform.

Context you know:
- Slots 01–10: Architecture, Intake, Invoice, GateZero, Debt Lab, Radar, Bridge, Cast, Vacuum, Analyze.
- Design tokens: bg #0A0A0B, card #111114, border #222226, LIVE #3DFF8A, accent #7C5CFF.
- Bridge (07) = Promptslaktaren / BridgeControl — real toll % on API spend, not Vacuum.
- Vacuum (09) = dead-retry vacuum, 8400 live / 1600 dead sim, 5% take on saved.
- Auth is off for /core (CORE_REQUIRES_AUTH=false). Public shells only; data APIs still gated.
- Stack: Next.js + Supabase + Stripe + Vercel. Vibe-coder, no overbuild.

Style: concise, technical, Swedish or English matching the user. No fluff. Prefer short paragraphs and concrete next actions. You do not invent private credentials or claim data you cannot see.`;

function mockStream(userText: string): ReadableStream<Uint8Array> {
  const lower = userText.toLowerCase();
  let reply =
    "Radar 06 (fallback mode — ANTHROPIC_API_KEY saknas eller stream fail). " +
    "Slots 01 Architecture · 02 Intake · 03 Invoice · 04 GateZero · 05 Debt Lab · " +
    "06 Radar · 07 Bridge · 08 Cast · 09 Vacuum · 10 Analyze. Fråga mer specifikt när AI-nyckeln är live.";

  if (lower.includes("vacuum") || lower.includes("09")) {
    reply =
      "Vacuum 09: 8 400 live / 1 600 dead på 10k gpu-sim. Auto-vacuum ON via keys_meta.vacuum_enabled. Take 5% på sparat (vacuum_log). Inte samma sak som Bridge — Vacuum dammsuger dead retries, Bridge tar % av real spend.";
  } else if (lower.includes("bridge") || lower.includes("07")) {
    reply =
      "Bridge 07 (Promptslaktaren): production control plane. Tolls i bridge_tolls (HERDPRISM, LEASEBRO, …). spend_ledger + usage_events loggar faktisk trafik. RLS service_role + public_read_tolls rekommenderas.";
  } else if (lower.includes("gate") || lower.includes("04")) {
    reply =
      "GateZero 04: zero-trust gateway-slot under /core/gatezero (iframe embed). Secrets stannar client-side i FRED-filosofin — ingen backend-överbyggnad.";
  } else if (lower.includes("status") || lower.includes("live")) {
    reply =
      "LIVE-yta: /core public (CORE_REQUIRES_AUTH=false). Radar 06 är main chat. Data-lager (/api/intake, invoice-proxy) returnerar fortfarande 401 utan session. Analyze 10 är medvetet gated.";
  }

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for (const word of reply.split(/(\s+)/)) {
        controller.enqueue(encoder.encode(word));
        await new Promise((r) => setTimeout(r, 12));
      }
      controller.close();
    },
  });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response("Invalid body", { status: 400 });
  }

  const { messages } = parsed.data;
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(mockStream(lastUser), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Radar-Mode": "fallback",
      },
    });
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

    const stream = await anthropic.messages.stream({
      model,
      max_tokens: 1200,
      system: SYSTEM,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta" &&
              event.delta.text
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "stream error";
          controller.enqueue(encoder.encode(`\n[radar stream error] ${msg}`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Radar-Mode": "anthropic",
      },
    });
  } catch (err) {
    console.error("[radar] anthropic failed, falling back", err);
    return new Response(mockStream(lastUser), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Radar-Mode": "fallback-error",
      },
    });
  }
}
