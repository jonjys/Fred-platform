import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { handleTunnelClip } from "@/lib/fred/modules/tunnelclip";
import { handleBankIDShield } from "@/lib/fred/modules/bankidshield";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const sharedContent = `${body.title ?? ""} ${body.text ?? ""} ${body.url ?? ""}`.trim();

  if (!sharedContent) {
    return Response.json({ ok: false, error: "Inget innehåll att tolka." }, { status: 400 });
  }

  try {
    if (
      sharedContent.includes("youtube.com") ||
      sharedContent.includes("youtu.be")
    ) {
      const atom = await handleTunnelClip(sharedContent);
      return Response.json({ ok: true, module: "TunnelClip", atom });
    }

    if (sharedContent.match(/swish|kr|ocr|bankid/i)) {
      const atom = await handleBankIDShield(sharedContent);
      return Response.json({ ok: true, module: "BankIDShield", atom });
    }

    return Response.json(
      { ok: false, error: "Ingen Fred-modul kände igen detta. Kopiera texten istället." },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Okänt fel";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
